from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

# Import your modules
from .database import engine, get_db
from .models import Base, Category
from .schemas import (
    StandaloneEmailRequest, ThreadedEmailRequest, CategorizationResponse,
    CategorySchema, CategoriesListResponse, HealthCheckResponse, ErrorResponse
)
from .service import categorization_service
from . import crud

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="Email Categorization API",
    description="AI-powered email categorization microservice",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health", response_model=HealthCheckResponse)
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    try:
        categories_count = crud.get_categories_count(db)
        return HealthCheckResponse(
            status="healthy",
            timestamp=datetime.now(),
            categories_count=categories_count
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service unhealthy: {str(e)}"
        )

# Main categorization endpoints
@app.post("/categorize/standalone", response_model=CategorizationResponse)
async def categorize_standalone_email(
    request: StandaloneEmailRequest,
    db: Session = Depends(get_db)
):
    """Categorize a standalone email"""
    try:
        result = categorization_service.categorize_standalone_email(db, request)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Categorization failed: {str(e)}"
        )

@app.post("/categorize/threaded", response_model=CategorizationResponse)
async def categorize_threaded_email(
    request: ThreadedEmailRequest,
    db: Session = Depends(get_db)
):
    """Categorize an email that's part of a thread"""
    try:
        result = categorization_service.categorize_threaded_email(db, request)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Categorization failed: {str(e)}"
        )

# Category management endpoints
@app.get("/categories", response_model=CategoriesListResponse)
async def get_categories(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all categories with pagination"""
    categories = crud.get_categories(db, skip=skip, limit=limit)
    total_count = crud.get_categories_count(db)
    
    category_schemas = [
        CategorySchema(
            id=cat.id,
            name=cat.name,
            description=cat.description,
            email_count=cat.email_count,
            created_at=cat.created_at,
            sample_content=cat.sample_content
        ) for cat in categories
    ]
    
    return CategoriesListResponse(
        categories=category_schemas,
        total_count=total_count
    )

@app.get("/categories/{category_id}", response_model=CategorySchema)
async def get_category(category_id: int, db: Session = Depends(get_db)):
    """Get a specific category by ID"""
    category = crud.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    return CategorySchema(
        id=category.id,
        name=category.name,
        description=category.description,
        email_count=category.email_count,
        created_at=category.created_at,
        sample_content=category.sample_content
    )

@app.get("/categories/search/{search_term}", response_model=List[CategorySchema])
async def search_categories(search_term: str, db: Session = Depends(get_db)):
    """Search categories by name"""
    categories = crud.search_categories_by_name(db, search_term)
    
    return [
        CategorySchema(
            id=cat.id,
            name=cat.name,
            description=cat.description,
            email_count=cat.email_count,
            created_at=cat.created_at,
            sample_content=cat.sample_content
        ) for cat in categories
    ]

@app.get("/categories/stats/most-used", response_model=List[CategorySchema])
async def get_most_used_categories(limit: int = 10, db: Session = Depends(get_db)):
    """Get categories with the highest email counts"""
    categories = crud.get_most_used_categories(db, limit=limit)
    
    return [
        CategorySchema(
            id=cat.id,
            name=cat.name,
            description=cat.description,
            email_count=cat.email_count,
            created_at=cat.created_at,
            sample_content=cat.sample_content
        ) for cat in categories
    ]

@app.get("/categories/stats/recent", response_model=List[CategorySchema])
async def get_recent_categories(limit: int = 10, db: Session = Depends(get_db)):
    """Get most recently created categories"""
    categories = crud.get_recent_categories(db, limit=limit)
    
    return [
        CategorySchema(
            id=cat.id,
            name=cat.name,
            description=cat.description,
            email_count=cat.email_count,
            created_at=cat.created_at,
            sample_content=cat.sample_content
        ) for cat in categories
    ]

@app.delete("/categories/{category_id}")
async def delete_category(category_id: int, db: Session = Depends(get_db)):
    """Delete a category"""
    success = crud.delete_category(db, category_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    return {"message": "Category deleted successfully"}

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Email Categorization API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "categorize_standalone": "/categorize/standalone",
            "categorize_threaded": "/categorize/threaded",
            "categories": "/categories",
            "docs": "/docs"
        }
    }

# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return ErrorResponse(
        error=exc.detail,
        timestamp=datetime.now()
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return ErrorResponse(
        error="Internal server error",
        timestamp=datetime.now()
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)