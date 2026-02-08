"""
Places and trails service
"""
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from backend.models import Place, Trail
from backend.google_maps_service import get_google_maps_service

logger = logging.getLogger("EcoAtlas.Places")


async def search_places(query: str, db: Session, limit: int = 20) -> List[Dict[str, Any]]:
    """Search for places - tries database first, then Google Maps if needed"""
    results = []
    
    try:
        # First, try database search
        db_places = db.query(Place).filter(
            or_(
                Place.name.ilike(f"%{query}%"),
                Place.description.ilike(f"%{query}%")
            )
        ).limit(limit).all()
        
        results = [{
            "id": p.id,
            "name": p.name,
            "place_type": p.place_type,
            "location": p.location,
            "description": p.description,
            "metadata": p.meta_data
        } for p in db_places]
        
        # If database has results, return them
        if results:
            return results
        
        # If database is empty, try Google Maps as fallback
        logger.info(f"No database results for '{query}', trying Google Maps...")
        maps_service = get_google_maps_service()
        if maps_service.api_key:
            try:
                # Call Google Maps search_places (not nearby_search)
                maps_result = await maps_service.search_places(
                    query=query,
                    location=None,  # No location bias for text search
                    radius=None,
                    type=None
                )
                
                logger.info(f"Google Maps result type: {type(maps_result)}, keys: {maps_result.keys() if isinstance(maps_result, dict) else 'N/A'}")
                
                # CRITICAL SAFEGUARD: Ensure results is still a list
                if not isinstance(results, list):
                    logger.error(f"CRITICAL: results became non-list before Google Maps processing! Type: {type(results)}")
                    results = []
                
                if maps_result.get("success"):
                    maps_places = maps_result.get("places", [])
                    logger.info(f"Google Maps returned {len(maps_places)} places, type: {type(maps_places)}")
                    # Ensure maps_places is a list
                    if not isinstance(maps_places, list):
                        logger.error(f"Google Maps places is not a list: {type(maps_places)}")
                        maps_places = []
                    # Convert Google Maps format to our format and auto-save to database
                    logger.info(f"Before conversion: results length = {len(results)}, results type = {type(results)}")
                    for place in maps_places[:limit]:
                        if not isinstance(place, dict):
                            logger.warning(f"Skipping invalid place: {type(place)}")
                            continue
                        
                        place_id = place.get("place_id")
                        # Skip if place_id is missing (required for database)
                        if not place_id:
                            logger.warning(f"Skipping place without place_id: {place.get('name', 'Unknown')}")
                            continue
                        
                        place_data = {
                            "id": place_id,  # Use Google place_id as id
                            "name": place.get("name"),
                            "place_type": place.get("types", [""])[0] if place.get("types") else "park",
                            "location": {
                                "lat": place.get("lat"),
                                "lng": place.get("lng")
                            },
                            "description": place.get("formatted_address", ""),
                            "metadata": {
                                "rating": place.get("rating"),
                                "user_ratings_total": place.get("user_ratings_total"),
                                "google_place_id": place_id
                            }
                        }
                        results.append(place_data)
                        
                        # AUTO-SAVE: Save place to database for future searches
                        try:
                            existing_place = db.query(Place).filter(Place.id == place_id).first()
                            if not existing_place:
                                new_place = Place(
                                    id=place_id,
                                    name=place.get("name", "Unknown Place"),
                                    place_type=place.get("types", [""])[0] if place.get("types") else "park",
                                    location={
                                        "lat": place.get("lat"),
                                        "lng": place.get("lng")
                                    },
                                    description=place.get("formatted_address", ""),
                                    meta_data={
                                        "rating": place.get("rating"),
                                        "user_ratings_total": place.get("user_ratings_total"),
                                        "google_place_id": place_id,
                                        "source": "google_maps_search",
                                        "photos": place.get("photos", []),
                                        "types": place.get("types", [])
                                    }
                                )
                                db.add(new_place)
                                logger.debug(f"Auto-saving place {place_id} to database from search")
                        except Exception as save_error:
                            # If save fails (e.g., duplicate), just continue
                            logger.debug(f"Could not auto-save place {place_id}: {save_error}")
                    
                    # Commit all saved places at once
                    try:
                        db.commit()
                        logger.info(f"Auto-saved {len(results)} places from search to database")
                    except Exception as commit_error:
                        logger.warning(f"Could not commit saved places: {commit_error}")
                        db.rollback()
                    
                    logger.info(f"After conversion: results length = {len(results)}, results type = {type(results)}")
                    logger.info(f"Converted {len(results)} places from Google Maps")
                    
                    # FINAL CHECK: Ensure results is still a list after conversion
                    if not isinstance(results, list):
                        logger.error(f"CRITICAL: results became non-list after conversion! Type: {type(results)}")
                        # If somehow results got corrupted, extract from maps_result
                        if isinstance(maps_result, dict) and 'places' in maps_result:
                            logger.warning("Emergency: Extracting places from maps_result")
                            results = []
                            for place in maps_result.get('places', [])[:limit]:
                                if isinstance(place, dict):
                                    results.append({
                                        "id": place.get("place_id"),
                                        "name": place.get("name"),
                                        "place_type": place.get("types", [""])[0] if place.get("types") else "park",
                                        "location": {"lat": place.get("lat"), "lng": place.get("lng")},
                                        "description": place.get("formatted_address", ""),
                                        "metadata": {
                                            "rating": place.get("rating"),
                                            "user_ratings_total": place.get("user_ratings_total"),
                                            "google_place_id": place.get("place_id")
                                        }
                                    })
                        else:
                            results = []
                else:
                    error = maps_result.get("error", "UNKNOWN")
                    error_msg = maps_result.get("message", "")
                    logger.error(f"Google Maps search failed: {error} - {error_msg}")
                    if error == "REQUEST_DENIED":
                        logger.error("Google Maps API REQUEST_DENIED - check API key permissions and billing")
                    # Don't fail completely, just log the error and return empty results
            except Exception as e:
                logger.error(f"Error calling Google Maps: {e}")
        else:
            logger.info("Google Maps API key not configured, skipping external search")
        
        # CRITICAL: Ensure results is always a list before returning
        if not isinstance(results, list):
            logger.error(f"ERROR: results is not a list! Type: {type(results)}")
            logger.error(f"Results value: {results}")
            # Emergency fix: if it's a dict, try to extract places
            if isinstance(results, dict):
                if 'places' in results:
                    logger.warning("Extracting 'places' from dict")
                    results = results.get('places', [])
                else:
                    logger.error("Dict doesn't have 'places' key, returning empty list")
                    results = []
            else:
                logger.error(f"Unknown type {type(results)}, returning empty list")
                results = []
        
        logger.info(f"search_places returning {len(results)} results for query '{query}' (type: {type(results)})")
        return results
    except Exception as e:
        logger.error(f"Error searching places: {e}", exc_info=True)
        # Always return a list, even on error
        if isinstance(results, list):
            return results
        return []


