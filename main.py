# main.py

import asyncio
import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from loguru import logger

from app.core.config import settings
from app.core.database import database
from app.controllers.app_controller import router as app_router
from app.services.gpio_service import GPIOService
from app.services.user_service import UserService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("🚀 Initializing GPIO Controller Application...")

    try:
        # Connect to database
        database.connect()
        logger.info("✅ Database connected successfully")

        # Initialize services
        gpio_service = app.state.gpio_service
        user_service = app.state.user_service

        # Initialize GPIO
        await gpio_service.initialize()
        logger.info("✅ GPIO initialized successfully")

        # Fetch and store users from API
        await user_service.fetch_and_store_users()
        logger.info("✅ Users synchronized with API")

        # Start GPIO monitoring
        await gpio_service.start_monitoring()
        logger.info("✅ GPIO monitoring started")

        logger.info("🎉 Application initialized successfully")

    except Exception as error:
        logger.error(f"❌ Failed to initialize application: {error}")
        raise

    yield

    # Cleanup
    logger.info("🧹 Shutting down application...")
    gpio_service = app.state.gpio_service
    await gpio_service.cleanup()
    await database.disconnect()
    logger.info("✅ Application shutdown completed")


def create_app() -> FastAPI:
    """Create FastAPI application"""
    app = FastAPI(
        title="Raspberry Pi GPIO Controller",
        description="GPIO Controller API for Raspberry Pi 4B",
        version="1.0.0",
        lifespan=lifespan
    )

    # Initialize services
    app.state.gpio_service = GPIOService()
    app.state.user_service = UserService()

    # Include routers
    app.include_router(app_router)

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", 3000))

    logger.info(f"🚀 GPIO Controller starting on port {port}")
    logger.info(f"📊 Health check available at: http://localhost:{port}/health")
    logger.info(f"📈 Status endpoint available at: http://localhost:{port}/status")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )