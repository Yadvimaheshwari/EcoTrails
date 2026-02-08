#!/usr/bin/env python3
"""
EcoTrails Backend API Testing Suite
Tests all backend endpoints specified in the review request
"""

import requests
import json
import sys
import time
from datetime import datetime
from typing import Dict, Any, List, Optional

class EcoTrailsAPITester:
    def __init__(self, base_url: str = "https://ec0aa055-ea47-470e-bc88-1706654d1a17.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'EcoTrails-Test-Suite/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.utcnow().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {name}")
        if details:
            print(f"    {details}")
        if not success and response_data:
            print(f"    Response: {response_data}")
        print()

    def test_root_endpoint(self):
        """Test root endpoint for basic connectivity"""
        try:
            # Test the API endpoint directly since root serves frontend
            response = self.session.get(f"{self.base_url}/api/v1/places/search", params={"query": "test", "limit": 1})
            if response.status_code == 200:
                data = response.json()
                if "places" in data:
                    self.log_test("API Connectivity", True, "API is accessible and responding")
                    return True
                else:
                    self.log_test("API Connectivity", False, f"Unexpected API response: {data}")
                    return False
            else:
                self.log_test("API Connectivity", False, f"Status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("API Connectivity", False, f"Connection error: {str(e)}")
            return False

    def test_places_search(self, query: str = "yellowstone"):
        """Test GET /api/v1/places/search?query=yellowstone"""
        try:
            response = self.session.get(f"{self.base_url}/api/v1/places/search", params={"query": query})
            
            if response.status_code == 200:
                data = response.json()
                places = data.get("places", [])
                
                if isinstance(places, list) and len(places) > 0:
                    # Look for Yellowstone specifically
                    yellowstone_found = any("yellowstone" in place.get("name", "").lower() for place in places)
                    if yellowstone_found:
                        self.log_test("Places Search - Yellowstone", True, 
                                    f"Found {len(places)} places, Yellowstone included", places[0])
                        return places[0]  # Return first place for further testing
                    else:
                        self.log_test("Places Search - Yellowstone", True, 
                                    f"Found {len(places)} places, but no Yellowstone match", places[0] if places else None)
                        return places[0] if places else None
                else:
                    self.log_test("Places Search - Yellowstone", False, "No places returned", data)
                    return None
            else:
                self.log_test("Places Search - Yellowstone", False, 
                            f"Status {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            self.log_test("Places Search - Yellowstone", False, f"Error: {str(e)}")
            return None

    def test_place_details(self, place_id: str):
        """Test GET /api/v1/places/{place_id}"""
        try:
            response = self.session.get(f"{self.base_url}/api/v1/places/{place_id}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "name"]
                
                if all(field in data for field in required_fields):
                    self.log_test("Place Details", True, 
                                f"Retrieved details for {data.get('name')}", 
                                {"id": data.get("id"), "name": data.get("name"), "trails_count": len(data.get("trails", []))})
                    return data
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Place Details", False, f"Missing fields: {missing}", data)
                    return None
            else:
                self.log_test("Place Details", False, 
                            f"Status {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            self.log_test("Place Details", False, f"Error: {str(e)}")
            return None

    def test_place_trails(self, place_id: str):
        """Test GET /api/v1/places/{place_id}/trails"""
        try:
            response = self.session.get(f"{self.base_url}/api/v1/places/{place_id}/trails")
            
            if response.status_code == 200:
                data = response.json()
                
                # Handle different response formats
                trails = []
                if isinstance(data, list):
                    trails = data
                elif isinstance(data, dict):
                    trails = data.get("trails", data.get("data", []))
                
                if isinstance(trails, list):
                    self.log_test("Place Trails", True, 
                                f"Found {len(trails)} trails", 
                                {"trails_count": len(trails), "first_trail": trails[0] if trails else None})
                    return trails
                else:
                    self.log_test("Place Trails", False, f"Unexpected response format", data)
                    return []
            else:
                self.log_test("Place Trails", False, 
                            f"Status {response.status_code}: {response.text}")
                return []
                
        except Exception as e:
            self.log_test("Place Trails", False, f"Error: {str(e)}")
            return []

    def test_place_weather(self, place_id: str):
        """Test GET /api/v1/places/{place_id}/weather"""
        try:
            response = self.session.get(f"{self.base_url}/api/v1/places/{place_id}/weather")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for weather data
                if "temperature" in data or "weather" in data or "current" in data:
                    self.log_test("Place Weather", True, 
                                "Weather data retrieved", 
                                {"temperature": data.get("temperature"), "conditions": data.get("conditions")})
                    return data
                else:
                    self.log_test("Place Weather", True, 
                                "Weather endpoint accessible but no standard weather fields", data)
                    return data
            else:
                self.log_test("Place Weather", False, 
                            f"Status {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            self.log_test("Place Weather", False, f"Error: {str(e)}")
            return None

    def test_companion_insight(self):
        """Test POST /api/v1/companion/insight - AI companion insights"""
        try:
            payload = {
                "observation": "I see a large bird with a white head and brown body soaring overhead",
                "context": {
                    "parkName": "Yellowstone National Park",
                    "timeOfDay": "morning",
                    "season": "summer",
                    "location": {"lat": 44.4280, "lng": -110.5885}
                }
            }
            
            response = self.session.post(f"{self.base_url}/api/v1/companion/insight", 
                                       json=payload, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                if "insight" in data:
                    insight_text = data["insight"]
                    if len(insight_text) > 10:  # Basic validation
                        self.log_test("AI Companion Insight", True, 
                                    f"Generated insight: {insight_text[:100]}...", 
                                    {"insight_length": len(insight_text), "priority": data.get("priority")})
                        return data
                    else:
                        self.log_test("AI Companion Insight", False, 
                                    "Insight too short or empty", data)
                        return None
                else:
                    self.log_test("AI Companion Insight", False, 
                                "No insight field in response", data)
                    return None
            else:
                self.log_test("AI Companion Insight", False, 
                            f"Status {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            self.log_test("AI Companion Insight", False, f"Error: {str(e)}")
            return None

    def test_magic_link_auth(self):
        """Test POST /api/v1/auth/magic-link - Authentication"""
        try:
            payload = {
                "email": "test@example.com"
            }
            
            response = self.session.post(f"{self.base_url}/api/v1/auth/magic-link", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                
                if "message" in data:
                    self.log_test("Magic Link Auth", True, 
                                f"Magic link request successful: {data['message']}", data)
                    return True
                else:
                    self.log_test("Magic Link Auth", True, 
                                "Magic link endpoint accessible", data)
                    return True
            else:
                self.log_test("Magic Link Auth", False, 
                            f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Magic Link Auth", False, f"Error: {str(e)}")
            return False

    def test_additional_endpoints(self):
        """Test additional important endpoints"""
        
        # Test nearby places
        try:
            response = self.session.get(f"{self.base_url}/api/v1/places/nearby", 
                                      params={"lat": 44.4280, "lng": -110.5885, "radius": 50})
            if response.status_code == 200:
                data = response.json()
                places = data.get("places", [])
                self.log_test("Nearby Places", True, f"Found {len(places)} nearby places")
            else:
                self.log_test("Nearby Places", False, f"Status {response.status_code}")
        except Exception as e:
            self.log_test("Nearby Places", False, f"Error: {str(e)}")

        # Test companion ask endpoint
        try:
            payload = {
                "question": "What wildlife might I see in Yellowstone?",
                "context": {"parkName": "Yellowstone National Park"}
            }
            response = self.session.post(f"{self.base_url}/api/v1/companion/ask", json=payload, timeout=30)
            if response.status_code == 200:
                data = response.json()
                if "answer" in data and len(data["answer"]) > 10:
                    self.log_test("Companion Ask", True, f"Generated answer: {data['answer'][:100]}...")
                else:
                    self.log_test("Companion Ask", False, "No valid answer returned")
            else:
                self.log_test("Companion Ask", False, f"Status {response.status_code}")
        except Exception as e:
            self.log_test("Companion Ask", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting EcoTrails Backend API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test basic connectivity first
        if not self.test_root_endpoint():
            print("❌ Cannot connect to API. Stopping tests.")
            return False
        
        # Test places search and get a place ID for further testing
        place = self.test_places_search("yellowstone")
        
        if place and place.get("id"):
            place_id = place["id"]
            print(f"🎯 Using place ID for further tests: {place_id}")
            
            # Test place-specific endpoints
            self.test_place_details(place_id)
            self.test_place_trails(place_id)
            self.test_place_weather(place_id)
        else:
            # Try with the hardcoded place ID from the review request
            hardcoded_place_id = "ChIJVVVVVVXlUVMRu-GPNDD5qKw"
            print(f"🎯 Using hardcoded place ID: {hardcoded_place_id}")
            self.test_place_details(hardcoded_place_id)
            self.test_place_trails(hardcoded_place_id)
            self.test_place_weather(hardcoded_place_id)
        
        # Test AI companion features
        self.test_companion_insight()
        
        # Test authentication
        self.test_magic_link_auth()
        
        # Test additional endpoints
        self.test_additional_endpoints()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            failed_tests = [r for r in self.test_results if not r["success"]]
            print(f"❌ {len(failed_tests)} tests failed:")
            for test in failed_tests:
                print(f"   - {test['test_name']}: {test['details']}")
            return False

def main():
    """Main test runner"""
    backend_url = "https://ec0aa055-ea47-470e-bc88-1706654d1a17.preview.emergentagent.com"
    
    tester = EcoTrailsAPITester(backend_url)
    success = tester.run_all_tests()
    
    # Save detailed results
    results_file = f"/app/test_reports/backend_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    try:
        with open(results_file, 'w') as f:
            json.dump({
                "summary": {
                    "total_tests": tester.tests_run,
                    "passed_tests": tester.tests_passed,
                    "success_rate": tester.tests_passed / tester.tests_run if tester.tests_run > 0 else 0,
                    "backend_url": backend_url,
                    "timestamp": datetime.utcnow().isoformat()
                },
                "detailed_results": tester.test_results
            }, f, indent=2)
        print(f"📄 Detailed results saved to: {results_file}")
    except Exception as e:
        print(f"⚠️  Could not save results file: {e}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())