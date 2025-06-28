# app/core/database.py

import os
import databases
import sqlalchemy
from sqlalchemy import MetaData, Table, Column, Integer, String, DateTime
from sqlalchemy.sql import func

from app.core.config import settings

# Ensure data directory exists
data_dir = os.path.dirname(settings.database_url.replace("file:", ""))
if data_dir and not os.path.exists(data_dir):
    os.makedirs(data_dir, exist_ok=True)

# Database instance
database = databases.Database(f"{settings.database_url.replace('file:', 'sqlite://')}")

# SQLAlchemy metadata
metadata = MetaData()

# Users table definition
users_table = Table(
    "users",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("userId", String, unique=True, nullable=False),
    Column("location", String, nullable=False),  # JSON string
    Column("accessToken", String, nullable=False),
    Column("switchInput", Integer, nullable=False),
    Column("createdAt", DateTime, default=func.now()),
    Column("updatedAt", DateTime, default=func.now(), onupdate=func.now()),
)

# Create engine
engine = sqlalchemy.create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {}
)

# Create tables
metadata.create_all(engine)