async def get_place_details(place_id: str, db: Session) -> Optional[Dict[str, Any]]:
    """Get place details with trails - tries database first, then Google Maps if needed"""
    try:
        # First, try database
        place = db.query(Place).filter(Place.id == place_id).first()
        if place:
            trails = db.query(Trail).filter(Trail.place_id == place_id).all()
            
            # Extract metadata and ensure photos/types are accessible
            metadata = place.meta_data or {}
            
            return {
                "id": place.id,
                "name": place.name,
                "place_type": place.place_type,
                "location": place.location,
                "description": place.description,
                "metadata": metadata,
                "photos": metadata.get("photos", []),  # Include at top level for easy access
                "types": metadata.get("types", []),  # Include at top level
                "rating": metadata.get("rating"),  # Include at top level
                "user_ratings_total": metadata.get("user_ratings_total"),  # Include at top level
                "trails": [{
                    "id": t.id,
                    "name": t.name,
                    "difficulty": t.difficulty,
                    "distance_miles": t.distance_miles,
                    "elevation_gain_feet": t.elevation_gain_feet,
                    "estimated_duration_minutes": t.estimated_duration_minutes,
                    "description": t.description
                } for t in trails]
            }
        
        # If not in database, try Google Maps (for Google place_id)
        logger.info(f"Place {place_id} not in database, trying Google Maps Place Details API...")
        maps_service = get_google_maps_service()
        if maps_service.api_key:
            try:
                maps_result = await maps_service.get_place_details(place_id)
                if maps_result.get("success"):
                    # Use the place_id parameter (we already have it) instead of relying on response
                    # The response might not always include place_id, but we passed it in
                    result_place_id = maps_result.get("place_id") or place_id
                    
                    # Convert Google Maps format to our format
                    place_data = {
                        "id": result_place_id,
                        "name": maps_result.get("name"),
                        "place_type": maps_result.get("types", [""])[0] if maps_result.get("types") else "park",
                        "location": {
                            "lat": maps_result.get("lat"),
                            "lng": maps_result.get("lng")
                        },
                        "description": maps_result.get("formatted_address", ""),
                        "metadata": {
                            "rating": maps_result.get("rating"),
                            "user_ratings_total": maps_result.get("user_ratings_total"),
                            "google_place_id": result_place_id,
                            "photos": maps_result.get("photos", []),
                            "types": maps_result.get("types", []),
                            "website": maps_result.get("website"),
                            "phone_number": maps_result.get("phone_number"),
                            "opening_hours": maps_result.get("opening_hours"),
                            "reviews": maps_result.get("reviews", [])
                        },
                        "photos": maps_result.get("photos", []),  # Also include at top level for easy access
                        "types": maps_result.get("types", []),  # Also include at top level
                        "rating": maps_result.get("rating"),  # Also include at top level
                        "user_ratings_total": maps_result.get("user_ratings_total"),  # Also include at top level
                        "trails": []  # Google Maps doesn't provide trails
                    }
                    
                    # AUTO-SAVE: Save place to database for future use
                    try:
                        # Check if place already exists - use the place_id parameter
                        existing_place = db.query(Place).filter(Place.id == place_id).first()
                        if not existing_place:
                            # Ensure we have a valid place_id before saving
                            if not place_id:
                                logger.error("Cannot save place: place_id is None or empty")
                            else:
                                new_place = Place(
                                    id=place_id,  # Use the place_id parameter (guaranteed to exist)
                                    name=maps_result.get("name", "Unknown Place"),
                                    place_type=maps_result.get("types", [""])[0] if maps_result.get("types") else "park",
                                    location={
                                        "lat": maps_result.get("lat"),
                                        "lng": maps_result.get("lng")
                                    },
                                    description=maps_result.get("formatted_address", ""),
                                    meta_data={
                                        "rating": maps_result.get("rating"),
                                        "user_ratings_total": maps_result.get("user_ratings_total"),
                                        "google_place_id": place_id,
                                        "source": "google_maps_details",
                                        "photos": maps_result.get("photos", []),
                                        "types": maps_result.get("types", []),
                                        "website": maps_result.get("website"),
                                        "phone_number": maps_result.get("phone_number"),
                                        "opening_hours": maps_result.get("opening_hours"),
                                        "reviews": maps_result.get("reviews", [])
                                    }
                                )
                                db.add(new_place)
                                db.commit()
                                logger.info(f"Auto-saved place {place_id} to database from Place Details API")
                        else:
                            logger.debug(f"Place {place_id} already exists in database")
                    except Exception as save_error:
                        # If save fails, just log and continue - don't break the flow
                        logger.warning(f"Could not save place to database: {save_error}")
                        try:
                            db.rollback()
                        except:
                            pass
                    
                    return place_data
                else:
                    error = maps_result.get("error", "UNKNOWN")
                    error_msg = maps_result.get("message", "")
                    logger.warning(f"Google Maps Place Details API failed: {error} - {error_msg}")
                    # Fallback: Try to find place in database (might have been saved from search)
                    logger.info(f"Trying to find place {place_id} in database as fallback...")
                    fallback_place = db.query(Place).filter(Place.id == place_id).first()
                    if fallback_place:
                        logger.info(f"Found place {place_id} in database (was saved from search)")
                        trails = db.query(Trail).filter(Trail.place_id == place_id).all()
                        return {
                            "id": fallback_place.id,
                            "name": fallback_place.name,
                            "place_type": fallback_place.place_type,
                            "location": fallback_place.location,
                            "description": fallback_place.description,
                            "metadata": fallback_place.meta_data,
                            "trails": [{
                                "id": t.id,
                                "name": t.name,
                                "difficulty": t.difficulty,
                                "distance_miles": t.distance_miles,
                                "elevation_gain_feet": t.elevation_gain_feet,
                                "estimated_duration_minutes": t.estimated_duration_minutes,
                                "description": t.description
                            } for t in trails]
                        }
            except Exception as e:
                logger.error(f"Error fetching from Google Maps: {e}", exc_info=True)
                # Try database fallback
                fallback_place = db.query(Place).filter(Place.id == place_id).first()
                if fallback_place:
                    logger.info(f"Found place {place_id} in database after Google Maps error")
                    trails = db.query(Trail).filter(Trail.place_id == place_id).all()
                    return {
                        "id": fallback_place.id,
                        "name": fallback_place.name,
                        "place_type": fallback_place.place_type,
                        "location": fallback_place.location,
                        "description": fallback_place.description,
                        "metadata": fallback_place.meta_data,
                        "trails": [{
                            "id": t.id,
                            "name": t.name,
                            "difficulty": t.difficulty,
                            "distance_miles": t.distance_miles,
                            "elevation_gain_feet": t.elevation_gain_feet,
                            "estimated_duration_minutes": t.estimated_duration_minutes,
                            "description": t.description
                        } for t in trails]
                    }
        
        # If all methods fail, return None
        return None
    except Exception as e:
        logger.error(f"Error getting place details: {e}", exc_info=True)
        return None


