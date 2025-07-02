# app/services/user_service.py

import json
from pprint import pprint
from typing import Optional, Dict, Any
from app.utils.logger_service import logger

from app.core.database import database, users_table
from app.services.api_service import ApiService
from app.models.models import ApiUser
from app.constants.pin_constants import SWITCH_PINS
from app.core.config import is_prod_env


def _upsert_user(api_user: ApiUser, switch_input: int) -> None:
    """Insert or update user in database"""
    location_string = json.dumps(api_user.location.model_dump())

    # Check if user exists
    query = users_table.select().where(users_table.c.userId == api_user.id)
    existing_user = database.fetch_one(query)

    if existing_user:
        # Update existing user
        query = users_table.update().where(
            users_table.c.userId == api_user.id
        ).values(
            accessToken=api_user.accessToken,
            location=location_string,
        )
        database.execute(query)
    else:
        # Create new user
        query = users_table.insert().values(
            userId=api_user.id,
            accessToken=api_user.accessToken,
            location=location_string,
            switchInput=switch_input,
        )
        database.execute(query)

    logger.info(f"👤 User {api_user.id} synchronized")


class UserService:
    def __init__(self):
        self.api_service = ApiService()

    async def fetch_and_store_users(self) -> None:
        """Fetch users from API and store them in database"""
        try:
            logger.info("📡 Fetching users from API...")

            api_response = await self.api_service.fetch_users()

            if not api_response.users:
                logger.error("Invalid API response format")
                return

            logger.info(f"📥 Received {len(api_response.users)} users from API")

            # Process users sequentially to avoid database conflicts
            for index, api_user in enumerate(api_response.users):
                if index < len(SWITCH_PINS):
                    _upsert_user(api_user, SWITCH_PINS[index])

            logger.info("✅ Users synchronized successfully")

            if not is_prod_env:
                logger.warning("🔒 Sensitive data not logged in production environment")
                all_users = database.fetch_all(users_table.select())
                print('\n' + '-' * 40 + '\n')
                for user in all_users:
                    user_dict = {key: value for key, value in user._mapping.items()}
                    pprint(user_dict)
                    print('\n' + '-' * 40 + '\n')

                logger.warning("🔒 Sensitive data not logged in production environment")

        except Exception as error:
            logger.error(f"❌ Failed to fetch and store users: {error}")
            raise

    def get_user(self, switch_index: int) -> Optional[Dict[str, Any]]:
        """Get user by switch index"""
        try:
            query = users_table.select().where(users_table.c.switchInput == switch_index)
            user_record = database.fetch_one(query)

            if not user_record:
                logger.error("No users found")
                return None

            # Convert record to dict and parse location JSON
            user_dict = dict(user_record)
            user_dict["location"] = json.loads(user_dict["location"])

            return user_dict

        except Exception as error:
            logger.error(f"Error fetching user: {error}")
            raise