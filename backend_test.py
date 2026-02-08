#!/usr/bin/env python3
"""
EcoTrails Backend API Testing Suite
Tests all critical endpoints for the hiking companion app
"""

import requests
import json
import sys
import time
from datetime import datetime
from typing import Dict, Any, Optional, List

class EcoTrailsAPITester:
    def __init__(self, base_url: str = "https://ec0aa055-ea47-470e-bc88-1706654d1a17.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.timeout = 30
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.auth_token = None
        
        print(f"🌲 EcoTrails API Tester")
        print(f"📍 Testing backend: {self.base_url}")
        print("=" * 60)

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name}")
        
        if details:
            print(f"   {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })
        print()

    def test_health_check(self) -> bool:
        """Test API health check at root and /api/v1"""
        try:
            # Test root endpoint
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                if "EcoAtlas" in str(data) or "version" in data:
                    self.log_test("Root Health Check (/)", True, f"Status: {response.status_code}, Response: {data}")
                    return True
            
            self.log_test("Root Health Check (/)", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
            return False
            
        except Exception as e:
            self.log_test("Root Health Check (/)", False, f"Error: {str(e)}")
            return False

    def test_magic_link_auth(self) -> bool:
        """Test magic link authentication flow"""
        try:
            # Test magic link request
            test_email = "test@ecotrails.com"
            response = self.session.post(
                f"{self.base_url}/api/v1/auth/magic-link",
                json={"email": test_email},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Magic Link Request", True, f"Status: {response.status_code}, Message: {data.get('message', 'Success')}")
                return True
            else:
                self.log_test("Magic Link Request", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
                return False
                
        except Exception as e:
            self.log_test("Magic Link Request", False, f"Error: {str(e)}")
            return False

    def test_places_search(self) -> Optional[str]:
        """Test places search endpoint"""
        try:
            # Test search for Yellowstone
            response = self.session.get(
                f"{self.base_url}/api/v1/places/search",
                params={"query": "yellowstone", "limit": 5}
            )
            
            if response.status_code == 200:
                data = response.json()
                places = data.get("places", [])
                
                if places and len(places) > 0:
                    first_place = places[0]
                    place_id = first_place.get("id")
                    place_name = first_place.get("name", "Unknown")
                    
                    self.log_test(
                        "Places Search (Yellowstone)", 
                        True, 
                        f"Found {len(places)} places, First: {place_name} (ID: {place_id})"
                    )
                    return place_id
                else:
                    self.log_test("Places Search (Yellowstone)", False, "No places found in response")
                    return None
            else:
                self.log_test("Places Search (Yellowstone)", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
                return None
                
        except Exception as e:
            self.log_test("Places Search (Yellowstone)", False, f"Error: {str(e)}")
            return None

    def test_place_weather(self, place_id: str) -> bool:
        """Test place weather endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/v1/places/{place_id}/weather")
            
            if response.status_code == 200:
                data = response.json()
                temp = data.get("temperature")
                condition = data.get("condition", "Unknown")
                
                self.log_test(
                    f"Place Weather ({place_id})", 
                    True, 
                    f"Temperature: {temp}°F, Condition: {condition}"
                )
                return True
            elif response.status_code == 404:
                self.log_test(f"Place Weather ({place_id})", False, "Weather data not available for this place")
                return False
            else:
                self.log_test(f"Place Weather ({place_id})", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
                return False
                
        except Exception as e:
            self.log_test(f"Place Weather ({place_id})", False, f"Error: {str(e)}")
            return False

    def test_place_trails(self, place_id: str) -> bool:
        """Test place trails endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/v1/places/{place_id}/trails")
            
            if response.status_code == 200:
                data = response.json()
                trails = data.get("trails", [])
                
                if trails and len(trails) > 0:
                    first_trail = trails[0]
                    trail_name = first_trail.get("name", "Unknown")
                    difficulty = first_trail.get("difficulty", "Unknown")
                    
                    self.log_test(
                        f"Place Trails ({place_id})", 
                        True, 
                        f"Found {len(trails)} trails, First: {trail_name} ({difficulty})"
                    )
                    return True
                else:
                    self.log_test(f"Place Trails ({place_id})", True, "No trails found for this place (valid response)")
                    return True
            else:
                self.log_test(f"Place Trails ({place_id})", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
                return False
                
        except Exception as e:
            self.log_test(f"Place Trails ({place_id})", False, f"Error: {str(e)}")
            return False

    def test_google_maps_integration(self) -> bool:
        """Test Google Maps API integration"""
        try:
            # Test geocoding
            response = self.session.get(
                f"{self.base_url}/api/v1/maps/geocode",
                params={"address": "Yellowstone National Park"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("lat") and data.get("lng"):
                    lat, lng = data.get("lat"), data.get("lng")
                    self.log_test(
                        "Google Maps Geocoding", 
                        True, 
                        f"Geocoded Yellowstone to: {lat}, {lng}"
                    )
                    return True
                else:
                    self.log_test("Google Maps Geocoding", False, f"Invalid response format: {data}")
                    return False
            else:
                self.log_test("Google Maps Geocoding", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
                return False
                
        except Exception as e:
            self.log_test("Google Maps Geocoding", False, f"Error: {str(e)}")
            return False

    def test_companion_endpoints(self) -> bool:
        """Test AI companion endpoints"""
        try:
            # Test companion insight endpoint
            test_request = {
                "observation": "I see a large bird flying overhead",
                "context": {
                    "parkName": "Yellowstone National Park",
                    "timeOfDay": "morning",
                    "season": "summer"
                }
            }
            
            response = self.session.post(
                f"{self.base_url}/api/v1/companion/insight",
                json=test_request,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                insight = data.get("insight", "")
                priority = data.get("priority", "unknown")
                
                if insight:
                    self.log_test(
                        "AI Companion Insight", 
                        True, 
                        f"Priority: {priority}, Insight: {insight[:100]}..."
                    )
                    return True
                else:
                    self.log_test("AI Companion Insight", False, "No insight in response")
                    return False
            else:
                self.log_test("AI Companion Insight", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
                return False
                
        except Exception as e:
            self.log_test("AI Companion Insight", False, f"Error: {str(e)}")
            return False

    def test_nearby_places(self) -> bool:
        """Test nearby places endpoint"""
        try:
            # Test with Yellowstone coordinates
            yellowstone_lat, yellowstone_lng = 44.4280, -110.5885
            
            response = self.session.get(
                f"{self.base_url}/api/v1/places/nearby",
                params={
                    "lat": yellowstone_lat,
                    "lng": yellowstone_lng,
                    "radius": 50,  # 50 miles
                    "limit": 10
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                places = data.get("places", [])
                
                self.log_test(
                    "Nearby Places Search", 
                    True, 
                    f"Found {len(places)} places near Yellowstone"
                )
                return True
            else:
                self.log_test("Nearby Places Search", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
                return False
                
        except Exception as e:
            self.log_test("Nearby Places Search", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all backend tests"""
        print("🚀 Starting EcoTrails Backend API Tests\n")
        
        # 1. Health Check
        health_ok = self.test_health_check()
        
        # 2. Magic Link Auth
        auth_ok = self.test_magic_link_auth()
        
        # 3. Places Search (get a place ID for subsequent tests)
        place_id = self.test_places_search()
        
        # 4. Place-specific endpoints (if we have a place ID)
        if place_id:
            self.test_place_weather(place_id)
            self.test_place_trails(place_id)
        
        # 5. Google Maps Integration
        self.test_google_maps_integration()
        
        # 6. AI Companion
        self.test_companion_endpoints()
        
        # 7. Nearby Places
        self.test_nearby_places()
        
        # Summary
        print("=" * 60)
        print(f"📊 Test Summary:")
        print(f"   Total Tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        
        # Determine overall status
        critical_tests = ["Root Health Check (/)", "Places Search (Yellowstone)"]
        critical_passed = sum(1 for result in self.test_results 
                            if result["name"] in critical_tests and result["success"])
        
        overall_success = critical_passed == len(critical_tests) and self.tests_passed >= (self.tests_run * 0.7)
        
        if overall_success:
            print("🎉 Backend API is functioning well!")
        else:
            print("⚠️  Backend API has significant issues that need attention")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": self.tests_passed / self.tests_run * 100 if self.tests_run > 0 else 0,
            "overall_success": overall_success,
            "test_results": self.test_results,
            "critical_issues": [
                result for result in self.test_results 
                if not result["success"] and result["name"] in critical_tests
            ]
        }

def main():
    """Main test execution"""
    tester = EcoTrailsAPITester()
    
    try:
        results = tester.run_all_tests()
        
        # Exit with appropriate code
        if results["overall_success"]:
            sys.exit(0)
        else:
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test suite failed with error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()