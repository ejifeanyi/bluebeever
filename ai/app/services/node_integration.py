import httpx
from typing import Dict
import os

class NodeIntegrationService:
    
    @classmethod
    async def notify_categorization_complete(
        cls,
        email_id: str,
        category_id: str,
        category_name: str,
        confidence_score: float
    ):
        node_service_url = os.getenv("NODE_SERVICE_URL", "http://localhost:3000")
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{node_service_url}/api/emails/{email_id}/categorization",
                    json={
                        "category_id": category_id,
                        "category_name": category_name,
                        "confidence_score": confidence_score,
                        "processed_at": datetime.now().isoformat()
                    },
                    headers={
                        "X-API-Key": os.getenv("NODE_API_KEY"),
                        "Content-Type": "application/json"
                    },
                    timeout=30.0
                )
                return response.status_code == 200
            except Exception as e:
                print(f"Failed to notify Node.js service: {e}")
                return False