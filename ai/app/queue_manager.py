import pika
import json
import logging
import threading
import time
from typing import Dict, Optional, Callable
from datetime import datetime, timedelta
import uuid
from dataclasses import dataclass
from enum import Enum
from .config import settings

logger = logging.getLogger(__name__)

class TaskStatus(Enum):
    QUEUED = "queued"
    PROCESSING = "processing" 
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class TaskResult:
    task_id: str
    status: TaskStatus
    result: Optional[Dict] = None
    error: Optional[str] = None
    created_at: datetime = None
    completed_at: Optional[datetime] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()

class RabbitMQManager:
    
    def __init__(self, rabbitmq_url: str = "amqp://localhost:5672"):
        self.rabbitmq_url = rabbitmq_url
        self.connection = None
        self.channel = None
        self.task_results: Dict[str, TaskResult] = {}
        self.worker_thread = None
        self.is_running = False
        self.processor_callback = None
        self.queue_name = "email_processing"
        self.result_queue = "category_results"
        self.result_cache_ttl = getattr(settings, 'result_cache_ttl', 7200)
        self.worker_prefetch_count = getattr(settings, 'worker_prefetch_count', 10)
        # Metrics
        self.cache_hits = 0
        self.cache_misses = 0
        self.batches_processed = 0
        self.total_batch_size = 0
        self._result_cache: Dict[str, Dict] = {}  # In-memory fallback for fast lookup
        self._result_cache_expiry: Dict[str, float] = {}
        
    def connect(self):
        try:
            self.connection = pika.BlockingConnection(
                pika.URLParameters(self.rabbitmq_url)
            )
            self.channel = self.connection.channel()
            
            # Declare queue with durability
            self.channel.queue_declare(
                queue=self.queue_name, 
                durable=True
            )
            
            logger.info("Connected to RabbitMQ")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            return False
    
    def disconnect(self):
        """Close RabbitMQ connection"""
        if self.connection and not self.connection.is_closed:
            self.connection.close()
            logger.info("Disconnected from RabbitMQ")
    
    def queue_task(self, task_data: Dict, task_type: str = "email") -> str:
        """Queue a task for processing"""
        task_id = str(uuid.uuid4())
        
        message = {
            "task_id": task_id,
            "task_type": task_type,
            "data": task_data,
            "queued_at": datetime.now().isoformat()
        }
        
        try:
            if not self.channel:
                self.connect()
                
            self.channel.basic_publish(
                exchange='',
                routing_key=self.queue_name,
                body=json.dumps(message),
                properties=pika.BasicProperties(
                    delivery_mode=2, 
                )
            )
            
            # Store task status
            self.task_results[task_id] = TaskResult(
                task_id=task_id,
                status=TaskStatus.QUEUED
            )
            
            logger.info(f"Queued task {task_id}")
            return task_id
            
        except Exception as e:
            logger.error(f"Failed to queue task: {e}")
            raise
    
    def get_task_status(self, task_id: str) -> Optional[TaskResult]:
        """Get task status and result"""
        return self.task_results.get(task_id)
    
    def set_processor(self, callback: Callable):
        """Set the callback function to process tasks"""
        self.processor_callback = callback
    
    def start_worker(self):
        """Start the worker thread"""
        if self.worker_thread and self.worker_thread.is_alive():
            logger.warning("Worker already running")
            return
            
        self.is_running = True
        self.worker_thread = threading.Thread(target=self._worker_loop)
        self.worker_thread.daemon = True
        self.worker_thread.start()
        logger.info("Started worker thread")
    
    def stop_worker(self):
        """Stop the worker thread"""
        self.is_running = False
        if self.worker_thread:
            self.worker_thread.join(timeout=5)
        logger.info("Stopped worker thread")
    
    def _worker_loop(self):
        """Main worker loop"""
        while self.is_running:
            try:
                if not self.connection or self.connection.is_closed:
                    if not self.connect():
                        time.sleep(5)  # Wait before retry
                        continue
                
                # Set up consumer
                self.channel.basic_qos(prefetch_count=self.worker_prefetch_count)  # Process one at a time
                self.channel.basic_consume(
                    queue=self.queue_name,
                    on_message_callback=self._process_message
                )
                
                # Start consuming (blocks until connection closes)
                self.channel.start_consuming()
                
            except Exception as e:
                logger.error(f"Worker error: {e}")
                time.sleep(5)  # Wait before retry
    
    def _process_message(self, ch, method, properties, body):
        """Process a single message"""
        try:
            message = json.loads(body.decode())
            task_id = message["task_id"]
            task_data = message["data"]
            
            logger.info(f"Processing task {task_id}")
            
            # Update status
            if task_id in self.task_results:
                self.task_results[task_id].status = TaskStatus.PROCESSING
            
            # Process the task
            if self.processor_callback:
                result = self.processor_callback(task_data, message.get("task_type", "email"))
                
                # Update with result
                if task_id in self.task_results:
                    self.task_results[task_id].status = TaskStatus.COMPLETED
                    self.task_results[task_id].result = result
                    self.task_results[task_id].completed_at = datetime.now()
                
                logger.info(f"Completed task {task_id}")
            else:
                logger.error("No processor callback set")
                raise Exception("No processor callback")
            
            # Acknowledge message
            ch.basic_ack(delivery_tag=method.delivery_tag)
            
        except Exception as e:
            logger.error(f"Failed to process message: {e}")
            
            # Update task status
            task_id = json.loads(body.decode()).get("task_id")
            if task_id and task_id in self.task_results:
                self.task_results[task_id].status = TaskStatus.FAILED
                self.task_results[task_id].error = str(e)
                self.task_results[task_id].completed_at = datetime.now()
            
            # Reject message (won't be requeued)
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
    
    def get_queue_stats(self) -> Dict:
        """Get queue statistics"""
        try:
            if not self.channel:
                self.connect()
                
            method = self.channel.queue_declare(
                queue=self.queue_name, 
                durable=True, 
                passive=True
            )
            
            return {
                "queue_name": self.queue_name,
                "messages_ready": method.method.message_count,
                "consumers": method.method.consumer_count,
                "task_results_count": len(self.task_results),
                "worker_running": self.is_running
            }
        except Exception as e:
            logger.error(f"Failed to get queue stats: {e}")
            return {"error": str(e)}
    
    def clear_completed_tasks(self) -> int:
        """Clear completed task results from memory"""
        completed_tasks = [
            task_id for task_id, task in self.task_results.items()
            if task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED]
        ]
        
        for task_id in completed_tasks:
            del self.task_results[task_id]
        
        return len(completed_tasks)

    def cache_result(self, key: str, result: Dict):
        """Cache a categorization result in RabbitMQ and in-memory fallback."""
        message = {
            "key": key,
            "result": result,
            "cached_at": datetime.now().isoformat(),
            "ttl": self.result_cache_ttl
        }
        try:
            if not self.channel:
                self.connect()
            # Publish to result queue
            self.channel.queue_declare(queue=self.result_queue, durable=True, arguments={"x-message-ttl": self.result_cache_ttl * 1000})
            self.channel.basic_publish(
                exchange='',
                routing_key=self.result_queue,
                body=json.dumps(message),
                properties=pika.BasicProperties(delivery_mode=2)
            )
            # In-memory fallback
            self._result_cache[key] = result
            self._result_cache_expiry[key] = time.time() + self.result_cache_ttl
            logger.info(f"Cached result for key {key}")
        except Exception as e:
            logger.error(f"Failed to cache result: {e}")

    def get_cached_result(self, key: str) -> Optional[Dict]:
        """Retrieve a cached categorization result by key (email ID or content hash)."""
        now = time.time()
        if key in self._result_cache and self._result_cache_expiry.get(key, 0) > now:
            self.cache_hits += 1
            logger.info(f"Cache hit (memory) for key {key}")
            return self._result_cache[key]
        try:
            if not self.channel:
                self.connect()
            self.channel.queue_declare(queue=self.result_queue, durable=True, arguments={"x-message-ttl": self.result_cache_ttl * 1000})
            method_frame, header_frame, body = self.channel.basic_get(self.result_queue, auto_ack=False)
            found = None
            while method_frame:
                msg = json.loads(body.decode())
                msg_key = msg.get("key")
                if msg_key == key:
                    found = msg["result"]
                    self._result_cache[key] = found
                    self._result_cache_expiry[key] = now + self.result_cache_ttl
                    self.channel.basic_ack(method_frame.delivery_tag)
                    self.cache_hits += 1
                    logger.info(f"Cache hit (RabbitMQ) for key {key}")
                    break
                else:
                    self.channel.basic_nack(method_frame.delivery_tag, requeue=True)
                method_frame, header_frame, body = self.channel.basic_get(self.result_queue, auto_ack=False)
            if found:
                return found
            self.cache_misses += 1
            logger.info(f"Cache miss for key {key}")
            return None
        except Exception as e:
            logger.error(f"Failed to get cached result: {e}")
            self.cache_misses += 1
            return None

    def record_batch(self, batch_size: int):
        self.batches_processed += 1
        self.total_batch_size += batch_size
        logger.info(f"Processed batch of size {batch_size}")

    def get_metrics(self):
        avg_batch_size = self.total_batch_size / self.batches_processed if self.batches_processed else 0
        return {
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "batches_processed": self.batches_processed,
            "avg_batch_size": avg_batch_size
        }

    def cleanup_result_cache(self):
        """Clean up expired in-memory cache entries."""
        now = time.time()
        expired_keys = [k for k, exp in self._result_cache_expiry.items() if exp < now]
        for k in expired_keys:
            del self._result_cache[k]
            del self._result_cache_expiry[k]

# Global queue manager instance
queue_manager = RabbitMQManager()

def initialize_queue(rabbitmq_url: str = None):
    """Initialize the queue manager"""
    global queue_manager
    if rabbitmq_url:
        queue_manager = RabbitMQManager(rabbitmq_url)
    return queue_manager