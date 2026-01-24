"""
Database models for EcoAtlas production system
"""
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Column, String, Integer, DateTime, JSON, Float, ForeignKey, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class HikeSession(Base):
    """Active or completed hike session"""
    __tablename__ = "hike_sessions"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    park_name = Column(String, nullable=False, index=True)
    start_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    end_time = Column(DateTime, nullable=True)
    device_id = Column(String, nullable=True)  # EcoDroid device ID
    status = Column(String, default='active')  # 'active', 'completed', 'paused'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    observations = relationship("RealtimeObservation", back_populates="session", cascade="all, delete-orphan")
    environmental_record = relationship("EnvironmentalRecord", back_populates="session", uselist=False)


class RealtimeObservation(Base):
    """Real-time observations during active hike"""
    __tablename__ = "realtime_observations"
    
    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey('hike_sessions.id'), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    observation_type = Column(String, nullable=False)  # 'visual', 'acoustic', 'sensor', 'environmental'
    location = Column(JSON)  # {lat, lng, accuracy, altitude}
    raw_data = Column(JSON)  # Raw sensor/media data
    ai_analysis = Column(JSON)  # AI agent analysis
    confidence = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("HikeSession", back_populates="observations")


class EnvironmentalRecord(Base):
    """Final environmental record after hike completion"""
    __tablename__ = "environmental_records"
    
    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey('hike_sessions.id'), nullable=False, unique=True, index=True)
    park_name = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    location = Column(JSON)  # {lat, lng, name}
    confidence = Column(String)  # 'Low', 'Medium', 'High'
    summary = Column(Text)
    multimodal_evidence = Column(JSON)  # Array of media URLs/data
    tags = Column(JSON)  # Array of tags
    observation_events = Column(JSON)
    acoustic_analysis = Column(JSON)
    fusion_analysis = Column(JSON)
    field_narrative = Column(JSON)  # {consistent, different, changing, uncertain}
    spatial_insight = Column(JSON)  # {text, sources}
    temporal_delta = Column(Text)
    visual_artifact = Column(String)  # URL to generated artifact
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
