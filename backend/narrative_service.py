"""
AI Journal Narrative Service
Generates narrative from hike stats, user notes, and photo metadata only
"""
import logging
import json
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.models import Hike, JournalEntry, Media
from backend.ai_services import get_gemini_client

logger = logging.getLogger("EcoAtlas.Narrative")


async def generate_hike_narrative(
    hike_id: str,
    db: Session,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Generate AI narrative for a completed hike using only stats, notes, and photo metadata"""
    try:
        hike = db.query(Hike).filter(Hike.id == hike_id).first()
        if not hike:
            return {"success": False, "error": "Hike not found"}
        
        # Only generate for completed hikes
        if hike.status != 'completed':
            return {"success": False, "error": "Narrative can only be generated for completed hikes"}
        
        # Get user notes from journal entries
        journal_entries = db.query(JournalEntry).filter(
            JournalEntry.hike_id == hike_id,
            JournalEntry.user_id == hike.user_id
        ).all()
        
        user_notes = []
        for entry in journal_entries:
            if entry.content:
                user_notes.append(entry.content)
            if entry.meta_data and isinstance(entry.meta_data, dict):
                if entry.meta_data.get('reflection'):
                    user_notes.append(entry.meta_data['reflection'])
                if entry.meta_data.get('prep_notes'):
                    user_notes.append(entry.meta_data['prep_notes'])
        
        # Get photo metadata
        photos = db.query(Media).filter(
            Media.hike_id == hike_id,
            Media.type == 'photo'
        ).all()
        
        photo_metadata = []
        for photo in photos:
            meta = {
                "created_at": photo.created_at.isoformat() if photo.created_at else None,
                "location": photo.location if photo.location else None,
                "category": photo.category,
            }
            if photo.meta_data:
                meta.update(photo.meta_data)
            photo_metadata.append(meta)
        
        # Build context from real data only
        context_parts = []
        
        # Hike stats
        stats = []
        if hike.distance_miles:
            stats.append(f"Distance: {hike.distance_miles:.2f} miles")
        if hike.elevation_gain_feet:
            stats.append(f"Elevation gain: {hike.elevation_gain_feet:.0f} feet")
        if hike.duration_minutes:
            hours = hike.duration_minutes // 60
            minutes = hike.duration_minutes % 60
            stats.append(f"Duration: {hours}h {minutes}m")
        if hike.max_altitude_feet:
            stats.append(f"Max altitude: {hike.max_altitude_feet:.0f} feet")
        if hike.start_time:
            stats.append(f"Started: {hike.start_time}")
        if hike.end_time:
            stats.append(f"Ended: {hike.end_time}")
        
        if stats:
            context_parts.append("Hike Statistics:\n" + "\n".join(f"- {s}" for s in stats))
        
        # Trail info
        if hike.trail:
            trail_info = []
            if hike.trail.name:
                trail_info.append(f"Trail: {hike.trail.name}")
            if hike.trail.difficulty:
                trail_info.append(f"Difficulty: {hike.trail.difficulty}")
            if hike.trail.place:
                trail_info.append(f"Location: {hike.trail.place.name}")
            if trail_info:
                context_parts.append("\nTrail Information:\n" + "\n".join(f"- {t}" for t in trail_info))
        
        # User notes
        if user_notes:
            context_parts.append(f"\nUser Notes ({len(user_notes)} entries):\n" + "\n".join(f"- {note[:200]}..." if len(note) > 200 else f"- {note}" for note in user_notes[:5]))
        
        # Photo metadata
        if photo_metadata:
            context_parts.append(f"\nPhotos ({len(photo_metadata)} total):")
            for i, meta in enumerate(photo_metadata[:10]):  # Limit to first 10
                photo_info = []
                if meta.get('created_at'):
                    photo_info.append(f"Time: {meta['created_at']}")
                if meta.get('location'):
                    photo_info.append(f"Location: {meta['location']}")
                if meta.get('category'):
                    photo_info.append(f"Category: {meta['category']}")
                if photo_info:
                    context_parts.append(f"  Photo {i+1}: " + ", ".join(photo_info))
        
        context = "\n".join(context_parts)
        
        # Generate narrative using Gemini
        prompt = f"""Write a personal, engaging narrative about this hiking experience based on the following information.

{context}

Create a narrative (300-500 words) that:
- Tells the story of the hike in first person
- Incorporates the statistics naturally
- References user notes and observations when available
- Mentions photo locations/timing if relevant
- Captures the journey, challenges, and memorable moments
- Is authentic and personal, not generic

Write only based on the information provided. Do not invent details not present in the data."""

        try:
            client = get_gemini_client(api_key)
        except (ValueError, Exception) as e:
            logger.error(f"Failed to get Gemini client: {e}")
            return {"success": False, "error": "AI service not available"}
        
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config={
                "temperature": 0.7,
            }
        )
        
        narrative = response.text if hasattr(response, 'text') else str(response)
        
        return {
            "success": True,
            "narrative": narrative.strip()
        }
        
    except Exception as e:
        logger.error(f"Narrative generation error: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
