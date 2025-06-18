import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
from typing import List, Tuple, Optional
from datetime import datetime
import re
import hashlib

from app.core.config import settings
from app.services.database import DatabaseService
from app.models.email import EmailCategorizationResponse, Category

class CategorizationService:
    _model = None
    
    @classmethod
    async def initialize(cls):
        cls._model = SentenceTransformer(settings.BERT_MODEL_NAME)
    
    @classmethod
    async def categorize_email(
        cls,
        user_id: str,
        email_id: str,
        subject: str,
        content: str,
        sender: str
    ) -> EmailCategorizationResponse:
        
        email_text = cls._prepare_email_text(subject, content, sender)
        email_embedding = cls._get_embedding(email_text)
        
        existing_categories = await DatabaseService.get_user_categories(user_id)
        
        if not existing_categories:
            category_name = cls._generate_category_name(subject, content)
            category_id = await DatabaseService.save_category(
                user_id, category_name, email_embedding.tolist()
            )
            
            return EmailCategorizationResponse(
                email_id=email_id,
                category_id=category_id,
                category_name=category_name,
                confidence_score=1.0,
                is_new_category=True,
                created_at=datetime.now()
            )
        
        best_match = cls._find_best_category_match(email_embedding, existing_categories)
        
        if best_match[1] >= settings.SIMILARITY_THRESHOLD:
            category = best_match[0]
            await DatabaseService.update_category_usage(category.id)
            
            return EmailCategorizationResponse(
                email_id=email_id,
                category_id=category.id,
                category_name=category.name,
                confidence_score=best_match[1],
                is_new_category=False,
                created_at=datetime.now()
            )
        
        if len(existing_categories) >= settings.MAX_CATEGORIES_PER_USER:
            category = existing_categories[0]
            await DatabaseService.update_category_usage(category.id)
            
            return EmailCategorizationResponse(
                email_id=email_id,
                category_id=category.id,
                category_name=category.name,
                confidence_score=best_match[1],
                is_new_category=False,
                created_at=datetime.now()
            )
        
        category_name = cls._generate_category_name(subject, content)
        category_id = await DatabaseService.save_category(
            user_id, category_name, email_embedding.tolist()
        )
        
        return EmailCategorizationResponse(
            email_id=email_id,
            category_id=category_id,
            category_name=category_name,
            confidence_score=1.0,
            is_new_category=True,
            created_at=datetime.now()
        )
    
    @classmethod
    def _prepare_email_text(cls, subject: str, content: str, sender: str) -> str:
        cleaned_content = re.sub(r'<[^>]+>', '', content)
        cleaned_content = re.sub(r'\s+', ' ', cleaned_content).strip()
        
        return f"From: {sender} Subject: {subject} Content: {cleaned_content[:500]}"
    
    @classmethod
    def _get_embedding(cls, text: str) -> np.ndarray:
        return cls._model.encode([text])[0]
    
    @classmethod
    def _find_best_category_match(
        cls, 
        email_embedding: np.ndarray, 
        categories: List[Category]
    ) -> Tuple[Category, float]:
        
        best_category = categories[0]
        best_similarity = 0.0
        
        for category in categories:
            category_embedding = np.array(category.embedding)
            similarity = cosine_similarity(
                [email_embedding], 
                [category_embedding]
            )[0][0]
            
            if similarity > best_similarity:
                best_similarity = similarity
                best_category = category
        
        return best_category, float(best_similarity)
    
    @classmethod
    def _generate_category_name(cls, subject: str, content: str) -> str:
        keywords = cls._extract_keywords(subject + " " + content)
        
        if "invoice" in keywords or "bill" in keywords or "payment" in keywords:
            return "Financial"
        elif "meeting" in keywords or "calendar" in keywords or "schedule" in keywords:
            return "Meetings"
        elif "newsletter" in keywords or "unsubscribe" in keywords:
            return "Newsletters"
        elif "order" in keywords or "shipping" in keywords or "delivery" in keywords:
            return "Orders"
        elif "social" in keywords or "notification" in keywords:
            return "Social"
        else:
            primary_keyword = keywords[0] if keywords else "General"
            return primary_keyword.title()
    
    @classmethod
    def _extract_keywords(cls, text: str) -> List[str]:
        text = re.sub(r'[^\w\s]', '', text.lower())
        words = text.split()
        
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
        }
        
        keywords = [word for word in words if len(word) > 3 and word not in stop_words]
        return keywords[:5]
    
    @classmethod
    async def get_user_categories(cls, user_id: str) -> List[dict]:
        categories = await DatabaseService.get_user_categories(user_id)
        return [
            {
                "id": cat.id,
                "name": cat.name,
                "email_count": cat.email_count,
                "created_at": cat.created_at,
                "updated_at": cat.updated_at
            }
            for cat in categories
        ]
    
    @classmethod
    async def update_category_stats(cls, user_id: str, category_id: str):
        await DatabaseService.update_category_usage(category_id)
    
    @classmethod
    async def retrain_user_categories(cls, user_id: str):
        categories = await DatabaseService.get_user_categories(user_id)
        
        for category in categories:
            pass