async def get_nearby_places(lat: float, lng: float, radius: int = 5000, db: Session = None) -> List[Dict[str, Any]]:
    """Get nearby places using Google Maps or database.
    
    Uses multiple search strategies to maximise results:
    1. Google Maps Nearby Search with type=park
    2. Google Maps Nearby Search with keyword='state park OR national park'
    3. Google Maps Text Search for 'parks near <lat>,<lng>'
    4. Database fallback
    """
    all_places: Dict[str, Dict[str, Any]] = {}  # keyed by place_id to deduplicate

    try:
        maps_service = get_google_maps_service()
        if maps_service.api_key:
            # Strategy 1: type-based nearby search
            result = await maps_service.nearby_search(
                location={"lat": lat, "lng": lng},
                radius=radius,
                type="park"
            )
            if result.get("success"):
                for p in result.get("places", []):
                    pid = p.get("place_id")
                    if pid:
                        all_places[pid] = p

            # Strategy 2: keyword-based nearby search (catches state/national parks)
            keyword_result = await maps_service.nearby_search(
                location={"lat": lat, "lng": lng},
                radius=radius,
                keyword="state park national park"
            )
            if keyword_result.get("success"):
                for p in keyword_result.get("places", []):
                    pid = p.get("place_id")
                    if pid and pid not in all_places:
                        all_places[pid] = p

            # Strategy 3: text search (broader – picks up parks that have 'park' in name)
            try:
                text_result = await maps_service.search_places(
                    query=f"parks near {lat},{lng}",
                    location={"lat": lat, "lng": lng},
                    radius=radius
                )
                if text_result.get("success"):
                    for p in text_result.get("places", []):
                        pid = p.get("place_id")
                        if pid and pid not in all_places:
                            all_places[pid] = p
            except Exception as text_err:
                logger.debug(f"Text search fallback failed: {text_err}")

        if all_places:
            logger.info(f"get_nearby_places returning {len(all_places)} results for ({lat}, {lng})")
            return list(all_places.values())

        # Fallback to database (if places have location data)
        if db:
            places = db.query(Place).filter(Place.location.isnot(None)).limit(20).all()
            return [{
                "id": p.id,
                "name": p.name,
                "place_type": p.place_type,
                "location": p.location,
                "description": p.description
            } for p in places]

        return []
    except Exception as e:
        logger.error(f"Error getting nearby places: {e}")
        return []


