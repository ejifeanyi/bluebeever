from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import os
from dotenv import load_dotenv

from app.core.config import settings
from app.services.categorization import CategorizationService
from app.services.database import DatabaseService
from app.models.email import EmailCategorizationRequest, EmailCategorizationResponse
from app.core.security import verify_api_key

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await DatabaseService.initialize()
    await CategorizationService.initialize()
    yield
    await DatabaseService.close()

app = FastAPI(
    title="Email AI Categorization Service",
    description="Intelligent email categorization using BERT embeddings",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "email-ai-categorization"}

@app.post("/categorize", response_model=EmailCategorizationResponse)
async def categorize_email(
    request: EmailCategorizationRequest,
    background_tasks: BackgroundTasks,
    api_key: str = Depends(verify_api_key)
):
    try:
        result = await CategorizationService.categorize_email(
            user_id=request.user_id,
            email_id=request.email_id,
            subject=request.subject,
            content=request.content,
            sender=request.sender
        )
        
        background_tasks.add_task(
            CategorizationService.update_category_stats,
            request.user_id,
            result.category_id
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Categorization failed: {str(e)}")

@app.get("/categories/{user_id}")
async def get_user_categories(
    user_id: str,
    api_key: str = Depends(verify_api_key)
):
    try:
        categories = await CategorizationService.get_user_categories(user_id)
        return {"categories": categories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch categories: {str(e)}")

@app.post("/retrain/{user_id}")
async def retrain_user_model(
    user_id: str,
    background_tasks: BackgroundTasks,
    api_key: str = Depends(verify_api_key)
):
    background_tasks.add_task(CategorizationService.retrain_user_categories, user_id)
    return {"message": "Retraining initiated", "user_id": user_id}

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENV") == "development"
    )