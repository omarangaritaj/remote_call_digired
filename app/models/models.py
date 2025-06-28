# app/models/models.py

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class UserLocation(BaseModel):
    id: str
    name: str
    number: int


class ApiUser(BaseModel):
    id: str
    accessToken: str
    location: UserLocation
    pin: Optional[int] = None


class ApiResponse(BaseModel):
    users: List[ApiUser]


class SwitchEventPayload(BaseModel):
    location: UserLocation
    branchId: str
    isMultiService: bool
    status: str


class User(BaseModel):
    id: Optional[int] = None
    userId: str
    location: str  # JSON string
    accessToken: str
    switchInput: int
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None


class ApplicationInfo(BaseModel):
    message: str
    version: str
    device_id: str
    switches: int
    bulbs: int
    status: str
    timestamp: str


class HealthCheck(BaseModel):
    status: str
    timestamp: str
    uptime: float
    memory: Dict[str, Any]


class GPIOStatus(BaseModel):
    gpioAvailable: bool
    mode: str
    isMonitoring: bool
    isDocker: bool
    switchStates: List[bool]
    switchPins: List[int]
    bulbPins: List[int]
    switchCount: int
    bulbCount: int
    timestamp: str
    systemInfo: Dict[str, bool]
