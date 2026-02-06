"""
National Park Service API integration for alerts and information
"""
import os
import logging
import httpx
from typing import Dict, Any, List, Optional

logger = logging.getLogger("EcoAtlas.NPS")

class NPSService:
    """Service for fetching National Park Service data"""
    
    def __init__(self):
        self.api_key = os.getenv("NPS_API_KEY", "demo")  # NPS API has a demo key
        self.base_url = "https://developer.nps.gov/api/v1"
        self.client = httpx.AsyncClient(timeout=10.0)
    
    async def search_parks(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search for parks by name
        
        Args:
            query: Park name or search term
            limit: Maximum number of results
            
        Returns:
            List of park data
        """
        try:
            url = f"{self.base_url}/parks"
            params = {
                "q": query,
                "limit": limit,
                "api_key": self.api_key
            }
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            parks = []
            for park in data.get("data", []):
                parks.append({
                    "id": park.get("parkCode"),
                    "name": park.get("fullName"),
                    "description": park.get("description"),
                    "designation": park.get("designation"),
                    "states": park.get("states"),
                    "lat": park.get("latitude"),
                    "lng": park.get("longitude"),
                    "url": park.get("url"),
                    "directions_url": park.get("directionsUrl")
                })
            
            return parks
        except httpx.HTTPError as e:
            logger.error(f"NPS API HTTP error: {e}")
            return []
        except Exception as e:
            logger.error(f"NPS API error: {e}")
            return []
    
    async def get_park_alerts(self, park_code: str) -> List[Dict[str, Any]]:
        """
        Get alerts for a specific park
        
        Args:
            park_code: NPS park code (e.g., "glac")
            
        Returns:
            List of alert data
        """
        try:
            url = f"{self.base_url}/alerts"
            params = {
                "parkCode": park_code,
                "api_key": self.api_key
            }
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            alerts = []
            for alert in data.get("data", []):
                alerts.append({
                    "id": alert.get("id"),
                    "title": alert.get("title"),
                    "description": alert.get("description"),
                    "category": alert.get("category"),
                    "severity": alert.get("severity"),
                    "url": alert.get("url"),
                    "last_indexed_date": alert.get("lastIndexedDate")
                })
            
            return alerts
        except httpx.HTTPError as e:
            logger.error(f"NPS Alerts API HTTP error: {e}")
            return []
        except Exception as e:
            logger.error(f"NPS Alerts API error: {e}")
            return []
    
    async def get_park_by_name(self, park_name: str) -> Optional[Dict[str, Any]]:
        """
        Get park information by name
        
        Args:
            park_name: Name of the park
            
        Returns:
            Park data or None
        """
        parks = await self.search_parks(park_name, limit=1)
        if parks:
            park = parks[0]
            # Get alerts for this park
            if park.get("id"):
                alerts = await self.get_park_alerts(park["id"])
                park["alerts"] = alerts
            return park
        return None


# Singleton instance
_nps_service: Optional[NPSService] = None

def get_nps_service() -> NPSService:
    """Get or create NPS service instance"""
    global _nps_service
    if _nps_service is None:
        _nps_service = NPSService()
    return _nps_service
