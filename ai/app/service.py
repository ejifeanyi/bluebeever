from sqlalchemy.orm import Session
from typing import Tuple, List, Optional
from datetime import datetime
import re
import random
from .crud import (
    get_categories, create_category, get_category_by_name, 
    update_category_email_count, find_similar_categories
)
from .schemas import StandaloneEmailRequest, ThreadedEmailRequest, CategorizationResponse

class BasicCategorizationService:
    """
    Basic categorization service for testing purposes.
    This uses simple keyword matching and pattern recognition.
    In production, you'd replace this with actual AI/ML models.
    """
    
    def __init__(self):
        # Basic keyword patterns for different categories
        self.category_patterns = {
            "Work Meetings": [
                r"\b(meeting|meet|conference|call|zoom|teams)\b",
                r"\b(agenda|schedule|calendar)\b",
                r"\b(sync|standup|retrospective)\b"
            ],
            "Travel": [
                r"\b(flight|hotel|booking|reservation|trip|travel)\b",
                r"\b(airline|airport|vacation|holiday)\b",
                r"\b(itinerary|destination|departure)\b"
            ],
            "Finance": [
                r"\b(invoice|payment|bill|receipt|expense|budget)\b",
                r"\b(bank|credit|debit|transaction|money)\b",
                r"\b(salary|payroll|accounting|tax)\b"
            ],
            "Shopping": [
                r"\b(order|purchase|buy|cart|checkout|delivery)\b",
                r"\b(amazon|ebay|shop|store|retail)\b",
                r"\b(product|item|shipping|discount)\b"
            ],
            "Social": [
                r"\b(party|event|celebration|birthday|wedding)\b",
                r"\b(friend|family|social|gathering)\b",
                r"\b(invitation|rsvp|dinner|lunch)\b"
            ],
            "Health": [
                r"\b(doctor|appointment|medical|health|hospital)\b",
                r"\b(prescription|medication|insurance|clinic)\b",
                r"\b(fitness|gym|workout|diet|wellness)\b"
            ],
            "Education": [
                r"\b(course|class|lecture|assignment|homework|study)\b",
                r"\b(university|college|school|education|learn)\b",
                r"\b(grade|exam|test|quiz|student|teacher)\b"
            ]
        }
    
    def extract_keywords(self, text: str) -> List[str]:
        """Extract important keywords from email content"""
        # Convert to lowercase and remove special characters
        clean_text = re.sub(r'[^\w\s]', ' ', text.lower())
        words = clean_text.split()
        
        # Filter out common stop words and short words
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
            'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
        }
        
        keywords = [word for word in words if len(word) > 2 and word not in stop_words]
        return keywords[:20]  # Return top 20 keywords
    
    def calculate_category_score(self, content: str, patterns: List[str]) -> float:
        """Calculate how well content matches a category's patterns"""
        content_lower = content.lower()
        matches = 0
        total_patterns = len(patterns)
        
        for pattern in patterns:
            if re.search(pattern, content_lower):
                matches += 1
        
        return matches / total_patterns if total_patterns > 0 else 0.0
    
    def find_best_category(self, content: str) -> Tuple[str, float]:
        """Find the best matching category for the given content"""
        best_category = None
        best_score = 0.0
        
        for category_name, patterns in self.category_patterns.items():
            score = self.calculate_category_score(content, patterns)
            if score > best_score:
                best_score = score
                best_category = category_name
        
        return best_category, best_score
    
    def generate_category_name(self, content: str) -> str:
        """Generate a new category name based on content"""
        keywords = self.extract_keywords(content)
        
        if not keywords:
            return "General"
        
        # Take the most relevant keywords and create a category name
        primary_keywords = keywords[:3]
        
        # Simple heuristics for category naming
        if any(word in ['work', 'job', 'office', 'business'] for word in primary_keywords):
            return f"Work - {primary_keywords[0].title()}"
        elif any(word in ['personal', 'family', 'friend'] for word in primary_keywords):
            return f"Personal - {primary_keywords[0].title()}"
        else:
            return primary_keywords[0].title()
    
    def create_simple_embedding(self, text: str) -> List[float]:
        """Create a simple embedding representation (for testing only)"""
        # This is a very basic embedding - just keyword frequency
        # In production, use proper sentence transformers or OpenAI embeddings
        keywords = self.extract_keywords(text)
        
        # Create a simple 100-dimensional vector based on keyword presence
        embedding = [0.0] * 100
        
        for i, keyword in enumerate(keywords[:50]):  # Use first 50 keywords
            # Simple hash-based positioning
            position = hash(keyword) % 100
            embedding[position] = min(1.0, embedding[position] + 0.1)
        
        # Add some randomness to make it more realistic
        for i in range(len(embedding)):
            embedding[i] += random.uniform(-0.05, 0.05)
            embedding[i] = max(0.0, min(1.0, embedding[i]))  # Clamp to [0,1]
        
        return embedding
    
    def categorize_standalone_email(self, db: Session, request: StandaloneEmailRequest) -> CategorizationResponse:
        """Categorize a standalone email"""
        # Combine subject and body for analysis
        content = f"{request.subject} {request.body}"
        
        # Try to find existing category
        best_category, confidence = self.find_best_category(content)
        
        # Minimum confidence threshold
        min_confidence = 0.3
        is_new_category = False
        
        if confidence < min_confidence or not best_category:
            # Create new category
            category_name = self.generate_category_name(content)
            embedding = self.create_simple_embedding(content)
            
            # Check if category already exists
            existing_category = get_category_by_name(db, category_name)
            if not existing_category:
                create_category(
                    db=db,
                    name=category_name,
                    description=f"Auto-generated category for emails like: {request.subject}",
                    embedding=embedding,
                    sample_content=request.snippet
                )
                is_new_category = True
            
            assigned_category = category_name
            confidence = 0.7  # Default confidence for new categories
        else:
            assigned_category = best_category
            is_new_category = False
        
        # Update email count for the category
        category = get_category_by_name(db, assigned_category)
        if category:
            update_category_email_count(db, category.id, 1)
        
        return CategorizationResponse(
            email_id=request.email_id,
            assigned_category=assigned_category,
            confidence_score=confidence,
            is_new_category=is_new_category,
            processing_timestamp=datetime.now(),
            category_description=f"Category for {assigned_category.lower()} related emails"
        )
    
    def categorize_threaded_email(self, db: Session, request: ThreadedEmailRequest) -> CategorizationResponse:
        """Categorize a threaded email"""
        # For threaded emails, prioritize previous category if confidence is high
        if request.previous_category:
            # Check if we should stick with the previous category
            content = f"{request.subject} {request.body}"
            category_confidence = self.calculate_category_score(
                content, 
                self.category_patterns.get(request.previous_category, [])
            )
            
            # If the content still matches the previous category well, use it
            if category_confidence > 0.2:  # Lower threshold for thread consistency
                category = get_category_by_name(db, request.previous_category)
                if category:
                    update_category_email_count(db, category.id, 1)
                
                return CategorizationResponse(
                    email_id=request.email_id,
                    assigned_category=request.previous_category,
                    confidence_score=min(0.9, category_confidence + 0.3),  # Boost confidence for thread consistency
                    is_new_category=False,
                    processing_timestamp=datetime.now(),
                    category_description=f"Continued from thread category"
                )
        
        # If no previous category or low confidence, treat as standalone
        standalone_request = StandaloneEmailRequest(
            email_id=request.email_id,
            subject=request.subject,
            body=request.body,
            snippet=request.snippet,
            sender_email=request.sender_email,
            recipient_emails=request.recipient_emails,
            timestamp=request.timestamp,
            labels=request.labels
        )
        
        return self.categorize_standalone_email(db, standalone_request)

# Global service instance
categorization_service = BasicCategorizationService()