"""
Journal service
"""
import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.models import JournalEntry, User, Hike

logger = logging.getLogger("EcoAtlas.Journal")


def create_journal_entry(
    user_id: str,
    title: str,
    content: str,
    hike_id: Optional[str] = None,
    entry_type: str = "reflection",
    metadata: Optional[Dict[str, Any]] = None,
    db: Session = None
) -> Optional[Dict[str, Any]]:
    """Create a journal entry"""
    if not db:
        return None
    
    try:
        entry = JournalEntry(
            id=str(uuid.uuid4()),
            user_id=user_id,
            hike_id=hike_id,
            entry_type=entry_type,
            title=title,
            content=content,
            meta_data=metadata or {}
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        
        return {
            "id": entry.id,
            "user_id": entry.user_id,
            "hike_id": entry.hike_id,
            "entry_type": entry.entry_type,
            "title": entry.title,
            "content": entry.content,
            "metadata": entry.meta_data,
            "created_at": entry.created_at.isoformat() if entry.created_at else None
        }
    except Exception as e:
        logger.error(f"Error creating journal entry: {e}")
        db.rollback()
        return None


def get_journal_entries(
    user_id: str,
    hike_id: Optional[str] = None,
    entry_type: Optional[str] = None,
    limit: int = 50,
    db: Session = None
) -> List[Dict[str, Any]]:
    """Get journal entries"""
    if not db:
        return []
    
    try:
        query = db.query(JournalEntry).filter(JournalEntry.user_id == user_id)
        
        if hike_id:
            query = query.filter(JournalEntry.hike_id == hike_id)
        if entry_type:
            query = query.filter(JournalEntry.entry_type == entry_type)
        
        entries = query.order_by(desc(JournalEntry.created_at)).limit(limit).all()
        
        return [{
            "id": e.id,
            "user_id": e.user_id,
            "hike_id": e.hike_id,
            "entry_type": e.entry_type,
            "title": e.title,
            "content": e.content,
            "meta_data": e.meta_data,
            "created_at": e.created_at.isoformat() if e.created_at else None,
            "updated_at": e.updated_at.isoformat() if e.updated_at else None
        } for e in entries]
    except Exception as e:
        logger.error(f"Error getting journal entries: {e}")
        return []


def update_journal_entry(
    entry_id: str,
    user_id: str,
    title: Optional[str] = None,
    content: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    db: Session = None
) -> Optional[Dict[str, Any]]:
    """Update a journal entry"""
    if not db:
        return None
    
    try:
        entry = db.query(JournalEntry).filter(
            JournalEntry.id == entry_id,
            JournalEntry.user_id == user_id
        ).first()
        
        if not entry:
            return None
        
        if title:
            entry.title = title
        if content:
            entry.content = content
        if metadata:
            entry.meta_data = metadata
        entry.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(entry)
        
        return {
            "id": entry.id,
            "title": entry.title,
            "content": entry.content,
            "metadata": entry.meta_data,
            "updated_at": entry.updated_at.isoformat() if entry.updated_at else None
        }
    except Exception as e:
        logger.error(f"Error updating journal entry: {e}")
        db.rollback()
        return None


def delete_journal_entry(entry_id: str, user_id: str, db: Session) -> bool:
    """Delete a journal entry"""
    try:
        entry = db.query(JournalEntry).filter(
            JournalEntry.id == entry_id,
            JournalEntry.user_id == user_id
        ).first()
        
        if not entry:
            return False
        
        db.delete(entry)
        db.commit()
        return True
    except Exception as e:
        logger.error(f"Error deleting journal entry: {e}")
        db.rollback()
        return False
