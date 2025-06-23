import pika
import json
import logging
import threading
import time
from typing import Dict, Optional, Callable
from datetime import datetime
import uuid
from dataclasses import dataclass
from enum import Enum

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
                self.channel.basic_qos(prefetch_count=1)  # Process one at a time
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

# Global queue manager instance
queue_manager = RabbitMQManager()

def initialize_queue(rabbitmq_url: str = None):
    """Initialize the queue manager"""
    global queue_manager
    if rabbitmq_url:
        queue_manager = RabbitMQManager(rabbitmq_url)
    return queue_manager