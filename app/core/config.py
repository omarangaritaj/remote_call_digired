# app/core/config.py

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # API Configuration
    api_url: str = Field(default="", env="API_URL")
    api_endpoint: str = Field(default="", env="API_ENDPOINT")
    device_id: str = Field(default="raspberry-pi-001", env="DEVICE_ID")
    company_id: str = Field(default="", env="COMPANY_ID")

    # Database Configuration
    database_url: str = Field("sqlite://")

    # Application Configuration
    port: int = Field(default=3000, env="PORT")
    time_on_bulb: int = Field(default=2.0, env="TIME_ON_BULB", ge=0)
    environment: str = Field(default="development", env="ENVIRONMENT")

    # GPIO Configuration
    enable_gpio: bool = Field(default=True, env="ENABLE_GPIO")

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
is_prod_env = settings.environment == "production"
