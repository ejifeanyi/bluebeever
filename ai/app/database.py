from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from supabase import create_client, Client
from typing import Generator, Optional
from .config import settings
import logging

logger = logging.getLogger(__name__)

try:
    if "sqlite" in settings.database_url:
        engine = create_engine(
            settings.database_url, 
            connect_args=settings.database_connection_args,
            pool_pre_ping=True,
            echo=settings.is_development
        )
    else:
        engine = create_engine(
            settings.database_url,
            pool_size=settings.db_pool_size,
            pool_timeout=settings.db_pool_timeout,
            max_overflow=settings.db_pool_overflow,
            pool_pre_ping=True,
            echo=settings.is_development
        )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
    logger.info(f"Database engine created successfully for: {settings.database_url.split('@')[-1] if '@' in settings.database_url else 'local database'}")
except Exception as e:
    logger.error(f"Failed to create database engine: {e}")
    raise

supabase_client: Optional[Client] = None
if settings.supabase_url and settings.supabase_key:
    try:
        supabase_client = create_client(settings.supabase_url, settings.supabase_key)
        logger.info("Supabase client initialized")
    except Exception as e:
        logger.warning(f"Failed to initialize Supabase client: {e}")

def get_db() -> Generator[Session, None, None]:
    """Database session dependency with better error handling"""
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        raise
    finally:
        db.close()

def check_vector_extension(db: Session) -> bool:
    """Check if pgvector extension is available"""
    try:
        result = db.execute(text("SELECT 1 FROM pg_extension WHERE extname = 'vector'"))
        return result.fetchone() is not None
    except Exception:
        return False

def create_tables():
    """Create database tables with error handling"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        return False

def test_database_connection() -> bool:
    """Test database connection"""
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        logger.info("Database connection test successful")
        return True
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False