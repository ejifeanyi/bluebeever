from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import logging
from datetime import datetime
from typing import List, Dict, Optional
from pydantic import BaseModel, Field
import os
from .database import get_db, Base, engine, SessionLocal
from .schemas import (
    StandaloneEmailRequest, ThreadedEmailRequest, CategorizationResponse,
    CategoryResponse
)
from .service import categorization_service, EmailCategorizationService
from .crud import get_categories, get_categories_count
from .config import settings
from .queue_manager import queue_manager, initialize_queue
from contextlib import asynccontextmanager
import hashlib

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Email Categorization API",
    description="AI-powered email categorization system with RabbitMQ",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CategoriesListResponse(BaseModel):
    categories: List[CategoryResponse] = Field(..., description="List of categories")
    total_count: int = Field(..., description="Total number of categories")

class HealthCheckResponse(BaseModel):
    status: str = Field(..., description="Service status")
    timestamp: datetime = Field(..., description="Health check timestamp")
    categories_count: int = Field(..., description="Number of categories in database")
    queue_stats: Dict = Field(..., description="Queue statistics")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[Dict] = None
    error: Optional[str] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class BulkEmailRequest(BaseModel):
    emails: List[StandaloneEmailRequest] = Field(..., description="List of emails to process")
    user_id: str = Field(..., description="User ID for all emails")

class BulkProcessResponse(BaseModel):
    task_ids: List[str] = Field(..., description="List of task IDs")
    queued_count: int = Field(..., description="Number of emails queued")

def process_email_task(task_data: Dict, task_type: str = "email") -> Dict:
    """Process email categorization task"""
    db = SessionLocal()
    try:
        if task_type == "threaded":
            request = ThreadedEmailRequest(**task_data)
            result = categorization_service.categorize_threaded_email(db, request)
        else:
            request = StandaloneEmailRequest(**task_data)
            result = categorization_service.categorize_standalone_email(db, request)
        
        return result.dict()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        from .database import test_database_connection, create_tables
        if not test_database_connection():
            logger.error("Database connection failed on startup")
            yield
            return
        
        if not create_tables():
            logger.error("Failed to create database tables")
            yield
            return
        
        rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://localhost:5672")
        initialize_queue(rabbitmq_url)
        queue_manager.set_processor(process_email_task)
        queue_manager.start_worker()

        logger.info("Email categorization service started successfully")
    except Exception as e:
        logger.error(f"Failed to start service: {e}")

    yield

    try:
        queue_manager.stop_worker()
        queue_manager.disconnect()
        logger.info("Email categorization service stopped")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

app = FastAPI(
    title="Email Categorization API",
    description="AI-powered email categorization system with RabbitMQ",
    version="2.0.0",
    lifespan=lifespan
)

@app.post("/categorize/standalone", response_model=CategorizationResponse)
async def categorize_standalone_email(
    request: StandaloneEmailRequest,
    use_async: bool = False,
    db: Session = Depends(get_db)
):
    """
    Categorize a standalone email
    
    - use_async=True: Queues for background processing
    - use_async=False: Processes synchronously
    """
    try:
        email_id = request.email_id
        content_hash = hashlib.sha256((request.subject or "" + request.body or "").encode()).hexdigest()
        cached = queue_manager.get_cached_result(email_id)
        if cached:
            logger.info(f"Cache hit for email_id {email_id}")
            return CategorizationResponse(**cached)
        cached_hash = queue_manager.get_cached_result(content_hash)
        if cached_hash:
            logger.info(f"Cache hit for content hash {content_hash}")
            return CategorizationResponse(**cached_hash)
        if use_async:
            task_id = queue_manager.queue_task(request.dict(), "standalone")
            
            return CategorizationResponse(
                email_id=request.email_id,
                user_id=request.user_id,
                assigned_category="Processing...",
                confidence_score=0.0,
                is_new_category=False,
                processing_timestamp=datetime.now(),
                category_description=f"Queued for processing. Task ID: {task_id}"
            )
        else:
            response = categorization_service.categorize_standalone_email(db, request)
            queue_manager.cache_result(email_id, response.dict())
            queue_manager.cache_result(content_hash, response.dict())
            return response
            
    except Exception as e:
        logger.error(f"Error processing standalone email: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/categorize/threaded", response_model=CategorizationResponse)
async def categorize_threaded_email(
    request: ThreadedEmailRequest,
    use_async: bool = False,
    db: Session = Depends(get_db)
):
    """Categorize a threaded email with context awareness"""
    try:
        if use_async:
            task_id = queue_manager.queue_task(request.dict(), "threaded")
            
            return CategorizationResponse(
                email_id=request.email_id,
                user_id=request.user_id,
                assigned_category="Processing...",
                confidence_score=0.0,
                is_new_category=False,
                processing_timestamp=datetime.now(),
                category_description=f"Queued for processing. Task ID: {task_id}"
            )
        else:
            return categorization_service.categorize_threaded_email(db, request)
            
    except Exception as e:
        logger.error(f"Error processing threaded email: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/categorize/bulk", response_model=BulkProcessResponse)
