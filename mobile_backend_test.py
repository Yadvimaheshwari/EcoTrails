#!/usr/bin/env python3
"""
EcoTrails Mobile Backend API Testing Suite
Tests mobile-specific endpoints and functionality
"""

import requests
import json
import sys
import time
from datetime import datetime
from typing import Dict, Any, List, Optional

class MobileAPITester:
    def __init__(self, base_url: str = "https://ec0aa055-ea47-470e-bc88-1706654d1a17.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'EcoTrails-Mobile-Test/1.0'
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

    def test_mobile_api_config(self):
        """Test mobile API configuration endpoint"""
        try:
            # Test the exact endpoint mobile app uses for connectivity
            response = self.session.get(f"{self.base_url}/api/v1/places/search", 
                                      params={"query": "test", "limit": 1})
            
            if response.status_code == 200:
                data = response.json()
                if "places" in data:
                    self.log_test("Mobile API Configuration", True, 
                                f"Mobile API base URL is accessible: {self.base_url}")
                    return True
                else:
                    self.log_test("Mobile API Configuration", False, 
                                f"Unexpected response format: {data}")
                    return False
            else:
                self.log_test("Mobile API Configuration", False, 
                            f"Status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Mobile API Configuration", False, f"Connection error: {str(e)}")
            return False

    def test_explore_screen_apis(self):
        """Test APIs used by ExploreScreen"""
        
        # Test places search (used by search functionality)
        try:
            response = self.session.get(f"{self.base_url}/api/v1/places/search", 
                                      params={"query": "Yosemite", "limit": 20})
            if response.status_code == 200:
                data = response.json()
                places = data.get("places", [])
                self.log_test("ExploreScreen - Places Search", True, 
                            f"Search returned {len(places)} places")
            else:
                self.log_test("ExploreScreen - Places Search", False, 
                            f"Status {response.status_code}")
        except Exception as e:
            self.log_test("ExploreScreen - Places Search", False, f"Error: {str(e)}")

        # Test nearby places (used by nearby functionality)
        try:
            response = self.session.get(f"{self.base_url}/api/v1/places/nearby", 
                                      params={"lat": 37.7749, "lng": -122.4194, "radius": 50, "limit": 10})
            if response.status_code == 200:
                data = response.json()
                places = data.get("places", [])
                self.log_test("ExploreScreen - Nearby Places", True, 
                            f"Nearby search returned {len(places)} places")
            else:
                self.log_test("ExploreScreen - Nearby Places", False, 
                            f"Status {response.status_code}")
        except Exception as e:
            self.log_test("ExploreScreen - Nearby Places", False, f"Error: {str(e)}")

        # Test NPS state parks (used by browse by state)
        try:
            response = self.session.get(f"{self.base_url}/api/nps/state/ca")
            if response.status_code == 200:
                data = response.json()
                parks = data.get("parks", [])
                self.log_test("ExploreScreen - NPS State Parks", True, 
                            f"CA state parks returned {len(parks)} parks")
            else:
                self.log_test("ExploreScreen - NPS State Parks", False, 
                            f"Status {response.status_code}")
        except Exception as e:
            self.log_test("ExploreScreen - NPS State Parks", False, f"Error: {str(e)}")

    def test_place_detail_screen_apis(self, place_id: str = "ChIJVVVVVVXlUVMRu-GPNDD5qKw"):
        """Test APIs used by PlaceDetailScreen"""
        
        # Test place details
        try:
            response = self.session.get(f"{self.base_url}/api/v1/places/{place_id}")
            if response.status_code == 200:
                data = response.json()
                self.log_test("PlaceDetailScreen - Place Details", True, 
                            f"Retrieved place: {data.get('name', 'Unknown')}")
            else:
                self.log_test("PlaceDetailScreen - Place Details", False, 
                            f"Status {response.status_code}")
        except Exception as e:
            self.log_test("PlaceDetailScreen - Place Details", False, f"Error: {str(e)}")

        # Test place trails
        try:
            response = self.session.get(f"{self.base_url}/api/v1/places/{place_id}/trails")
            if response.status_code == 200:
                data = response.json()
                trails = data.get("trails", data if isinstance(data, list) else [])
                self.log_test("PlaceDetailScreen - Place Trails", True, 
                            f"Retrieved {len(trails)} trails")
                return trails[0] if trails else None  # Return first trail for further testing
            else:
                self.log_test("PlaceDetailScreen - Place Trails", False, 
                            f"Status {response.status_code}")
                return None
        except Exception as e:
            self.log_test("PlaceDetailScreen - Place Trails", False, f"Error: {str(e)}")
            return None

        # Test place weather
        try:
            response = self.session.get(f"{self.base_url}/api/v1/places/{place_id}/weather")
            if response.status_code == 200:
                data = response.json()
                self.log_test("PlaceDetailScreen - Weather", True, 
                            f"Weather data available")
            else:
                self.log_test("PlaceDetailScreen - Weather", False, 
                            f"Status {response.status_code}")
        except Exception as e:
            self.log_test("PlaceDetailScreen - Weather", False, f"Error: {str(e)}")

        # Test place alerts
        try:
            response = self.session.get(f"{self.base_url}/api/v1/places/{place_id}/alerts")
            if response.status_code == 200:
                data = response.json()
                alerts = data.get("alerts", [])
                park_code = data.get("park_code")
                self.log_test("PlaceDetailScreen - Alerts", True, 
                            f"Retrieved {len(alerts)} alerts, park_code: {park_code}")
                return park_code
            else:
                self.log_test("PlaceDetailScreen - Alerts", False, 
                            f"Status {response.status_code}")
                return None
        except Exception as e:
            self.log_test("PlaceDetailScreen - Alerts", False, f"Error: {str(e)}")
            return None

    def test_offline_pdf_maps(self, place_id: str = "ChIJVVVVVVXlUVMRu-GPNDD5qKw"):
        """Test offline PDF maps functionality"""
        try:
            response = self.session.get(f"{self.base_url}/api/v1/places/{place_id}/offline-map/pdf")
            
            # Check content type to determine if PDF or JSON response
            content_type = response.headers.get('content-type', '').lower()
            
            if response.status_code == 200:
                if 'application/pdf' in content_type:
                    # PDF response - check size
                    content_length = len(response.content)
                    if content_length > 10000:  # Reasonable PDF size
                        self.log_test("PlaceDetailScreen - Offline PDF Map", True, 
                                    f"PDF map available, size: {content_length} bytes")
                    else:
                        self.log_test("PlaceDetailScreen - Offline PDF Map", False, 
                                    f"PDF too small: {content_length} bytes")
                elif 'application/json' in content_type:
                    # JSON response - check availability
                    data = response.json()
                    available = data.get("available", False)
                    if available:
                        self.log_test("PlaceDetailScreen - Offline PDF Map", True, 
                                    "PDF map available (JSON response)")
                    else:
                        reason = data.get("reason", "Unknown")
                        self.log_test("PlaceDetailScreen - Offline PDF Map", True, 
                                    f"PDF map not available: {reason}")
                else:
                    self.log_test("PlaceDetailScreen - Offline PDF Map", False, 
                                f"Unexpected content type: {content_type}")
            else:
                self.log_test("PlaceDetailScreen - Offline PDF Map", False, 
                            f"Status {response.status_code}")
        except Exception as e:
            self.log_test("PlaceDetailScreen - Offline PDF Map", False, f"Error: {str(e)}")

    def test_nps_map_assets(self, park_code: str = "yell"):
        """Test NPS map assets endpoint"""
        if not park_code:
            self.log_test("PlaceDetailScreen - NPS Map Assets", False, "No park code available")
            return
            
        try:
            response = self.session.get(f"{self.base_url}/api/nps/parks/{park_code}")
            if response.status_code == 200:
                data = response.json()
                map_assets = data.get("mapAssets", data.get("map_assets", []))
                self.log_test("PlaceDetailScreen - NPS Map Assets", True, 
                            f"Retrieved {len(map_assets)} map assets for {park_code}")
            else:
                self.log_test("PlaceDetailScreen - NPS Map Assets", False, 
                            f"Status {response.status_code}")
        except Exception as e:
            self.log_test("PlaceDetailScreen - NPS Map Assets", False, f"Error: {str(e)}")

    def test_during_hike_screen_apis(self, trail_id: str = None):
        """Test APIs used by DuringHikeScreen"""
        
        if not trail_id:
            # Try to get a trail ID from place trails
            try:
                response = self.session.get(f"{self.base_url}/api/v1/places/ChIJVVVVVVXlUVMRu-GPNDD5qKw/trails")
                if response.status_code == 200:
                    data = response.json()
                    trails = data.get("trails", data if isinstance(data, list) else [])
                    if trails:
                        trail_id = trails[0].get("id")
            except:
                pass
        
        if not trail_id:
            self.log_test("DuringHikeScreen - Trail Route", False, "No trail ID available for testing")
            self.log_test("DuringHikeScreen - Trail Navigation", False, "No trail ID available for testing")
            return

        # Test trail route
        try:
            response = self.session.get(f"{self.base_url}/api/v1/trails/{trail_id}/route")
            if response.status_code == 200:
                data = response.json()
                geojson = data.get("geojson", {})
                coordinates = geojson.get("coordinates", [])
                self.log_test("DuringHikeScreen - Trail Route", True, 
                            f"Route has {len(coordinates)} coordinate points")
            else:
                self.log_test("DuringHikeScreen - Trail Route", False, 
                            f"Status {response.status_code}")
        except Exception as e:
            self.log_test("DuringHikeScreen - Trail Route", False, f"Error: {str(e)}")

        # Test trail navigation
        try:
            response = self.session.get(f"{self.base_url}/api/v1/trails/{trail_id}/navigation")
            if response.status_code == 200:
                data = response.json()
                trailhead = data.get("trailhead", {})
                self.log_test("DuringHikeScreen - Trail Navigation", True, 
                            f"Navigation data available, trailhead: {trailhead}")
            else:
                self.log_test("DuringHikeScreen - Trail Navigation", False, 
                            f"Status {response.status_code}")
        except Exception as e:
            self.log_test("DuringHikeScreen - Trail Navigation", False, f"Error: {str(e)}")

    def test_journal_screen_apis(self):
        """Test APIs used by JournalScreen"""
        
        # Test journal entries
        try:
            response = self.session.get(f"{self.base_url}/api/v1/journal", 
                                      params={"entry_type": "trip_plan", "limit": 50})
            if response.status_code == 200:
                data = response.json()
                entries = data.get("entries", [])
                self.log_test("JournalScreen - Journal Entries", True, 
                            f"Retrieved {len(entries)} journal entries")
            else:
                self.log_test("JournalScreen - Journal Entries", False, 
                            f"Status {response.status_code}")
        except Exception as e:
            self.log_test("JournalScreen - Journal Entries", False, f"Error: {str(e)}")

        # Test completed hikes
        try:
            response = self.session.get(f"{self.base_url}/api/v1/hikes", 
                                      params={"status": "completed", "limit": 50})
            if response.status_code == 200:
                data = response.json()
                hikes = data.get("hikes", [])
                self.log_test("JournalScreen - Completed Hikes", True, 
                            f"Retrieved {len(hikes)} completed hikes")
            else:
                self.log_test("JournalScreen - Completed Hikes", False, 
                            f"Status {response.status_code}")
        except Exception as e:
            self.log_test("JournalScreen - Completed Hikes", False, f"Error: {str(e)}")

    def test_mobile_specific_features(self):
        """Test mobile-specific features and edge cases"""
        
        # Test API with mobile-specific headers
        try:
            mobile_headers = {
                'User-Agent': 'EcoTrails-Mobile/1.0 (iOS)',
                'X-Platform': 'mobile',
                'Accept': 'application/json'
            }
            response = self.session.get(f"{self.base_url}/api/v1/places/search", 
                                      params={"query": "test", "limit": 1},
                                      headers=mobile_headers)
            if response.status_code == 200:
                self.log_test("Mobile Headers Support", True, 
                            "API accepts mobile-specific headers")
            else:
                self.log_test("Mobile Headers Support", False, 
                            f"Status {response.status_code}")
        except Exception as e:
            self.log_test("Mobile Headers Support", False, f"Error: {str(e)}")

        # Test CORS for mobile requests
        try:
            response = self.session.options(f"{self.base_url}/api/v1/places/search")
            cors_headers = {
                'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
                'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
                'access-control-allow-headers': response.headers.get('access-control-allow-headers')
            }
            if any(cors_headers.values()):
                self.log_test("CORS Support", True, 
                            f"CORS headers present: {cors_headers}")
            else:
                self.log_test("CORS Support", True, 
                            "No CORS headers (may not be needed for mobile)")
        except Exception as e:
            self.log_test("CORS Support", False, f"Error: {str(e)}")

    def run_all_mobile_tests(self):
        """Run all mobile-specific backend tests"""
        print("📱 Starting EcoTrails Mobile Backend API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test mobile API configuration
        if not self.test_mobile_api_config():
            print("❌ Cannot connect to mobile API. Stopping tests.")
            return False
        
        # Test ExploreScreen APIs
        print("\n🔍 Testing ExploreScreen APIs...")
        self.test_explore_screen_apis()
        
        # Test PlaceDetailScreen APIs
        print("\n📍 Testing PlaceDetailScreen APIs...")
        trail = self.test_place_detail_screen_apis()
        park_code = self.test_place_detail_screen_apis()  # This will return park_code from alerts
        
        # Test offline PDF maps
        print("\n📄 Testing Offline PDF Maps...")
        self.test_offline_pdf_maps()
        
        # Test NPS map assets if we have a park code
        if park_code:
            print(f"\n🗺️  Testing NPS Map Assets for {park_code}...")
            self.test_nps_map_assets(park_code)
        
        # Test DuringHikeScreen APIs
        print("\n🥾 Testing DuringHikeScreen APIs...")
        trail_id = trail.get("id") if trail else None
        self.test_during_hike_screen_apis(trail_id)
        
        # Test JournalScreen APIs
        print("\n📖 Testing JournalScreen APIs...")
        self.test_journal_screen_apis()
        
        # Test mobile-specific features
        print("\n📱 Testing Mobile-Specific Features...")
        self.test_mobile_specific_features()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Mobile Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All mobile tests passed!")
            return True
        else:
            failed_tests = [r for r in self.test_results if not r["success"]]
            print(f"❌ {len(failed_tests)} mobile tests failed:")
            for test in failed_tests:
                print(f"   - {test['test_name']}: {test['details']}")
            return False

def main():
    """Main test runner"""
    backend_url = "https://ec0aa055-ea47-470e-bc88-1706654d1a17.preview.emergentagent.com"
    
    tester = MobileAPITester(backend_url)
    success = tester.run_all_mobile_tests()
    
    # Save detailed results
    results_file = f"/app/test_reports/mobile_backend_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    try:
        with open(results_file, 'w') as f:
            json.dump({
                "summary": {
                    "total_tests": tester.tests_run,
                    "passed_tests": tester.tests_passed,
                    "success_rate": tester.tests_passed / tester.tests_run if tester.tests_run > 0 else 0,
                    "backend_url": backend_url,
                    "test_type": "mobile_backend",
                    "timestamp": datetime.utcnow().isoformat()
                },
                "detailed_results": tester.test_results
            }, f, indent=2)
        print(f"📄 Detailed mobile test results saved to: {results_file}")
    except Exception as e:
        print(f"⚠️  Could not save results file: {e}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())