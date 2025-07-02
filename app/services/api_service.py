# app/services/api_service.py

import httpx
from app.utils.logger_service import logger
from typing import Dict, Any

from app.models.models import ApiResponse, SwitchEventPayload
from app.core.config import is_prod_env, settings


class ApiService:
    def __init__(self):
        self.api_url = settings.api_url
        self.api_endpoint = settings.api_endpoint
        self.device_id = settings.device_id
        self.user_agent = f"RaspberryPi-GPIO-Controller/1.0/{self.device_id}"
        self.timeout = httpx.Timeout(30.0)

    async def fetch_users(self) -> ApiResponse:
        """Fetch users from the API"""
        url = f"{self.api_url}/{self.api_endpoint}"
        logger.info("📡 Fetching users")

        headers = {
            "Content-Type": "application/json",
            "User-Agent": self.user_agent,
        }

        payload = {"branchId": self.device_id}

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, json=payload, headers=headers)

            if response.status_code != 201:
                raise Exception(f"API returned status {response.status_code}")

            logger.info("✅ Successfully fetched users from API")
            return ApiResponse(**response.json())

    async def send_switch_event(self, payload: SwitchEventPayload, access_token: str) -> Dict[str, Any]:
        """Send switch event to the API"""
        try:
            url = f"{self.api_url}/api/v1/companies/{settings.company_id}/queues/call-external"

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}",
                "User-Agent": self.user_agent,
            }

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload.model_dump(), headers=headers)

                if response.status_code in [200, 201]:
                    logger.info("✅ Switch event sent successfully to API") if not is_prod_env else None
                else:
                    logger.warning(f"⚠️ API responded with status {response.status_code}")

                return response.json()

        except Exception as error:
            logger.error(f"❌ Failed to send switch event to API: {error}")
            raise