async def categorize_bulk_emails(request: BulkEmailRequest, db: Session = Depends(get_db)):
    try:
        import time
        start_time = time.time()
        task_ids = []
        results = []
        uncached_requests = []
        uncached_indices = []
        for idx, email in enumerate(request.emails):
            email_id = email.email_id
            content_hash = hashlib.sha256((email.subject or "" + email.body or "").encode()).hexdigest()
            cached = queue_manager.get_cached_result(email_id) or queue_manager.get_cached_result(content_hash)
            if cached:
                logger.info(f"Bulk cache hit for email {email_id}")
                results.append(cached)
            else:
                uncached_requests.append(email)
                uncached_indices.append(idx)
                results.append(None)  # Placeholder
        for i, email in enumerate(uncached_requests):
            response = categorization_service.categorize_standalone_email(db, email)
            queue_manager.cache_result(email.email_id, response.dict())
            content_hash = hashlib.sha256((email.subject or "" + email.body or "").encode()).hexdigest()
            queue_manager.cache_result(content_hash, response.dict())
            results[uncached_indices[i]] = response.dict()
        queue_manager.record_batch(len(request.emails))
        elapsed = time.time() - start_time
        logger.info(f"Processed bulk batch of {len(request.emails)} emails in {elapsed:.2f}s")
        return {"task_ids": [], "queued_count": len(request.emails), "results": results}
    except Exception as e:
        logger.error(f"Error processing bulk emails: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/task/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """Get status of background categorization task"""
    try:
        task_result = queue_manager.get_task_status(task_id)
        
        if not task_result:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return TaskStatusResponse(
            task_id=task_result.task_id,
            status=task_result.status.value,
            result=task_result.result,
            error=task_result.error,
            created_at=task_result.created_at,
            completed_at=task_result.completed_at
        )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking task status: {e}")

@app.get("/categories", response_model=CategoriesListResponse)
async def list_categories(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """List all categories with pagination"""
    categories = get_categories(db, skip=skip, limit=limit)
    total_count = get_categories_count(db)
    
    return CategoriesListResponse(categories=categories, total_count=total_count)

@app.get("/health", response_model=HealthCheckResponse)
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint with better error handling"""
    try:
        from .crud import check_database_health
        if not check_database_health(db):
            raise HTTPException(status_code=503, detail="Database connection failed")
        
        try:
            categories_count = get_categories_count(db)
        except Exception as e:
            logger.error(f"Error getting categories count: {e}")
            categories_count = -1  # Indicate error but don't fail entirely
        
        try:
            queue_stats = queue_manager.get_queue_stats()
        except Exception as e:
            logger.error(f"Error getting queue stats: {e}")
            queue_stats = {"error": "Queue stats unavailable"}
        
        return HealthCheckResponse(
            status="healthy" if categories_count >= 0 else "degraded",
            timestamp=datetime.now(),
            categories_count=max(0, categories_count),  # Don't return negative counts
            queue_stats=queue_stats
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

@app.get("/health/simple")
async def simple_health_check():
    """Simple health check that doesn't require database"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "email-categorization-api",
        "version": "2.0.0"
    }

@app.post("/admin/clear-cache")
async def clear_embedding_cache():
    """Clear the embedding cache"""
    try:
        from .service import embedding_cache
        embedding_cache.clear()
        return {"message": "Cache cleared successfully"}
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        return {"message": f"Cache clearing failed: {str(e)}"}

@app.get("/admin/cache-stats")
async def get_cache_stats():
    """Get cache statistics"""
    try:
        from .service import embedding_cache
        return {
            "cache_size": len(embedding_cache),
            "max_size": embedding_cache.maxsize,
            "ttl": embedding_cache.ttl,
            "queue_stats": queue_manager.get_queue_stats()
        }
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        return {"message": f"Cache stats retrieval failed: {str(e)}"}

@app.delete("/admin/tasks")
async def clear_completed_tasks():
    """Clear completed tasks from memory"""
    try:
        cleared_count = queue_manager.clear_completed_tasks()
        return {"message": f"Cleared {cleared_count} completed tasks"}
    except Exception as e:
        logger.error(f"Error clearing tasks: {e}")
        return {"message": f"Task clearing failed: {str(e)}"}

@app.get("/admin/queue-stats")
async def get_queue_stats():
    """Get detailed queue statistics"""
    try:
        return queue_manager.get_queue_stats()
    except Exception as e:
        logger.error(f"Error getting queue stats: {e}")
        return {"error": str(e)}

@app.get("/admin/system-info")
async def get_system_info():
    """Get system information"""
    return {
        "queue_system": "RabbitMQ",
        "database_url": settings.database_url,
        "model": settings.sentence_transformer_model,
        "thresholds": {
            "category_match": settings.category_match_threshold,
            "thread_consistency": settings.thread_consistency_threshold
        },
        "queue_stats": queue_manager.get_queue_stats()
    }

@app.get("/metrics")
async def metrics():
    """Expose cache and batch metrics for monitoring"""
    return queue_manager.get_metrics()

@app.get("/admin/canonicals")
async def list_canonicals():
    """List all canonical categories and their keywords"""
    return EmailCategorizationService.list_canonicals()

@app.post("/admin/canonicals")
async def add_canonical(name: str = Body(...), keywords: list = Body(...)):
    """Add a new canonical category with keywords"""
    EmailCategorizationService.add_canonical(name, keywords)
    return {"message": f"Canonical '{name}' added.", "canonicals": EmailCategorizationService.list_canonicals()}

@app.delete("/admin/canonicals/{name}")
async def remove_canonical(name: str):
    """Remove a canonical category"""
    EmailCategorizationService.remove_canonical(name)
    return {"message": f"Canonical '{name}' removed.", "canonicals": EmailCategorizationService.list_canonicals()}

@app.put("/admin/canonicals/{name}/keywords")
async def update_keywords(name: str, keywords: list = Body(...)):
    """Update keywords for a canonical category"""
    EmailCategorizationService.update_keywords(name, keywords)
    return {"message": f"Keywords for '{name}' updated.", "canonicals": EmailCategorizationService.list_canonicals()}