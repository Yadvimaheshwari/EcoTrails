"""
Devices service
"""
import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from backend.models import Device, User

logger = logging.getLogger("EcoAtlas.Devices")


def register_device(
    user_id: str,
    device_type: str,
    device_id: Optional[str] = None,
    device_name: Optional[str] = None,
    token: Optional[str] = None,
    capabilities: Optional[Dict[str, Any]] = None,
    db: Session = None
) -> Optional[Dict[str, Any]]:
    """Register or update a device"""
    if not db:
        return None
    
    try:
        # Check if device already exists
        if device_id:
            device = db.query(Device).filter(
                Device.device_id == device_id,
                Device.user_id == user_id
            ).first()
        else:
            device = None
        
        if device:
            device.status = "connected"
            device.last_sync = datetime.utcnow()
            if device_name:
                device.device_name = device_name
            if token:
                device.token = token
            if capabilities:
                device.capabilities = capabilities
        else:
            device = Device(
                id=str(uuid.uuid4()),
                user_id=user_id,
                device_type=device_type,
                device_id=device_id or str(uuid.uuid4()),
                device_name=device_name or f"{device_type}_{device_id[:8] if device_id else 'unknown'}",
                status="connected",
                token=token,
                capabilities=capabilities or {},
                last_sync=datetime.utcnow()
            )
            db.add(device)
        
        db.commit()
        db.refresh(device)
        
        return {
            "id": device.id,
            "device_type": device.device_type,
            "device_id": device.device_id,
            "device_name": device.device_name,
            "status": device.status,
            "last_sync": device.last_sync.isoformat() if device.last_sync else None,
            "capabilities": device.capabilities
        }
    except Exception as e:
        logger.error(f"Error registering device: {e}")
        db.rollback()
        return None


def update_device_status(
    device_id: str,
    user_id: str,
    status: str,
    db: Session
) -> bool:
    """Update device status"""
    try:
        device = db.query(Device).filter(
            Device.id == device_id,
            Device.user_id == user_id
        ).first()
        
        if not device:
            return False
        
        device.status = status
        device.last_sync = datetime.utcnow()
        db.commit()
        return True
    except Exception as e:
        logger.error(f"Error updating device status: {e}")
        db.rollback()
        return False


def get_user_devices(user_id: str, db: Session) -> List[Dict[str, Any]]:
    """Get user's devices"""
    try:
        devices = db.query(Device).filter(Device.user_id == user_id).all()
        return [{
            "id": d.id,
            "device_type": d.device_type,
            "device_id": d.device_id,
            "device_name": d.device_name,
            "status": d.status,
            "capabilities": d.capabilities,
            "last_sync": d.last_sync.isoformat() if d.last_sync else None,
            "created_at": d.created_at.isoformat() if d.created_at else None
        } for d in devices]
    except Exception as e:
        logger.error(f"Error getting user devices: {e}")
        return []


def remove_device(device_id: str, user_id: str, db: Session) -> bool:
    """Remove a device"""
    try:
        device = db.query(Device).filter(
            Device.id == device_id,
            Device.user_id == user_id
        ).first()
        
        if not device:
            return False
        
        db.delete(device)
        db.commit()
        return True
    except Exception as e:
        logger.error(f"Error removing device: {e}")
        db.rollback()
        return False
