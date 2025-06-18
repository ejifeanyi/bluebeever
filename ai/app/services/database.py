import asyncpg
import json
from typing import List, Optional, Dict
from datetime import datetime
import uuid

from app.core.config import settings
from app.models.email import Category, CategoryStats

class DatabaseService:
    _pool = None
    
    @classmethod
    async def initialize(cls):
        cls._pool = await asyncpg.create_pool(
            settings.DATABASE_URL,
            min_size=5,
            max_size=20
        )
        await cls._create_tables()
    
    @classmethod
    async def close(cls):
        if cls._pool:
            await cls._pool.close()
    
    @classmethod
    async def _create_tables(cls):
        async with cls._pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS email_categories (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    embedding JSONB NOT NULL,
                    email_count INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(user_id, name)
                )
            """)
            
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_email_categories_user_id 
                ON email_categories(user_id)
            """)
    
    @classmethod
    async def save_category(cls, user_id: str, name: str, embedding: List[float]) -> str:
        category_id = str(uuid.uuid4())
        async with cls._pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO email_categories (id, user_id, name, embedding, created_at, updated_at)
                VALUES ($1, $2, $3, $4, NOW(), NOW())
                ON CONFLICT (user_id, name) DO UPDATE SET
                    email_count = email_categories.email_count + 1,
                    updated_at = NOW()
            """, category_id, user_id, name, json.dumps(embedding))
        return category_id
    
    @classmethod
    async def get_user_categories(cls, user_id: str) -> List[Category]:
        async with cls._pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, name, user_id, embedding, email_count, created_at, updated_at
                FROM email_categories
                WHERE user_id = $1
                ORDER BY updated_at DESC
            """, user_id)
            
            return [
                Category(
                    id=str(row['id']),
                    name=row['name'],
                    user_id=row['user_id'],
                    embedding=json.loads(row['embedding']),
                    email_count=row['email_count'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                )
                for row in rows
            ]
    
    @classmethod
    async def update_category_usage(cls, category_id: str):
        async with cls._pool.acquire() as conn:
            await conn.execute("""
                UPDATE email_categories 
                SET email_count = email_count + 1, updated_at = NOW()
                WHERE id = $1
            """, uuid.UUID(category_id))
    
    @classmethod
    async def get_category_stats(cls, user_id: str) -> List[CategoryStats]:
        async with cls._pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, email_count, updated_at
                FROM email_categories
                WHERE user_id = $1
            """, user_id)
            
            return [
                CategoryStats(
                    category_id=str(row['id']),
                    email_count=row['email_count'],
                    last_used=row['updated_at']
                )
                for row in rows
            ]
