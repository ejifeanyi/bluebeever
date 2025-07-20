from sqlalchemy import Column, Integer, String, DateTime, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import ARRAY
from .database import Base
import json

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    embedding = Column(JSON, nullable=False) 
    sample_content = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    email_count = Column(Integer, default=0, nullable=False)
    
    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}', email_count={self.email_count})>"
    
    @property
    def embedding_vector(self):
        """Get embedding as list of floats"""
        if isinstance(self.embedding, str):
            return json.loads(self.embedding)
        return self.embedding or []