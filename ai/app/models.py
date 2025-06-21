from sqlalchemy import Column, Integer, String, DateTime, Text, JSON
from sqlalchemy.sql import func
from .database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    embedding = Column(JSON, nullable=False)  # Store vector as JSON array
    sample_content = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    email_count = Column(Integer, default=0, nullable=False)

    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}', email_count={self.email_count})>"