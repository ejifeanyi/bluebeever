from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import re
import logging
from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from .crud import (
    get_categories, create_category, get_category_by_name, 
    update_category_email_count, find_similar_categories
)
from .schemas import StandaloneEmailRequest, ThreadedEmailRequest, CategorizationResponse

logger = logging.getLogger(__name__)

class EmailCategorizationService:
    """
    AI-powered email categorization service using Sentence Transformers
    """
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """Initialize with a lightweight, fast sentence transformer model"""
        try:
            self.model = SentenceTransformer(model_name)
            self.embedding_dim = self.model.get_sentence_embedding_dimension()
            logger.info(f"Loaded model {model_name} with {self.embedding_dim} dimensions")
        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            raise
    
    def clean_email_content(self, content: str) -> str:
        """Clean and preprocess email content"""
        if not content:
            return ""
        
        # Remove HTML tags
        content = re.sub(r'<[^>]+>', ' ', content)
        
        # Remove email signatures (common patterns)
        signature_patterns = [
            r'\n--\s*\n.*$',  # Standard signature delimiter
            r'\nSent from my.*$',  # Mobile signatures
            r'\nBest regards,.*$',  # Common closings
            r'\nThanks,.*$',
            r'\nRegards,.*$',
        ]
        for pattern in signature_patterns:
            content = re.sub(pattern, '', content, flags=re.DOTALL | re.IGNORECASE)
        
        # Remove quoted text (replies starting with >)
        lines = content.split('\n')
        clean_lines = []
        for line in lines:
            if not line.strip().startswith('>'):
                clean_lines.append(line)
            else:
                break  # Stop at first quoted line
        content = '\n'.join(clean_lines)
        
        # Remove excessive whitespace
        content = re.sub(r'\s+', ' ', content)
        content = content.strip()
        
        return content
    
    def extract_meaningful_text(self, subject: str, body: str) -> str:
        """Extract the most meaningful text for categorization"""
        cleaned_body = self.clean_email_content(body)
        
        # Combine subject and body, giving more weight to subject
        if subject and cleaned_body:
            return f"{subject}. {cleaned_body[:500]}"  # Limit body to 500 chars
        elif subject:
            return subject
        elif cleaned_body:
            return cleaned_body[:500]
        else:
            return "General email"
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for given text"""
        try:
            if not text or not text.strip():
                # Return zero vector for empty text
                return [0.0] * self.embedding_dim
            
            embedding = self.model.encode(text, convert_to_tensor=False)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return [0.0] * self.embedding_dim
    
    def calculate_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings"""
        try:
            if not embedding1 or not embedding2:
                return 0.0
            
            vec1 = np.array(embedding1).reshape(1, -1)
            vec2 = np.array(embedding2).reshape(1, -1)
            
            similarity = cosine_similarity(vec1, vec2)[0][0]
            return float(similarity)
        except Exception as e:
            logger.error(f"Failed to calculate similarity: {e}")
            return 0.0
    
    def find_best_matching_category(self, db: Session, email_embedding: List[float], 
                                  threshold: float = 0.7) -> Optional[tuple]:
        """Find the best matching existing category"""
        try:
            categories = get_categories(db, limit=1000)  # Get all categories
            
            if not categories:
                return None
            
            best_category = None
            best_similarity = 0.0
            
            for category in categories:
                if not category.embedding:
                    continue
                
                similarity = self.calculate_similarity(email_embedding, category.embedding)
                
                if similarity > best_similarity and similarity >= threshold:
                    best_similarity = similarity
                    best_category = category
            
            if best_category:
                return best_category, best_similarity
            
            return None
        except Exception as e:
            logger.error(f"Error finding matching category: {e}")
            return None
    
    def generate_category_name(self, text: str) -> str:
        """Generate a meaningful category name from email content"""
        # Extract key topics using simple keyword extraction
        words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
        
        # Common business/personal keywords
        business_keywords = ['meeting', 'project', 'work', 'business', 'team', 'client', 'deadline']
        personal_keywords = ['family', 'friend', 'personal', 'vacation', 'party', 'social']
        finance_keywords = ['payment', 'invoice', 'bill', 'bank', 'money', 'expense']
        travel_keywords = ['flight', 'hotel', 'trip', 'travel', 'booking', 'reservation']
        
        # Check for keyword categories
        if any(word in words for word in business_keywords):
            return "Work & Business"
        elif any(word in words for word in finance_keywords):
            return "Finance & Bills"
        elif any(word in words for word in travel_keywords):
            return "Travel & Bookings"
        elif any(word in words for word in personal_keywords):
            return "Personal & Social"
        else:
            # Extract most common meaningful words
            meaningful_words = [w for w in words if len(w) > 3 and w not in 
                              ['this', 'that', 'with', 'from', 'they', 'have', 'will']]
            
            if meaningful_words:
                return meaningful_words[0].title() + " Related"
            else:
                return "General"
    
    def categorize_standalone_email(self, db: Session, request: StandaloneEmailRequest) -> CategorizationResponse:
        """Categorize a standalone email using AI embeddings"""
        try:
            # Extract and clean meaningful text
            meaningful_text = self.extract_meaningful_text(request.subject, request.body)
            
            # Generate embedding
            email_embedding = self.generate_embedding(meaningful_text)
            
            # Try to find existing category
            match_result = self.find_best_matching_category(db, email_embedding)
            
            if match_result:
                category, similarity = match_result
                
                # Update email count
                update_category_email_count(db, category.id, 1)
                
                return CategorizationResponse(
                    email_id=request.email_id,
                    user_id=request.user_id,
                    assigned_category=category.name,
                    confidence_score=similarity,
                    is_new_category=False,
                    processing_timestamp=datetime.now(),
                    category_description=category.description
                )
            
            else:
                # Create new category
                category_name = self.generate_category_name(meaningful_text)
                
                # Check if category name already exists
                existing = get_category_by_name(db, category_name)
                if existing:
                    category_name = f"{category_name} {datetime.now().strftime('%m%d')}"
                
                new_category = create_category(
                    db=db,
                    name=category_name,
                    description=f"Auto-generated category based on: {request.subject[:50]}...",
                    embedding=email_embedding,
                    sample_content=request.snippet
                )
                
                # Set initial email count
                update_category_email_count(db, new_category.id, 1)
                
                return CategorizationResponse(
                    email_id=request.email_id,
                    user_id=request.user_id,
                    assigned_category=new_category.name,
                    confidence_score=0.8,  # High confidence for new category
                    is_new_category=True,
                    processing_timestamp=datetime.now(),
                    category_description=new_category.description
                )
                
        except Exception as e:
            logger.error(f"Error categorizing standalone email {request.email_id}: {e}")
            # Fallback to general category
            general_category = get_category_by_name(db, "General")
            if not general_category:
                general_category = create_category(db, "General", "General email category")
            
            update_category_email_count(db, general_category.id, 1)
            
            return CategorizationResponse(
                email_id=request.email_id,
                user_id=request.user_id,
                assigned_category="General",
                confidence_score=0.5,
                is_new_category=False,
                processing_timestamp=datetime.now(),
                category_description="General email category"
            )
    
    def categorize_threaded_email(self, db: Session, request: ThreadedEmailRequest) -> CategorizationResponse:
        """Categorize a threaded email with context awareness"""
        try:
            # If we have previous category info, check if current email is similar
            if request.previous_category:
                previous_category = get_category_by_name(db, request.previous_category)
                
                if previous_category and previous_category.embedding:
                    # Generate embedding for current email
                    meaningful_text = self.extract_meaningful_text(request.subject, request.body)
                    current_embedding = self.generate_embedding(meaningful_text)
                    
                    # Check similarity with previous category
                    similarity = self.calculate_similarity(current_embedding, previous_category.embedding)
                    
                    # Lower threshold for thread consistency
                    if similarity >= 0.5:
                        update_category_email_count(db, previous_category.id, 1)
                        
                        return CategorizationResponse(
                            email_id=request.email_id,
                            user_id=request.user_id,
                            assigned_category=previous_category.name,
                            confidence_score=min(0.95, similarity + 0.2),  # Boost for thread consistency
                            is_new_category=False,
                            processing_timestamp=datetime.now(),
                            category_description=previous_category.description
                        )
            
            # If no previous category or low similarity, treat as standalone
            standalone_request = StandaloneEmailRequest(
                email_id=request.email_id,
                user_id=request.user_id,
                subject=request.subject,
                body=request.body,
                snippet=request.snippet,
                sender_email=request.sender_email,
                recipient_emails=request.recipient_emails,
                timestamp=request.timestamp,
                labels=request.labels
            )
            
            return self.categorize_standalone_email(db, standalone_request)
            
        except Exception as e:
            logger.error(f"Error categorizing threaded email {request.email_id}: {e}")
            return self.categorize_standalone_email(db, StandaloneEmailRequest(
                email_id=request.email_id,
                user_id=request.user_id,
                subject=request.subject,
                body=request.body,
                snippet=request.snippet,
                sender_email=request.sender_email,
                recipient_emails=request.recipient_emails,
                timestamp=request.timestamp,
                labels=request.labels
            ))

# Global service instance
categorization_service = EmailCategorizationService()