import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Tuple, TYPE_CHECKING
from .config import settings
from sqlalchemy.orm import Session
from .database import check_vector_extension
from .models import Category
import logging

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

class VectorStore:
    """Handles vector similarity operations"""
    
    def __init__(self, db: Session):
        self.db = db
        self.use_pgvector = check_vector_extension(db)
    
    def find_similar_categories(
        self, 
        query_embedding: List[float], 
        threshold: float = None,
        limit: int = 5
    ) -> List[Tuple[Category, float]]:
        """Find categories similar to query embedding"""
        threshold = threshold or settings.category_match_threshold
        
        if self.use_pgvector:
            return self._find_similar_with_pgvector(query_embedding, threshold, limit)
        else:
            return self._find_similar_in_memory(query_embedding, threshold, limit)
    
    def _find_similar_with_pgvector(
        self, 
        query_embedding: List[float], 
        threshold: float, 
        limit: int
    ) -> List[Tuple[Category, float]]:
        """Use pgvector for similarity search (PostgreSQL only)"""

        try:
            from sqlalchemy import text

            query = text("""
                SELECT c.*, (c.embedding <-> :query_vector::vector) as distance 
                FROM categories c
                WHERE (c.embedding <-> :query_vector::vector) < :threshold
                ORDER BY distance 
                LIMIT :limit
            """)
            
            vector_str = f"[{','.join(map(str, query_embedding))}]"
            
            result = self.db.execute(query, {
                'query_vector': vector_str,
                'threshold': 1 - threshold, 
                'limit': limit
            })
            
            categories_with_scores = []
            for row in result:

                category = self.db.query(Category).filter(Category.id == row.id).first()
                if category:
                    similarity = 1 - row.distance
                    categories_with_scores.append((category, similarity))
            
            return categories_with_scores
            
        except Exception as e:
            logger.warning(f"pgvector query failed, falling back to in-memory: {e}")
            return self._find_similar_in_memory(query_embedding, threshold, limit)
    
    def _find_similar_in_memory(
        self, 
        query_embedding: List[float], 
        threshold: float, 
        limit: int
    ) -> List[Tuple[Category, float]]:
        """In-memory similarity calculation"""
        from .crud import get_categories
        
        categories = get_categories(self.db, limit=settings.max_categories_to_check)
        similarities = []
        
        query_vec = np.array(query_embedding).reshape(1, -1)
        
        for category in categories:
            if not category.embedding_vector:
                continue
            
            try:
                cat_vec = np.array(category.embedding_vector).reshape(1, -1)
                
                if query_vec.shape[1] != cat_vec.shape[1]:
                    logger.warning(f"Dimension mismatch for category {category.id}: "
                                 f"query={query_vec.shape[1]}, category={cat_vec.shape[1]}")
                    continue
                
                similarity = cosine_similarity(query_vec, cat_vec)[0][0]
                
                if similarity >= threshold:
                    similarities.append((category, float(similarity)))
                    
            except (ValueError, IndexError) as e:
                logger.warning(f"Failed to calculate similarity for category {category.id}: {e}")
                continue
            except Exception as e:
                logger.error(f"Unexpected error calculating similarity for category {category.id}: {e}")
                continue
        
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:limit]
    
    def add_category_embedding(self, category_id: int, embedding: List[float]) -> bool:
        """Add or update embedding for a category"""
        try:
            category = self.db.query(Category).filter(Category.id == category_id).first()
            if not category:
                logger.error(f"Category {category_id} not found")
                return False
            
            category.embedding = embedding
            self.db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Failed to update embedding for category {category_id}: {e}")
            self.db.rollback()
            return False
    
    def get_embedding_stats(self) -> dict:
        """Get statistics about embeddings in the database"""
        try:
            total_categories = self.db.query(Category).count()
            categories_with_embeddings = self.db.query(Category).filter(
                Category.embedding.isnot(None)
            ).count()
            
            return {
                "total_categories": total_categories,
                "categories_with_embeddings": categories_with_embeddings,
                "embedding_coverage": categories_with_embeddings / total_categories if total_categories > 0 else 0,
                "using_pgvector": self.use_pgvector
            }
            
        except Exception as e:
            logger.error(f"Failed to get embedding stats: {e}")
            return {
                "total_categories": 0,
                "categories_with_embeddings": 0,
                "embedding_coverage": 0,
                "using_pgvector": self.use_pgvector,
                "error": str(e)
            }