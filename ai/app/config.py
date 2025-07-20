import os
from pydantic_settings import BaseSettings
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    """Production-ready configuration with environment detection"""
    
    environment: str = os.getenv("ENVIRONMENT", "development")
    
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./test.db")
    supabase_url: Optional[str] = os.getenv("SUPABASE_URL")
    supabase_key: Optional[str] = os.getenv("SUPABASE_ANON_KEY")

    rabbitmq_url: str = os.getenv("RABBITMQ_URL", "amqp://localhost:5672")
    
    queue_name: str = os.getenv("QUEUE_NAME", "email_processing")
    result_cache_ttl: int = int(os.getenv("RESULT_CACHE_TTL", "7200")) 
    worker_prefetch_count: int = int(os.getenv("WORKER_PREFETCH_COUNT", "10")) 
    max_retries: int = int(os.getenv("MAX_RETRIES", "3"))
    
    sentence_transformer_model: str = os.getenv("MODEL_NAME", "paraphrase-MiniLM-L3-v2")
    model_cache_dir: Optional[str] = os.getenv("MODEL_CACHE_DIR", "./models")
    
    category_match_threshold: float = float(os.getenv("CATEGORY_MATCH_THRESHOLD", "0.7"))
    thread_consistency_threshold: float = float(os.getenv("THREAD_CONSISTENCY_THRESHOLD", "0.5"))
    confidence_boost_for_threads: float = float(os.getenv("CONFIDENCE_BOOST", "0.2"))
    
    max_categories_to_check: int = int(os.getenv("MAX_CATEGORIES_CHECK", "1000"))
    cache_size: int = int(os.getenv("CACHE_SIZE", "2000")) 
    embedding_cache_ttl: int = int(os.getenv("EMBEDDING_CACHE_TTL", "7200"))
    
    max_body_chars: int = int(os.getenv("MAX_BODY_CHARS", "500"))
    max_subject_chars: int = int(os.getenv("MAX_SUBJECT_CHARS", "200"))

    db_pool_size: int = int(os.getenv("DB_POOL_SIZE", "30"))
    db_pool_overflow: int = int(os.getenv("DB_POOL_OVERFLOW", "20"))
    db_pool_timeout: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    
    allowed_origins: str = "*"

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
            "model": self.sentence_transformer_model,
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