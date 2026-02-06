"""
Google Maps API Service
Provides backend access to Google Maps APIs for geocoding, places, directions, etc.
"""
import os
import logging
from typing import Dict, Any, Optional, List
import httpx
from datetime import datetime

logger = logging.getLogger("EcoAtlas.GoogleMaps")

class GoogleMapsService:
    """Service for interacting with Google Maps APIs"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Google Maps service
        
        Args:
            api_key: Google Maps API key. If not provided, reads from GOOGLE_MAPS_API_KEY or VITE_GOOGLE_MAPS_API_KEY env var
        """
        self.api_key = api_key or os.environ.get("GOOGLE_MAPS_API_KEY") or os.environ.get("VITE_GOOGLE_MAPS_API_KEY")
        if not self.api_key:
            logger.warning("Google Maps API key not found. Some features will be unavailable.")
        self.base_url = "https://maps.googleapis.com/maps/api"
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def geocode(self, address: str) -> Dict[str, Any]:
        """
        Geocode an address to coordinates
        
        Args:
            address: Address string to geocode
            
        Returns:
            Dict with location data including lat, lng, formatted_address, etc.
        """
        if not self.api_key:
            raise ValueError("Google Maps API key not configured")
        
        try:
            url = f"{self.base_url}/geocode/json"
            params = {
                "address": address,
                "key": self.api_key
            }
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") != "OK":
                logger.error(f"Geocoding failed: {data.get('status')} - {data.get('error_message', 'Unknown error')}")
                return {"error": data.get("status"), "message": data.get("error_message")}
            
            results = data.get("results", [])
            if not results:
                return {"error": "NOT_FOUND", "message": "No results found"}
            
            # Return first result
            result = results[0]
            location = result.get("geometry", {}).get("location", {})
            
            return {
                "success": True,
                "lat": location.get("lat"),
                "lng": location.get("lng"),
                "formatted_address": result.get("formatted_address"),
                "place_id": result.get("place_id"),
                "types": result.get("types", []),
                "address_components": result.get("address_components", [])
            }
        except httpx.HTTPError as e:
            logger.error(f"Geocoding HTTP error: {e}")
            return {"error": "HTTP_ERROR", "message": str(e)}
        except Exception as e:
            logger.error(f"Geocoding error: {e}")
            return {"error": "UNKNOWN_ERROR", "message": str(e)}
    
    async def reverse_geocode(self, lat: float, lng: float) -> Dict[str, Any]:
        """
        Reverse geocode coordinates to address
        
        Args:
            lat: Latitude
            lng: Longitude
            
        Returns:
            Dict with address data
        """
        if not self.api_key:
            raise ValueError("Google Maps API key not configured")
        
        try:
            url = f"{self.base_url}/geocode/json"
            params = {
                "latlng": f"{lat},{lng}",
                "key": self.api_key
            }
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") != "OK":
                logger.error(f"Reverse geocoding failed: {data.get('status')}")
                return {"error": data.get("status"), "message": data.get("error_message")}
            
            results = data.get("results", [])
            if not results:
                return {"error": "NOT_FOUND", "message": "No results found"}
            
            # Return first result
            result = results[0]
            
            return {
                "success": True,
                "formatted_address": result.get("formatted_address"),
                "place_id": result.get("place_id"),
                "types": result.get("types", []),
                "address_components": result.get("address_components", [])
            }
        except httpx.HTTPError as e:
            logger.error(f"Reverse geocoding HTTP error: {e}")
            return {"error": "HTTP_ERROR", "message": str(e)}
        except Exception as e:
            logger.error(f"Reverse geocoding error: {e}")
            return {"error": "UNKNOWN_ERROR", "message": str(e)}
    
    async def search_places(
        self, 
        query: str, 
        location: Optional[Dict[str, float]] = None,
        radius: Optional[int] = None,
        type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Search for places using Places API (Text Search)
        
        Args:
            query: Search query
            location: Optional dict with 'lat' and 'lng' for location bias
            radius: Optional radius in meters
            type: Optional place type filter
            
        Returns:
            Dict with places results
        """
        if not self.api_key:
            raise ValueError("Google Maps API key not configured")
        
        try:
            url = f"{self.base_url}/place/textsearch/json"
            params = {
                "query": query,
                "key": self.api_key
            }
            
            if location:
                # Validate location is a dict with lat and lng
                if not isinstance(location, dict):
                    logger.warning(f"Invalid location parameter type: {type(location)}, expected dict")
                    location = None
                elif 'lat' not in location or 'lng' not in location:
                    logger.warning(f"Invalid location parameter: missing 'lat' or 'lng' keys")
                    location = None
                else:
                    params["location"] = f"{location['lat']},{location['lng']}"
            if radius:
                params["radius"] = radius
            if type:
                params["type"] = type
            
            logger.debug(f"Google Maps API request: {url} with params: {params}")
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            logger.debug(f"Google Maps API response status: {data.get('status')}")
            if data.get("status") != "OK":
                error_msg = data.get("error_message", "Unknown error")
                logger.error(f"Places search failed: {data.get('status')} - {error_msg}")
                return {"error": data.get("status"), "message": error_msg, "success": False}
            
            results = data.get("results", [])
            
            places = []
            for result in results:
                location = result.get("geometry", {}).get("location", {})
                places.append({
                    "place_id": result.get("place_id"),
                    "name": result.get("name"),
                    "formatted_address": result.get("formatted_address"),
                    "lat": location.get("lat"),
                    "lng": location.get("lng"),
                    "rating": result.get("rating"),
                    "user_ratings_total": result.get("user_ratings_total"),
                    "types": result.get("types", []),
                    "photos": result.get("photos", [])[:3]  # Limit to 3 photos
                })
            
            return {
                "success": True,
                "places": places,
                "count": len(places)
            }
        except httpx.HTTPError as e:
            logger.error(f"Places search HTTP error: {e}")
            return {"error": "HTTP_ERROR", "message": str(e)}
        except Exception as e:
            logger.error(f"Places search error: {e}")
            return {"error": "UNKNOWN_ERROR", "message": str(e)}
    
    async def get_place_details(self, place_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a place
        
        Args:
            place_id: Google Places place_id
            
        Returns:
            Dict with place details
        """
        if not self.api_key:
            raise ValueError("Google Maps API key not configured")
        
        try:
            url = f"{self.base_url}/place/details/json"
            # Use minimal required fields to avoid INVALID_REQUEST errors
            params = {
                "place_id": place_id,
                "fields": "name,formatted_address,geometry,rating,user_ratings_total,types,photos,reviews",
                "key": self.api_key
            }
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") != "OK":
                error_msg = data.get("error_message", "Unknown error")
                logger.error(f"Place details failed: {data.get('status')} - {error_msg}")
                # Return error but don't raise - let caller handle gracefully
                return {"error": data.get("status"), "message": error_msg, "success": False}
            
            result = data.get("result", {})
            location = result.get("geometry", {}).get("location", {})
            
            # Note: Google Maps Place Details API doesn't return place_id in the result
            # We use the place_id parameter that was passed to this function
            return {
                "success": True,
                "place_id": place_id,  # Use the parameter, not result.get("place_id") which is None
                "name": result.get("name"),
                "formatted_address": result.get("formatted_address"),
                "lat": location.get("lat"),
                "lng": location.get("lng"),
                "rating": result.get("rating"),
                "user_ratings_total": result.get("user_ratings_total"),
                "types": result.get("types", []),
                "photos": result.get("photos", []),
                "reviews": result.get("reviews", [])[:5],  # Limit to 5 reviews
                "opening_hours": result.get("opening_hours", {}),
                "website": result.get("website"),
                "phone_number": result.get("phone_number")
            }
        except httpx.HTTPError as e:
            logger.error(f"Place details HTTP error: {e}")
            return {"error": "HTTP_ERROR", "message": str(e)}
        except Exception as e:
            logger.error(f"Place details error: {e}")
            return {"error": "UNKNOWN_ERROR", "message": str(e)}
    
    async def get_directions(
        self,
        origin: str,
        destination: str,
        mode: str = "walking",
        waypoints: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Get directions between two points
        
        Args:
            origin: Origin address or "lat,lng"
            destination: Destination address or "lat,lng"
            mode: Travel mode (driving, walking, bicycling, transit)
            waypoints: Optional list of waypoints
            
        Returns:
            Dict with route information
        """
        if not self.api_key:
            raise ValueError("Google Maps API key not configured")
        
        try:
            url = f"{self.base_url}/directions/json"
            params = {
                "origin": origin,
                "destination": destination,
                "mode": mode,
                "key": self.api_key
            }
            
            if waypoints:
                params["waypoints"] = "|".join(waypoints)
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") != "OK":
                logger.error(f"Directions failed: {data.get('status')}")
                return {"error": data.get("status"), "message": data.get("error_message")}
            
            routes = data.get("routes", [])
            if not routes:
                return {"error": "NOT_FOUND", "message": "No routes found"}
            
            route = routes[0]
            leg = route.get("legs", [{}])[0]
            
            return {
                "success": True,
                "distance": leg.get("distance", {}).get("value"),  # in meters
                "distance_text": leg.get("distance", {}).get("text"),
                "duration": leg.get("duration", {}).get("value"),  # in seconds
                "duration_text": leg.get("duration", {}).get("text"),
                "start_address": leg.get("start_address"),
                "end_address": leg.get("end_address"),
                "steps": leg.get("steps", []),
                "polyline": route.get("overview_polyline", {}).get("points")
            }
        except httpx.HTTPError as e:
            logger.error(f"Directions HTTP error: {e}")
            return {"error": "HTTP_ERROR", "message": str(e)}
        except Exception as e:
            logger.error(f"Directions error: {e}")
            return {"error": "UNKNOWN_ERROR", "message": str(e)}
    
    async def get_distance_matrix(
        self,
        origins: List[str],
        destinations: List[str],
        mode: str = "walking"
    ) -> Dict[str, Any]:
        """
        Get distance and duration matrix between multiple origins and destinations
        
        Args:
            origins: List of origin addresses or "lat,lng"
            destinations: List of destination addresses or "lat,lng"
            mode: Travel mode
            
        Returns:
            Dict with distance matrix
        """
        if not self.api_key:
            raise ValueError("Google Maps API key not configured")
        
        try:
            url = f"{self.base_url}/distancematrix/json"
            params = {
                "origins": "|".join(origins),
                "destinations": "|".join(destinations),
                "mode": mode,
                "key": self.api_key
            }
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") != "OK":
                logger.error(f"Distance matrix failed: {data.get('status')}")
                return {"error": data.get("status"), "message": data.get("error_message")}
            
            rows = data.get("rows", [])
            matrix = []
            for row in rows:
                elements = row.get("elements", [])
                row_data = []
                for element in elements:
                    row_data.append({
                        "distance": element.get("distance", {}).get("value"),
                        "distance_text": element.get("distance", {}).get("text"),
                        "duration": element.get("duration", {}).get("value"),
                        "duration_text": element.get("duration", {}).get("text"),
                        "status": element.get("status")
                    })
                matrix.append(row_data)
            
            return {
                "success": True,
                "matrix": matrix,
                "origin_addresses": data.get("origin_addresses", []),
                "destination_addresses": data.get("destination_addresses", [])
            }
        except httpx.HTTPError as e:
            logger.error(f"Distance matrix HTTP error: {e}")
            return {"error": "HTTP_ERROR", "message": str(e)}
        except Exception as e:
            logger.error(f"Distance matrix error: {e}")
            return {"error": "UNKNOWN_ERROR", "message": str(e)}
    
    async def nearby_search(
        self,
        location: Dict[str, float],
        radius: int = 1000,
        type: Optional[str] = None,
        keyword: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Search for places near a location
        
        Args:
            location: Dict with 'lat' and 'lng'
            radius: Search radius in meters (max 50000)
            type: Optional place type filter
            keyword: Optional keyword search
            
        Returns:
            Dict with nearby places
        """
        if not self.api_key:
            raise ValueError("Google Maps API key not configured")
        
        try:
            # Validate location parameter
            if not isinstance(location, dict) or 'lat' not in location or 'lng' not in location:
                raise ValueError(f"Invalid location parameter: expected dict with 'lat' and 'lng', got {type(location)}")
            
            url = f"{self.base_url}/place/nearbysearch/json"
            params = {
                "location": f"{location['lat']},{location['lng']}",
                "radius": min(radius, 50000),  # Cap at 50km
                "key": self.api_key
            }
            
            if type:
                params["type"] = type
            if keyword:
                params["keyword"] = keyword
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") != "OK":
                logger.error(f"Nearby search failed: {data.get('status')}")
                return {"error": data.get("status"), "message": data.get("error_message")}
            
            results = data.get("results", [])
            
            places = []
            for result in results:
                loc = result.get("geometry", {}).get("location", {})
                places.append({
                    "place_id": result.get("place_id"),
                    "name": result.get("name"),
                    "vicinity": result.get("vicinity"),
                    "lat": loc.get("lat"),
                    "lng": loc.get("lng"),
                    "rating": result.get("rating"),
                    "user_ratings_total": result.get("user_ratings_total"),
                    "types": result.get("types", []),
                    "price_level": result.get("price_level")
                })
            
            return {
                "success": True,
                "places": places,
                "count": len(places)
            }
        except httpx.HTTPError as e:
            logger.error(f"Nearby search HTTP error: {e}")
            return {"error": "HTTP_ERROR", "message": str(e)}
        except Exception as e:
            logger.error(f"Nearby search error: {e}")
            return {"error": "UNKNOWN_ERROR", "message": str(e)}
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Global instance (lazy initialization)
_google_maps_service: Optional[GoogleMapsService] = None

def get_google_maps_service() -> GoogleMapsService:
    """Get or create the global Google Maps service instance"""
    global _google_maps_service
    if _google_maps_service is None:
        _google_maps_service = GoogleMapsService()
    return _google_maps_service
