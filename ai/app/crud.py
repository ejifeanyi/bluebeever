from sqlalchemy.orm import Session
from sqlalchemy import func, text, or_
from typing import List, Optional, Tuple
from .models import Category
import json
import logging

logger = logging.getLogger(__name__)

def create_category(db: Session, name: str, description: str = None, 
                   embedding: List[float] = None, sample_content: str = None) -> Category:
    """Create a new category with proper error handling"""
    try:
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
        logger.info(f"Created new category: {name}")
        return db_category
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create category {name}: {e}")
        raise

def get_category_by_id(db: Session, category_id: int) -> Optional[Category]:
    """Get a category by ID"""
    return db.query(Category).filter(Category.id == category_id).first()

def get_category_by_name(db: Session, name: str) -> Optional[Category]:
    """Get a category by name (case-insensitive)"""
    return db.query(Category).filter(func.lower(Category.name) == func.lower(name)).first()

def get_categories(db: Session, skip: int = 0, limit: int = 100) -> List[Category]:
    """Get all categories with pagination"""
    return db.query(Category).offset(skip).limit(limit).all()

def get_categories_count(db: Session) -> int:
    """Get total count of categories - FIXED VERSION"""
    try:
        # Use a more explicit count query
        count = db.query(func.count(Category.id)).scalar()
        return count or 0
    except Exception as e:
        logger.error(f"Error getting categories count: {e}")
        # Fallback to len() if count fails
        try:
            return len(db.query(Category).all())
        except Exception as fallback_error:
            logger.error(f"Fallback count also failed: {fallback_error}")
            return 0

def update_category_email_count(db: Session, category_id: int, increment: int = 1) -> Optional[Category]:
    """Update email count for a category with transaction safety"""
    try:
        category = db.query(Category).filter(Category.id == category_id).first()
        if category:
            category.email_count += increment
            db.commit()
            db.refresh(category)
            return category
        return None
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update email count for category {category_id}: {e}")
        raise

def bulk_update_category_counts(db: Session, category_updates: List[Tuple[int, int]]) -> bool:
    """Bulk update category email counts for better performance"""
    try:
        for category_id, increment in category_updates:
            db.execute(
                text("UPDATE categories SET email_count = email_count + :increment WHERE id = :id"),
                {"increment": increment, "id": category_id}
            )
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk update failed: {e}")
        return False

def get_categories_with_stats(db: Session, limit: int = 10) -> List[Category]:
    """Get categories ordered by email count with statistics"""
    return db.query(Category).order_by(Category.email_count.desc()).limit(limit).all()

def search_categories_by_content(db: Session, search_term: str, limit: int = 10) -> List[Category]:
    """Search categories by name or description"""
    search_pattern = f"%{search_term}%"
    return db.query(Category).filter(
        or_(
            Category.name.ilike(search_pattern),
            Category.description.ilike(search_pattern)  
        )
    ).limit(limit).all()

def find_similar_categories_enhanced(
    db: Session, 
    embedding: List[float], 
    threshold: float = None,
    limit: int = 5
) -> List[Tuple[Category, float]]:
    """Enhanced similarity search using VectorStore"""
    from .vector_store import VectorStore
    vector_store = VectorStore(db)
    return vector_store.find_similar_categories(embedding, threshold, limit)

def cleanup_unused_categories(db: Session, min_email_count: int = 1) -> int:
    """Clean up categories with very few emails (maintenance function)"""
    try:
        result = db.query(Category).filter(Category.email_count < min_email_count).delete()
        db.commit()
        logger.info(f"Cleaned up {result} unused categories")
        return result
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to cleanup categories: {e}")
        return 0

def get_or_create_category(db: Session, name: str, description: str = None, 
                          embedding: List[float] = None) -> Tuple[Category, bool]:
    """Get existing category or create new one. Returns (category, created)"""
    try:
        # Try to get existing category
        existing_category = get_category_by_name(db, name)
        if existing_category:
            return existing_category, False
        
        # Create new category if it doesn't exist
        new_category = create_category(
            db=db, 
            name=name, 
            description=description, 
            embedding=embedding
        )
        return new_category, True
        
    except Exception as e:
        logger.error(f"Error in get_or_create_category for {name}: {e}")
        raise

def update_category_embedding(db: Session, category_id: int, embedding: List[float]) -> Optional[Category]:
    """Update the embedding for a specific category"""
    try:
        category = db.query(Category).filter(Category.id == category_id).first()
        if category:
            category.embedding = embedding
            db.commit()
            db.refresh(category)
            logger.info(f"Updated embedding for category {category.name}")
            return category
        return None
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update embedding for category {category_id}: {e}")
        raise

def get_categories_without_embeddings(db: Session, limit: int = 100) -> List[Category]:
    """Get categories that don't have embeddings yet"""
    return db.query(Category).filter(
        or_(
            Category.embedding.is_(None),
            Category.embedding == []
        )
    ).limit(limit).all()

# Add database health check function
def check_database_health(db: Session) -> bool:
    """Check if database is accessible and tables exist"""
    try:
        # Simple query to check if categories table exists and is accessible
        db.execute(text("SELECT 1 FROM categories LIMIT 1"))
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False