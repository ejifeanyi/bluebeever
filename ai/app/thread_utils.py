import re
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class ThreadUtils:
    """Utility class for email thread operations"""
    
    @staticmethod
    def normalize_subject(subject: str) -> str:
        """Normalize email subject for comparison"""
        if not subject:
            return ""
        
        subject = re.sub(r'^(Re:|RE:|Fwd:|FWD:|Fw:)\s*', '', subject, flags=re.IGNORECASE)
        
        subject = re.sub(r'\s+', ' ', subject).strip()
        
        return subject.lower()
    
    @staticmethod
    def is_thread_continuation(current_subject: str, thread_subject: str) -> bool:
        """Check if current email is continuation of thread"""
        if not current_subject or not thread_subject:
            return False
        
        normalized_current = ThreadUtils.normalize_subject(current_subject)
        normalized_thread = ThreadUtils.normalize_subject(thread_subject)
        
        if normalized_current == normalized_thread:
            return True
        
        if normalized_thread in normalized_current:
            return True
        
        if normalized_current in normalized_thread:
            return True
        
        return False
    
    @staticmethod
    def extract_thread_id(subject: str, message_id: str = None) -> Optional[str]:
        """Extract or generate thread ID"""
        if not subject:
            return message_id
        
        normalized = ThreadUtils.normalize_subject(subject)
        
        import hashlib
        thread_id = hashlib.md5(normalized.encode()).hexdigest()[:16]
        
        return thread_id

class TextUtils:
    """Utility class for text processing"""
    
    @staticmethod
    def extract_keywords(text: str, max_keywords: int = 10) -> list:
        """Extract keywords from text"""
        if not text:
            return []
        
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must'
        }
        
        words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
        
        keywords = [word for word in words if word not in stop_words]
        
        unique_keywords = list(dict.fromkeys(keywords))
        
        return unique_keywords[:max_keywords]
    
    @staticmethod
    def calculate_text_similarity(text1: str, text2: str) -> float:
        """Calculate simple text similarity based on common words"""
        if not text1 or not text2:
            return 0.0
        
        words1 = set(TextUtils.extract_keywords(text1))
        words2 = set(TextUtils.extract_keywords(text2))
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union) if union else 0.0

class EmailUtils:
    """Utility class for email-specific operations"""
    
    @staticmethod
    def extract_domain(email: str) -> Optional[str]:
        """Extract domain from email address"""
        if not email or '@' not in email:
            return None
        
        try:
            return email.split('@')[1].lower()
        except IndexError:
            return None
    
    @staticmethod
    def is_corporate_email(email: str) -> bool:
        """Check if email is from corporate domain"""
        domain = EmailUtils.extract_domain(email)
        if not domain:
            return False
        
        personal_domains = {
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
            'aol.com', 'icloud.com', 'protonmail.com'
        }
        
        return domain not in personal_domains
    
    @staticmethod
    def extract_name_from_email(email: str) -> Optional[str]:
        """Extract name from email address"""
        if not email or '@' not in email:
            return None
        
        try:
            local_part = email.split('@')[0]
            
            if '.' in local_part:
                parts = local_part.split('.')
                return ' '.join(part.capitalize() for part in parts)
            elif '_' in local_part:
                parts = local_part.split('_')
                return ' '.join(part.capitalize() for part in parts)
            else:
                return local_part.capitalize()
        except:
            return None

class ValidationUtils:
    """Utility class for validation operations"""
    
    @staticmethod
    def is_valid_email(email: str) -> bool:
        """Basic email validation"""
        if not email:
            return False
        
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    @staticmethod
    def sanitize_category_name(name: str) -> str:
        """Sanitize category name"""
        if not name:
            return "General"
        
        sanitized = re.sub(r'[^\w\s&-]', '', name)
        sanitized = re.sub(r'\s+', ' ', sanitized).strip()
        
        sanitized = ' '.join(word.capitalize() for word in sanitized.split())
        
        return sanitized[:50]