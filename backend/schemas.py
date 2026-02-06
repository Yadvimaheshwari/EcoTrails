"""
Pydantic schemas for API request/response validation
Single source of truth for Place, Trail, Hike, JournalEntry, Media types
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


# Location type for JSON fields
class Location(BaseModel):
    lat: float
    lng: float


# Place Schema
class PlaceResponse(BaseModel):
    id: str
    name: str
    place_type: str  # 'park', 'trail', 'area'
    location: Optional[Dict[str, Any]] = None  # {lat, lng} or [lat, lng]
    description: Optional[str] = None
    meta_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Trail Schema
class TrailResponse(BaseModel):
    id: str
    place_id: str
    name: str
    difficulty: Optional[str] = None  # 'easy', 'moderate', 'hard', 'expert'
    distance_miles: Optional[float] = None
    elevation_gain_feet: Optional[float] = None
    estimated_duration_minutes: Optional[int] = None
    description: Optional[str] = None
    meta_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    place: Optional[PlaceResponse] = None

    class Config:
        from_attributes = True


# Media Schema
class MediaResponse(BaseModel):
    id: str
    hike_id: str
    segment_id: Optional[str] = None
    type: str  # 'photo', 'video', 'audio'
    category: Optional[str] = None  # 'trailhead', 'summit', 'wildlife', etc.
    storage_key: str
    url: str
    mime_type: str
    size_bytes: int
    width: Optional[int] = None
    height: Optional[int] = None
    duration_ms: Optional[int] = None
    location: Optional[Dict[str, Any]] = None  # {lat, lng}
    meta_data: Optional[Dict[str, Any]] = None
    synced_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Hike Schema
class HikeResponse(BaseModel):
    id: str
    user_id: str
    trail_id: Optional[str] = None
    place_id: Optional[str] = None
    status: str  # 'active', 'completed', 'paused'
    start_time: datetime
    end_time: Optional[datetime] = None
    distance_miles: Optional[float] = None
    duration_minutes: Optional[int] = None
    elevation_gain_feet: Optional[float] = None
    max_altitude_feet: Optional[float] = None
    weather: Optional[Dict[str, Any]] = None
    meta_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    # Relationships (optional, populated when using joinedload)
    trail: Optional[TrailResponse] = None
    media: Optional[List[MediaResponse]] = None
    route_points: Optional[List[Dict[str, Any]]] = None
    discoveries: Optional[List[Dict[str, Any]]] = None

    class Config:
        from_attributes = True


# JournalEntry Schema
class JournalEntryResponse(BaseModel):
    id: str
    user_id: str
    hike_id: Optional[str] = None
    entry_type: str  # 'legacy', 'reflection', 'note', 'trip_plan', 'hike_summary'
    title: Optional[str] = None
    content: str
    meta_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
