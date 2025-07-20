from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class StandaloneEmailRequest(BaseModel):
    """Request model for standalone email categorization"""
    email_id: str = Field(..., description="Unique email identifier")
    user_id: str = Field(..., description="User identifier")
    subject: Optional[str] = Field(None, description="Email subject")
    body: Optional[str] = Field(None, description="Email body content")
    snippet: Optional[str] = Field(None, description="Email snippet/preview")
    sender_email: Optional[str] = Field(None, description="Sender email address")
    recipient_emails: Optional[List[str]] = Field(default_factory=list, description="Recipient email addresses")
    timestamp: Optional[datetime] = Field(None, description="Email timestamp")
    labels: Optional[List[str]] = Field(default_factory=list, description="Existing email labels")

class ThreadedEmailRequest(BaseModel):
    """Request model for threaded email categorization"""
    email_id: str = Field(..., description="Unique email identifier")
    user_id: str = Field(..., description="User identifier")
    subject: Optional[str] = Field(None, description="Email subject")
    body: Optional[str] = Field(None, description="Email body content")
    snippet: Optional[str] = Field(None, description="Email snippet/preview")
    sender_email: Optional[str] = Field(None, description="Sender email address")
    recipient_emails: Optional[List[str]] = Field(default_factory=list, description="Recipient email addresses")
    timestamp: Optional[datetime] = Field(None, description="Email timestamp")
    labels: Optional[List[str]] = Field(default_factory=list, description="Existing email labels")
    
    thread_subject: Optional[str] = Field(None, description="Original thread subject")
    previous_category: Optional[str] = Field(None, description="Previous category in thread")
    thread_id: Optional[str] = Field(None, description="Thread identifier")

class CategorizationResponse(BaseModel):
    """Response model for email categorization"""
    email_id: str = Field(..., description="Email identifier")
    user_id: str = Field(..., description="User identifier")
    assigned_category: str = Field(..., description="Assigned category name")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score")
    is_new_category: bool = Field(..., description="Whether category was newly created")
    processing_timestamp: datetime = Field(..., description="Processing timestamp")
    category_description: Optional[str] = Field(None, description="Category description")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class CategoryCreate(BaseModel):
    """Model for creating new categories"""
    name: str = Field(..., description="Category name")
    description: Optional[str] = Field(None, description="Category description")
    sample_content: Optional[str] = Field(None, description="Sample content for the category")

class CategoryResponse(BaseModel):
    """Response model for category information"""
    id: int = Field(..., description="Category ID")
    name: str = Field(..., description="Category name")
    description: Optional[str] = Field(None, description="Category description")
    email_count: int = Field(default=0, description="Number of emails in category")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }