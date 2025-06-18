from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    API_KEY: str
    ALLOWED_ORIGINS: List[str] = ["*"]
    SIMILARITY_THRESHOLD: float = 0.75
    MAX_CATEGORIES_PER_USER: int = 50
    BERT_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"
    
    class Config:
        env_file = ".env"

settings = Settings()