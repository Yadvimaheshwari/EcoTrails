"""
Database models for EcoAtlas production system
"""
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Column, String, Integer, DateTime, JSON, Float, ForeignKey, Boolean, Text, BigInteger, Numeric
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class User(Base):
    """User accounts"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    subscription_tier = Column(String, default='free')  # 'free', 'pro'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    hikes = relationship("Hike", back_populates="user", cascade="all, delete-orphan")
    devices = relationship("Device", back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
    journal_entries = relationship("JournalEntry", back_populates="user", cascade="all, delete-orphan")


class Place(Base):
    """Parks and places"""
    __tablename__ = "places"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    place_type = Column(String, nullable=False)  # 'park', 'trail', 'area'
    location = Column(JSON)  # {lat, lng}
    description = Column(Text, nullable=True)
    meta_data = Column(JSON)  # Additional place data
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    trails = relationship("Trail", back_populates="place", cascade="all, delete-orphan")


class Trail(Base):
    """Trails within places"""
    __tablename__ = "trails"
    
    id = Column(String, primary_key=True, index=True)
    place_id = Column(String, ForeignKey('places.id'), nullable=False, index=True)
    name = Column(String, nullable=False)
    difficulty = Column(String)  # 'easy', 'moderate', 'hard', 'expert'
    distance_miles = Column(Float, nullable=True)
    elevation_gain_feet = Column(Float, nullable=True)
    estimated_duration_minutes = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    meta_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    place = relationship("Place", back_populates="trails")
    segments = relationship("TrailSegment", back_populates="trail", cascade="all, delete-orphan")
    hikes = relationship("Hike", back_populates="trail", cascade="all, delete-orphan")
    checkpoints = relationship("TrailCheckpoint", back_populates="trail", cascade="all, delete-orphan")


class TrailSegment(Base):
    """Segments of a trail"""
    __tablename__ = "trail_segments"
    
    id = Column(String, primary_key=True, index=True)
    trail_id = Column(String, ForeignKey('trails.id'), nullable=False, index=True)
    segment_index = Column(Integer, nullable=False)
    start_location = Column(JSON)  # {lat, lng}
    end_location = Column(JSON)  # {lat, lng}
    distance_miles = Column(Float, nullable=True)
    elevation_gain_feet = Column(Float, nullable=True)
    terrain_type = Column(String, nullable=True)
    meta_data = Column(JSON)
    
    # Relationships
    trail = relationship("Trail", back_populates="segments")
    route_points = relationship("RoutePoint", back_populates="segment", cascade="all, delete-orphan")
    observations = relationship("Observation", back_populates="segment", cascade="all, delete-orphan")


class TrailCheckpoint(Base):
    """Interactive checkpoints along a trail with activities"""
    __tablename__ = "trail_checkpoints"
    
    id = Column(String, primary_key=True, index=True)
    trail_id = Column(String, ForeignKey('trails.id'), nullable=False, index=True)
    sequence_order = Column(Integer, nullable=False)  # 1, 2, 3...
    name = Column(String, nullable=False)  # "Waterfall Overlook", "Summit Ridge"
    description = Column(Text)
    location = Column(JSON, nullable=False)  # {lat, lng}
    distance_from_start_meters = Column(Float)
    elevation_feet = Column(Float)
    
    # Activities at this checkpoint
    activities = Column(JSON, default=list)  # List of activity objects
    
    # Metadata
    photo_url = Column(String)
    difficulty_rating = Column(String)  # easy, moderate, hard
    estimated_time_minutes = Column(Integer)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    trail = relationship("Trail", back_populates="checkpoints")


class HikeCheckpointProgress(Base):
    """Track user progress through trail checkpoints"""
    __tablename__ = "hike_checkpoint_progress"
    
    id = Column(String, primary_key=True, index=True)
    hike_id = Column(String, ForeignKey('hikes.id'), nullable=False, index=True)
    checkpoint_id = Column(String, ForeignKey('trail_checkpoints.id'), nullable=False, index=True)
    
    reached_at = Column(DateTime)
    activities_completed = Column(JSON, default=list)  # List of completed activity IDs
    xp_earned = Column(Integer, default=0)
    photos_taken = Column(JSON, default=list)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    checkpoint = relationship("TrailCheckpoint")


class Hike(Base):
    """Hike sessions (renamed from HikeSession)"""
    __tablename__ = "hikes"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    trail_id = Column(String, ForeignKey('trails.id'), nullable=True, index=True)
    place_id = Column(String, ForeignKey('places.id'), nullable=True, index=True)
    status = Column(String, default='active')  # 'active', 'completed', 'paused'
    start_time = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    end_time = Column(DateTime, nullable=True, index=True)
    distance_miles = Column(Float, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    elevation_gain_feet = Column(Float, nullable=True)
    max_altitude_feet = Column(Float, nullable=True)
    weather = Column(JSON, nullable=True)
    meta_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="hikes")
    trail = relationship("Trail", back_populates="hikes")
    route_points = relationship("RoutePoint", back_populates="hike", cascade="all, delete-orphan")
    sensor_batches = relationship("SensorBatch", back_populates="hike", cascade="all, delete-orphan")
    media = relationship("Media", back_populates="hike", cascade="all, delete-orphan")
    discoveries = relationship("Discovery", back_populates="hike", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="hike", uselist=False)
    mastery_records = relationship("MasteryRecord", back_populates="hike", cascade="all, delete-orphan")
    sensory_memories = relationship("SensoryMemory", back_populates="hike", cascade="all, delete-orphan")
    journal_entries = relationship("JournalEntry", back_populates="hike", cascade="all, delete-orphan")


class RoutePoint(Base):
    """GPS route points"""
    __tablename__ = "route_points"
    
    id = Column(String, primary_key=True, index=True)
    hike_id = Column(String, ForeignKey('hikes.id'), nullable=False, index=True)
    segment_id = Column(String, ForeignKey('trail_segments.id'), nullable=True, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float, nullable=True)
    accuracy = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    hike = relationship("Hike", back_populates="route_points")
    segment = relationship("TrailSegment", back_populates="route_points")


class SensorBatch(Base):
    """Sensor data batches"""
    __tablename__ = "sensor_batches"
    
    id = Column(String, primary_key=True, index=True)
    hike_id = Column(String, ForeignKey('hikes.id'), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    heart_rate = Column(Float, nullable=True)
    cadence = Column(Float, nullable=True)
    pace = Column(Float, nullable=True)
    altitude = Column(Float, nullable=True)
    pressure = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)
    accelerometer = Column(JSON, nullable=True)
    gyroscope = Column(JSON, nullable=True)
    meta_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    hike = relationship("Hike", back_populates="sensor_batches")


class Media(Base):
    """Media files (photos, videos, audio)"""
    __tablename__ = "media"
    
    id = Column(String, primary_key=True, index=True)
    hike_id = Column(String, ForeignKey('hikes.id'), nullable=False, index=True)
    segment_id = Column(String, ForeignKey('trail_segments.id'), nullable=True, index=True)
    type = Column(String, nullable=False)  # 'photo', 'video', 'audio'
    category = Column(String, nullable=True)  # 'trailhead', 'summit', 'wildlife', etc.
    storage_key = Column(String, nullable=False, unique=True, index=True)
    url = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    location = Column(JSON, nullable=True)  # {lat, lng}
    meta_data = Column(JSON, nullable=True)
    synced_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    hike = relationship("Hike", back_populates="media")


class Discovery(Base):
    """Discoveries during hikes"""
    __tablename__ = "discoveries"
    
    id = Column(String, primary_key=True, index=True)
    hike_id = Column(String, ForeignKey('hikes.id'), nullable=False, index=True)
    segment_id = Column(String, ForeignKey('trail_segments.id'), nullable=True, index=True)
    discovery_type = Column(String, nullable=False)  # 'wildlife', 'plant', 'geology', 'feature', 'cultural'
    timestamp = Column(DateTime, nullable=False, index=True)
    location = Column(JSON, nullable=True)  # {lat, lng}
    confidence = Column(String, nullable=False)  # 'Low', 'Medium', 'High'
    description = Column(Text, nullable=True)
    evidence_media_ids = Column(JSON, nullable=True)  # Array of media IDs
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    hike = relationship("Hike", back_populates="discoveries")


class Achievement(Base):
    """Achievement definitions"""
    __tablename__ = "achievements"
    
    id = Column(String, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String, nullable=True)
    category = Column(String, nullable=True)  # 'distance', 'elevation', 'wildlife', etc.
    meta_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user_achievements = relationship("UserAchievement", back_populates="achievement", cascade="all, delete-orphan")


class UserAchievement(Base):
    """User achievement unlocks"""
    __tablename__ = "user_achievements"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    achievement_id = Column(String, ForeignKey('achievements.id'), nullable=False, index=True)
    hike_id = Column(String, ForeignKey('hikes.id'), nullable=True, index=True)
    unlocked_at = Column(DateTime, default=datetime.utcnow, index=True)
    meta_data = Column(JSON, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="user_achievements")


class Insight(Base):
    """Post-hike AI insights"""
    __tablename__ = "insights"
    
    id = Column(String, primary_key=True, index=True)
    hike_id = Column(String, ForeignKey('hikes.id'), nullable=False, unique=True, index=True)
    status = Column(String, default='pending')  # 'pending', 'processing', 'completed', 'failed'
    final_report = Column(JSON, nullable=True)  # Array of report cards
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    hike = relationship("Hike", back_populates="insights")


class MasteryRecord(Base):
    """Mastery milestones"""
    __tablename__ = "mastery_records"
    
    id = Column(String, primary_key=True, index=True)
    hike_id = Column(String, ForeignKey('hikes.id'), nullable=False, index=True)
    milestone_type = Column(String, nullable=False)  # 'altitude', 'scrambling', 'navigation', etc.
    value = Column(Float, nullable=True)
    achieved = Column(Boolean, default=False)
    meta_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    hike = relationship("Hike", back_populates="mastery_records")


class SensoryMemory(Base):
    """Sensory and emotional memories"""
    __tablename__ = "sensory_memories"
    
    id = Column(String, primary_key=True, index=True)
    hike_id = Column(String, ForeignKey('hikes.id'), nullable=False, index=True)
    quietness_rating = Column(Float, nullable=True)
    awe_scale = Column(Float, nullable=True)
    loneliness_vs_peace = Column(String, nullable=True)
    fear_moments = Column(JSON, nullable=True)
    confidence_growth = Column(Float, nullable=True)
    mental_clarity = Column(Float, nullable=True)
    most_beautiful_moment = Column(Text, nullable=True)
    hardest_segment = Column(Text, nullable=True)
    gratitude_moment = Column(Text, nullable=True)
    almost_quit_moment = Column(Text, nullable=True)
    meta_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    hike = relationship("Hike", back_populates="sensory_memories")


class JournalEntry(Base):
    """Journal entries"""
    __tablename__ = "journal_entries"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    hike_id = Column(String, ForeignKey('hikes.id'), nullable=True, index=True)
    entry_type = Column(String, default='legacy')  # 'legacy', 'reflection', 'note', 'trip_plan'
    title = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    meta_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="journal_entries")
    hike = relationship("Hike", back_populates="journal_entries")


class UserFavoritePlace(Base):
    """User favorite/liked places"""
    __tablename__ = "user_favorite_places"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    place_id = Column(String, ForeignKey('places.id'), nullable=False, index=True)
    planned_visit_date = Column(DateTime, nullable=True)  # When user plans to visit
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    place = relationship("Place")
    
    # Unique constraint: one favorite per user-place combination
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )


class Observation(Base):
    """Observations from sensor data"""
    __tablename__ = "observations"
    
    id = Column(String, primary_key=True, index=True)
    hike_id = Column(String, ForeignKey('hikes.id'), nullable=False, index=True)
    segment_id = Column(String, ForeignKey('trail_segments.id'), nullable=True, index=True)
    observation_type = Column(String, nullable=False)  # 'visual', 'acoustic', 'sensor', 'environmental'
    timestamp = Column(DateTime, nullable=False, index=True)
    location = Column(JSON, nullable=True)  # {lat, lng, accuracy, altitude}
    raw_data = Column(JSON, nullable=True)
    ai_analysis = Column(JSON, nullable=True)
    confidence = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    segment = relationship("TrailSegment", back_populates="observations")


class Device(Base):
    """Connected devices (wearables, EcoDroid)"""
    __tablename__ = "devices"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    device_type = Column(String, nullable=False)  # 'apple_watch', 'garmin', 'fitbit', 'ecodroid'
    device_id = Column(String, unique=True, nullable=True)
    device_name = Column(String, nullable=True)
    status = Column(String, default='disconnected')  # 'connected', 'disconnected', 'online', 'offline'
    capabilities = Column(JSON, nullable=True)
    token = Column(String, nullable=True)  # OAuth token or API key
    last_sync = Column(DateTime, nullable=True)
    meta_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="devices")


# Legacy models for backward compatibility
class HikeSession(Base):
    """Legacy: Active or completed hike session (maps to Hike)"""
    __tablename__ = "hike_sessions"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    park_name = Column(String, nullable=False, index=True)
    start_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    end_time = Column(DateTime, nullable=True)
    device_id = Column(String, nullable=True)
    status = Column(String, default='active')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    observations = relationship("RealtimeObservation", back_populates="session", cascade="all, delete-orphan")
    environmental_record = relationship("EnvironmentalRecord", back_populates="session", uselist=False)


class RealtimeObservation(Base):
    """Legacy: Real-time observations during active hike"""
    __tablename__ = "realtime_observations"
    
    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey('hike_sessions.id'), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    observation_type = Column(String, nullable=False)
    location = Column(JSON)
    raw_data = Column(JSON)
    ai_analysis = Column(JSON)
    confidence = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("HikeSession", back_populates="observations")


class EnvironmentalRecord(Base):
    """Legacy: Final environmental record after hike completion"""
    __tablename__ = "environmental_records"
    
    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey('hike_sessions.id'), nullable=False, unique=True, index=True)
    park_name = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    location = Column(JSON)
    confidence = Column(String)
    summary = Column(Text)
    multimodal_evidence = Column(JSON)
    tags = Column(JSON)
    observation_events = Column(JSON)
    acoustic_analysis = Column(JSON)
    fusion_analysis = Column(JSON)
    field_narrative = Column(JSON)
    spatial_insight = Column(JSON)
    temporal_delta = Column(Text)
    visual_artifact = Column(String)
    experience_synthesis = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("HikeSession", back_populates="environmental_record")


class EcoDroidDevice(Base):
    """Registered EcoDroid hardware devices"""
    __tablename__ = "ecodroid_devices"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    device_name = Column(String)
    status = Column(String, default='offline')  # 'online', 'offline', 'streaming'
    last_seen = Column(DateTime, nullable=True)
    firmware_version = Column(String)
    battery_level = Column(Integer, default=100)
    sensor_config = Column(JSON)  # Camera, mic, GPS, IMU configs
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WearableDevice(Base):
    """Connected wearable devices"""
    __tablename__ = "wearable_devices"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    device_type = Column(String, nullable=False)  # 'apple_watch', 'wear_os'
    device_id = Column(String, unique=True, nullable=False)
    status = Column(String, default='disconnected')  # 'connected', 'disconnected'
    last_sync = Column(DateTime, nullable=True)
    capabilities = Column(JSON)  # Vibration, notifications, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SocialPost(Base):
    """Social feed posts where users share hike experiences"""
    __tablename__ = "social_posts"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    hike_id = Column(String, ForeignKey('hikes.id'), nullable=True, index=True)
    place_id = Column(String, ForeignKey('places.id'), nullable=True, index=True)
    post_type = Column(String, nullable=False, default='experience')  # 'experience', 'discovery', 'plan', 'tip', 'photo'
    content = Column(Text, nullable=False)
    media_urls = Column(JSON, nullable=True)  # Array of image/video URLs
    location = Column(JSON, nullable=True)  # {lat, lng, name}
    tags = Column(JSON, nullable=True)  # Array of tags like ['sunset', 'wildlife']
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    hike = relationship("Hike")
    place = relationship("Place")
    comments = relationship("PostComment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")


class PostComment(Base):
    """Comments on social posts"""
    __tablename__ = "post_comments"
    
    id = Column(String, primary_key=True, index=True)
    post_id = Column(String, ForeignKey('social_posts.id'), nullable=False, index=True)
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    post = relationship("SocialPost", back_populates="comments")
    user = relationship("User")


class PostLike(Base):
    """Likes on social posts"""
    __tablename__ = "post_likes"
    
    id = Column(String, primary_key=True, index=True)
    post_id = Column(String, ForeignKey('social_posts.id'), nullable=False, index=True)
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    post = relationship("SocialPost", back_populates="likes")
    user = relationship("User")


class WearableAlert(Base):
    """Queued alerts for wearable devices"""
    __tablename__ = "wearable_alerts"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    device_id = Column(String, ForeignKey('wearable_devices.id'), nullable=True)
    alert_type = Column(String, nullable=False)  # 'safety', 'environmental', 'confirmation', 'status'
    message = Column(Text, nullable=False)
    vibration = Column(String)  # 'gentle', 'strong', 'urgent'
    action_required = Column(Boolean, default=False)
    status = Column(String, default='pending')  # 'pending', 'sent', 'delivered', 'acknowledged'
    created_at = Column(DateTime, default=datetime.utcnow)
    sent_at = Column(DateTime, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
