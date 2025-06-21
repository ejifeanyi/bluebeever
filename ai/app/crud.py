from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from .models import Category
from .schemas import CategorySchema
import json

def create_category(db: Session, name: str, description: str = None, 
                   embedding: List[float] = None, sample_content: str = None) -> Category:
    """Create a new category"""
    db_category = Category(
        name=name,
        description=description,
        embedding=embedding or [],
        sample_content=sample_content,
        email_count=0
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

def get_category_by_id(db: Session, category_id: int) -> Optional[Category]:
    """Get a category by ID"""
    return db.query(Category).filter(Category.id == category_id).first()

def get_category_by_name(db: Session, name: str) -> Optional[Category]:
    """Get a category by name"""
    return db.query(Category).filter(Category.name == name).first()

def get_categories(db: Session, skip: int = 0, limit: int = 100) -> List[Category]:
    """Get all categories with pagination"""
    return db.query(Category).offset(skip).limit(limit).all()

def get_categories_count(db: Session) -> int:
    """Get total count of categories"""
    return db.query(Category).count()

def update_category_email_count(db: Session, category_id: int, increment: int = 1) -> Optional[Category]:
    """Update email count for a category"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if category:
        category.email_count += increment
        db.commit()
        db.refresh(category)
    return category

def update_category(db: Session, category_id: int, **kwargs) -> Optional[Category]:
    """Update category fields"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if category:
        for key, value in kwargs.items():
            if hasattr(category, key):
                setattr(category, key, value)
        db.commit()
        db.refresh(category)
    return category

def delete_category(db: Session, category_id: int) -> bool:
    """Delete a category"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if category:
        db.delete(category)
        db.commit()
        return True
    return False

def search_categories_by_name(db: Session, search_term: str) -> List[Category]:
    """Search categories by name (case-insensitive)"""
    return db.query(Category).filter(
        Category.name.ilike(f"%{search_term}%")
    ).all()

def get_most_used_categories(db: Session, limit: int = 10) -> List[Category]:
    """Get categories with highest email counts"""
    return db.query(Category).order_by(Category.email_count.desc()).limit(limit).all()

def get_recent_categories(db: Session, limit: int = 10) -> List[Category]:
    """Get most recently created categories"""
    return db.query(Category).order_by(Category.created_at.desc()).limit(limit).all()

def find_similar_categories(db: Session, embedding: List[float], limit: int = 5) -> List[Category]:
    """
    Find categories with similar embeddings.
    This is a simple implementation. In production, you'd want to use 
    a proper vector similarity search with tools like pgvector or Pinecone.
    """
    # For now, just return all categories - you can implement proper similarity later
    return db.query(Category).limit(limit).all()

def category_exists(db: Session, name: str) -> bool:
    """Check if a category with the given name exists"""
    return db.query(Category).filter(Category.name == name).first() is not None