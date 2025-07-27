import os
from pydantic_settings import BaseSettings
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    """Production-ready configuration with environment detection"""
    
    environment: str = "development"
    
    database_url: str = "sqlite:///./test.db"
    supabase_url: Optional[str] = None
    supabase_key: Optional[str] = None

    rabbitmq_url: str = "amqp://localhost:5672"
    
    queue_name: str = "email_processing"
    result_cache_ttl: int = 7200
    worker_prefetch_count: int = 10
    max_retries: int = 3
    
    # Fixed field name to match environment variable
    model_name: str = "paraphrase-MiniLM-L3-v2"
    model_cache_dir: Optional[str] = "./models"
    
    category_match_threshold: float = 0.7
    thread_consistency_threshold: float = 0.5
    # Fixed field name to match environment variable
    confidence_boost: float = 0.2
    
    # Fixed field name to match environment variable
    max_categories_check: int = 1000
    cache_size: int = 2000
    embedding_cache_ttl: int = 7200
    
    max_body_chars: int = 500
    max_subject_chars: int = 200

    db_pool_size: int = 30
    db_pool_overflow: int = 20
    db_pool_timeout: int = 30
    
    log_level: str = "INFO"
    
    allowed_origins: str = "*"

    @property
    def sentence_transformer_model(self) -> str:
        """Alias for model_name to maintain compatibility"""
        return self.model_name

    @property
    def confidence_boost_for_threads(self) -> float:
        """Alias for confidence_boost to maintain compatibility"""
        return self.confidence_boost

    @property
    def max_categories_to_check(self) -> int:
        """Alias for max_categories_check to maintain compatibility"""
        return self.max_categories_check

    @property
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment.lower() in ["production", "prod"]
    
    @property
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.environment.lower() in ["development", "dev", "local"]
    
    @property
    def database_connection_args(self) -> dict:
        if "sqlite" in self.database_url:
            return {"check_same_thread": False}
        else:
            return {}
    
    def log_configuration(self):
        """Log current configuration (excluding sensitive data)"""
        config_summary = {
            "environment": self.environment,
            "database_type": "sqlite" if "sqlite" in self.database_url else "postgresql",
            "has_supabase": bool(self.supabase_url),
            "model": self.model_name,
            "cache_size": self.cache_size,
            "thresholds": {
                "category_match": self.category_match_threshold,
                "thread_consistency": self.thread_consistency_threshold
            }
        }
        logger.info(f"Configuration loaded: {config_summary}")
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()

def setup_logging():
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    if settings.is_production:
        file_handler = logging.FileHandler('email_categorization.log')
        file_handler.setFormatter(
            logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        )
        logging.getLogger().addHandler(file_handler)

setup_logging()
settings.log_configuration()