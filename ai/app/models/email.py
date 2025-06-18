from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime

class EmailCategorizationRequest(BaseModel):
    user_id: str
    email_id: str
    subject: str
    content: str
    sender: str

class EmailCategorizationResponse(BaseModel):
    email_id: str
    category_id: str
    category_name: str
    confidence_score: float
    is_new_category: bool
    created_at: datetime

class Category(BaseModel):
    id: str
    name: str
    user_id: str
    embedding: List[float]
    email_count: int
    created_at: datetime
    updated_at: datetime

class CategoryStats(BaseModel):
    category_id: str
    email_count: int
    last_used: datetime