async def search_trails(query: str, db: Session, limit: int = 20) -> List[Dict[str, Any]]:
    """Search for trails"""
    try:
        trails = db.query(Trail).filter(
            or_(
                Trail.name.ilike(f"%{query}%"),
                Trail.description.ilike(f"%{query}%")
            )
        ).limit(limit).all()
        
        return [{
            "id": t.id,
            "place_id": t.place_id,
            "name": t.name,
            "difficulty": t.difficulty,
            "distance_miles": t.distance_miles,
            "elevation_gain_feet": t.elevation_gain_feet,
            "estimated_duration_minutes": t.estimated_duration_minutes,
            "description": t.description,
            "metadata": t.meta_data
        } for t in trails]
    except Exception as e:
        logger.error(f"Error searching trails: {e}")
        return []


async def get_trail_details(trail_id: str, db: Session) -> Optional[Dict[str, Any]]:
    """Get trail details"""
    try:
        trail = db.query(Trail).filter(Trail.id == trail_id).first()
        if not trail:
            return None
        meta = trail.meta_data or {}
        # Derive best-available coordinates for this trail (trailhead preferred).
        lat = meta.get("trailhead_lat") or meta.get("lat") or meta.get("latitude")
        lng = meta.get("trailhead_lng") or meta.get("lng") or meta.get("longitude")

        # Fallback to place location if needed (still better than a hard-coded city).
        if (lat is None or lng is None) and trail.place_id:
            place = db.query(Place).filter(Place.id == trail.place_id).first()
            if place and isinstance(place.location, dict):
                lat = lat or place.location.get("lat") or place.location.get("latitude")
                lng = lng or place.location.get("lng") or place.location.get("longitude")

        return {
            "id": trail.id,
            "place_id": trail.place_id,
            "name": trail.name,
            "difficulty": trail.difficulty,
            "distance_miles": trail.distance_miles,
            "elevation_gain_feet": trail.elevation_gain_feet,
            "estimated_duration_minutes": trail.estimated_duration_minutes,
            "description": trail.description,
            "metadata": trail.meta_data,
            "lat": lat,
            "lng": lng,
            "bounding_box": meta.get("bounding_box") or meta.get("bounds") or meta.get("bbox"),
        }
    except Exception as e:
        logger.error(f"Error getting trail details: {e}")
        return None
