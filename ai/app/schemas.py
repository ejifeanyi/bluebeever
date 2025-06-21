from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# Request Schemas (What Express API sends to FastAPI)

class StandaloneEmailRequest(BaseModel):
    """Schema for categorizing a standalone email"""
    email_id: str = Field(..., description="Unique identifier from Express API")
    subject: str = Field(..., description="Email subject line")
    body: str = Field(..., description="Full email body content")
    snippet: str = Field(..., description="Brief email snippet")
    sender_email: str = Field(..., description="Email address of sender")
    recipient_emails: List[str] = Field(..., description="List of recipient email addresses")
    timestamp: datetime = Field(..., description="When the email was sent")
    labels: Optional[List[str]] = Field(default=None, description="Gmail labels if any")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email_id": "email_123",
                "subject": "Weekly team meeting",
                "body": "Hi team, our weekly meeting is scheduled for tomorrow...",
                "snippet": "Hi team, our weekly meeting is scheduled...",
                "sender_email": "manager@company.com",
                "recipient_emails": ["team@company.com"],
                "timestamp": "2024-06-21T10:30:00Z",
                "labels": ["work", "meetings"]
            }
        }

class ThreadedEmailRequest(BaseModel):
    """Schema for categorizing an email that's part of a thread"""
    email_id: str = Field(..., description="Unique identifier from Express API")
    thread_id: str = Field(..., description="Thread identifier from Express API")
    subject: str = Field(..., description="Current email subject line")
    body: str = Field(..., description="Current email body content")
    snippet: str = Field(..., description="Brief email snippet")
    sender_email: str = Field(..., description="Email address of sender")
    recipient_emails: List[str] = Field(..., description="List of recipient email addresses")
    timestamp: datetime = Field(..., description="When the email was sent")
    labels: Optional[List[str]] = Field(default=None, description="Gmail labels if any")
    
    # Thread context
    thread_subject: str = Field(..., description="Original thread subject")
    previous_category: Optional[str] = Field(default=None, description="Category of most recent email in thread")
    previous_email_snippet: Optional[str] = Field(default=None, description="Snippet from most recent email in thread for context")
    thread_email_count: int = Field(..., description="Number of emails in this thread so far")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email_id": "email_456",
                "thread_id": "thread_789",
                "subject": "Re: Weekly team meeting",
                "body": "Thanks for the update. I'll attend the meeting...",
                "snippet": "Thanks for the update. I'll attend...",
                "sender_email": "developer@company.com",
                "recipient_emails": ["manager@company.com", "team@company.com"],
                "timestamp": "2024-06-21T11:15:00Z",
                "labels": ["work", "meetings"],
                "thread_subject": "Weekly team meeting",
                "previous_category": "Work Meetings",
                "previous_email_snippet": "Hi team, our weekly meeting is scheduled...",
                "thread_email_count": 2
            }
        }

# Response Schemas (What FastAPI sends back to Express API)

class CategorizationResponse(BaseModel):
    """Response schema for email categorization"""
    email_id: str = Field(..., description="The email ID that was processed")
    assigned_category: str = Field(..., description="The category assigned to this email")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="AI confidence in categorization (0-1)")
    is_new_category: bool = Field(..., description="Whether this category was just created")
    processing_timestamp: datetime = Field(..., description="When the categorization was processed")
    category_description: Optional[str] = Field(default=None, description="Brief description of the category")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email_id": "email_123",
                "assigned_category": "Work Meetings",
                "confidence_score": 0.92,
                "is_new_category": False,
                "processing_timestamp": "2024-06-21T10:30:15Z",
                "category_description": "Emails about work meetings and scheduling"
            }
        }

class ErrorResponse(BaseModel):
    """Error response schema"""
    error: str = Field(..., description="Error message")
    email_id: Optional[str] = Field(default=None, description="Email ID if available")
    timestamp: datetime = Field(..., description="When the error occurred")
    
    class Config:
        json_schema_extra = {
            "example": {
                "error": "Unable to process email content",
                "email_id": "email_123",
                "timestamp": "2024-06-21T10:30:15Z"
            }
        }

# Database Response Schemas (For internal use and debugging)

class CategorySchema(BaseModel):
    """Schema representing a category in the database"""
    id: int
    name: str
    description: Optional[str] = None
    email_count: int
    created_at: datetime
    sample_content: Optional[str] = None
    
    class Config:
        from_attributes = True  # For SQLAlchemy compatibility
        json_schema_extra = {
            "example": {
                "id": 1,
                "name": "Work Meetings",
                "description": "Emails about work meetings and scheduling",
                "email_count": 15,
                "created_at": "2024-06-20T09:00:00Z",
                "sample_content": "Hi team, our weekly meeting is scheduled..."
            }
        }

class CategoriesListResponse(BaseModel):
    """Schema for listing all categories"""
    categories: List[CategorySchema]
    total_count: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "categories": [
                    {
                        "id": 1,
                        "name": "Work Meetings",
                        "description": "Emails about work meetings and scheduling",
                        "email_count": 15,
                        "created_at": "2024-06-20T09:00:00Z",
                        "sample_content": "Hi team, our weekly meeting is scheduled..."
                    }
                ],
                "total_count": 1
            }
        }

# Health Check Schema

class HealthCheckResponse(BaseModel):
    """Health check response schema"""
    status: str = Field(..., description="Service status")
    timestamp: datetime = Field(..., description="Health check timestamp")
    categories_count: int = Field(..., description="Number of categories in database")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "timestamp": "2024-06-21T10:30:00Z",
                "categories_count": 25
            }
        }