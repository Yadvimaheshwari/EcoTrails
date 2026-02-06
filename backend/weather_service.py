"""
Weather service for fetching real-time weather data
"""
import os
import logging
import httpx
from typing import Dict, Any, Optional

logger = logging.getLogger("EcoAtlas.Weather")

class WeatherService:
    """Service for fetching weather data using OpenWeatherMap API"""
    
    def __init__(self):
        self.api_key = os.getenv("OPENWEATHER_API_KEY")
        self.base_url = "https://api.openweathermap.org/data/2.5"
        self.client = httpx.AsyncClient(timeout=10.0)
    
    async def get_current_weather(self, lat: float, lng: float) -> Dict[str, Any]:
        """
        Get current weather for a location
        
        Args:
            lat: Latitude
            lng: Longitude
            
        Returns:
            Dict with weather data
        """
        if not self.api_key:
            logger.warning("OpenWeather API key not configured")
            return {"error": "API_KEY_NOT_CONFIGURED"}
        
        try:
            url = f"{self.base_url}/weather"
            params = {
                "lat": lat,
                "lon": lng,
                "appid": self.api_key,
                "units": "imperial"  # Use Fahrenheit and miles
            }
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            return {
                "success": True,
                "temperature": data.get("main", {}).get("temp"),
                "feels_like": data.get("main", {}).get("feels_like"),
                "humidity": data.get("main", {}).get("humidity"),
                "pressure": data.get("main", {}).get("pressure"),
                "wind_speed": data.get("wind", {}).get("speed"),
                "wind_direction": data.get("wind", {}).get("deg"),
                "description": data.get("weather", [{}])[0].get("description", ""),
                "main": data.get("weather", [{}])[0].get("main", ""),
                "icon": data.get("weather", [{}])[0].get("icon", ""),
                "visibility": data.get("visibility"),
                "clouds": data.get("clouds", {}).get("all", 0),
                "sunrise": data.get("sys", {}).get("sunrise"),
                "sunset": data.get("sys", {}).get("sunset"),
                "timezone": data.get("timezone")
            }
        except httpx.HTTPError as e:
            logger.error(f"Weather API HTTP error: {e}")
            return {"error": "HTTP_ERROR", "message": str(e)}
        except Exception as e:
            logger.error(f"Weather API error: {e}")
            return {"error": "UNKNOWN_ERROR", "message": str(e)}
    
    async def get_forecast(self, lat: float, lng: float, days: int = 5) -> Dict[str, Any]:
        """
        Get weather forecast for a location
        
        Args:
            lat: Latitude
            lng: Longitude
            days: Number of days (up to 5)
            
        Returns:
            Dict with forecast data
        """
        if not self.api_key:
            logger.warning("OpenWeather API key not configured")
            return {"error": "API_KEY_NOT_CONFIGURED"}
        
        try:
            url = f"{self.base_url}/forecast"
            params = {
                "lat": lat,
                "lon": lng,
                "appid": self.api_key,
                "units": "imperial",
                "cnt": days * 8  # 8 forecasts per day
            }
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            forecasts = []
            for item in data.get("list", [])[:days * 8]:
                forecasts.append({
                    "dt": item.get("dt"),
                    "temp": item.get("main", {}).get("temp"),
                    "feels_like": item.get("main", {}).get("feels_like"),
                    "humidity": item.get("main", {}).get("humidity"),
                    "description": item.get("weather", [{}])[0].get("description", ""),
                    "main": item.get("weather", [{}])[0].get("main", ""),
                    "icon": item.get("weather", [{}])[0].get("icon", ""),
                    "wind_speed": item.get("wind", {}).get("speed"),
                    "clouds": item.get("clouds", {}).get("all", 0),
                    "pop": item.get("pop", 0)  # Probability of precipitation
                })
            
            return {
                "success": True,
                "forecasts": forecasts
            }
        except httpx.HTTPError as e:
            logger.error(f"Weather forecast API HTTP error: {e}")
            return {"error": "HTTP_ERROR", "message": str(e)}
        except Exception as e:
            logger.error(f"Weather forecast API error: {e}")
            return {"error": "UNKNOWN_ERROR", "message": str(e)}


# Singleton instance
_weather_service: Optional[WeatherService] = None

def get_weather_service() -> WeatherService:
    """Get or create weather service instance"""
    global _weather_service
    if _weather_service is None:
        _weather_service = WeatherService()
    return _weather_service
