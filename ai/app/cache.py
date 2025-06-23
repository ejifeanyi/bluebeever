from functools import lru_cache
from typing import Dict, List, Optional, Tuple
from .config import settings
import time
import threading

class EmbeddingCache:
    """Thread-safe LRU cache for embeddings"""
    
    def __init__(self, max_size: int = 100, ttl: int = 3600):
        self.max_size = max_size
        self.ttl = ttl
        self._cache: Dict[str, Tuple[List[float], float]] = {}
        self._lock = threading.RLock()
    
    def get(self, key: str) -> Optional[List[float]]:
        """Get embedding from cache"""
        with self._lock:
            if key in self._cache:
                embedding, timestamp = self._cache[key]
                if time.time() - timestamp < self.ttl:
                    return embedding
                else:
                    del self._cache[key]
            return None
    
    def set(self, key: str, embedding: List[float]) -> None:
        """Set embedding in cache"""
        with self._lock:
            # Simple LRU eviction
            if len(self._cache) >= self.max_size:
                oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k][1])
                del self._cache[oldest_key]
            
            self._cache[key] = (embedding, time.time())
    
    def clear(self) -> None:
        """Clear all cached embeddings"""
        with self._lock:
            self._cache.clear()

# Global cache instance
embedding_cache = EmbeddingCache(
    max_size=settings.cache_size, 
    ttl=settings.embedding_cache_ttl
)