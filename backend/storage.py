"""
Local file storage service (no S3 required)
"""
import os
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime, timedelta

logger = logging.getLogger("EcoAtlas.Storage")

# Storage configuration
STORAGE_TYPE = os.getenv("STORAGE_TYPE", "local")
STORAGE_PATH = os.getenv("STORAGE_PATH", "./uploads")
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")

# Create uploads directory if it doesn't exist
uploads_dir = Path(STORAGE_PATH)
uploads_dir.mkdir(parents=True, exist_ok=True)


def get_upload_url(key: str, content_type: str, expires_in: int = 3600) -> str:
    """Get upload URL for a file (returns direct upload endpoint)"""
    return f"{BASE_URL}/api/v1/media/upload/{key}"


def get_download_url(key: str, expires_in: int = 3600) -> str:
    """Get download URL for a file"""
    return f"{BASE_URL}/api/v1/media/{key}"


def get_media_url(key: str) -> str:
    """Get media URL"""
    return f"{BASE_URL}/api/v1/media/{key}"


def save_local_file(key: str, data: bytes) -> bool:
    """Save file to local storage"""
    try:
        file_path = uploads_dir / key
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(data)
        logger.info(f"Saved file: {key}")
        return True
    except Exception as e:
        logger.error(f"Error saving file {key}: {e}")
        return False


def get_local_file(key: str) -> Optional[bytes]:
    """Get file from local storage"""
    try:
        file_path = uploads_dir / key
        if file_path.exists():
            return file_path.read_bytes()
        return None
    except Exception as e:
        logger.error(f"Error reading file {key}: {e}")
        return None


def get_local_file_path(key: str) -> Path:
    """Get local file path"""
    return uploads_dir / key


def delete_local_file(key: str) -> bool:
    """Delete file from local storage"""
    try:
        file_path = uploads_dir / key
        if file_path.exists():
            file_path.unlink()
            return True
        return False
    except Exception as e:
        logger.error(f"Error deleting file {key}: {e}")
        return False
