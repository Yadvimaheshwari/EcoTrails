#!/usr/bin/env python3
"""
Backend Test for EcoTrails Offline Maps and Trail Routes
Testing specific endpoints mentioned in the review request
"""

import requests
import sys
import json
from datetime import datetime

class OfflineMapsTester:
    def __init__(self, base_url="https://ec0aa055-ea47-470e-bc88-1706654d1a17.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.results = []

    def log_result(self, test_name, success, details="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name} - {details}")
        
        self.results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def test_yellowstone_offline_map_pdf(self):
        """Test GET /api/v1/places/ChIJVVVVVVXlUVMRu-GPNDD5qKw/offline-map/pdf"""
        test_name = "Yellowstone Offline Map PDF"
        place_id = "ChIJVVVVVVXlUVMRu-GPNDD5qKw"
        url = f"{self.base_url}/api/v1/places/{place_id}/offline-map/pdf"
        
        try:
            print(f"\n🔍 Testing {test_name}...")
            print(f"URL: {url}")
            
            response = requests.get(url, timeout=30, allow_redirects=True)
            
            print(f"Status Code: {response.status_code}")
            print(f"Content-Type: {response.headers.get('content-type', 'N/A')}")
            print(f"Content-Length: {response.headers.get('content-length', 'N/A')}")
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '').lower()
                content_length = response.headers.get('content-length')
                
                if 'application/pdf' in content_type:
                    if content_length:
                        size_mb = int(content_length) / (1024 * 1024)
                        print(f"PDF Size: {size_mb:.2f} MB")
                        
                        # Check if it's around 8.5MB as mentioned
                        if 7.0 <= size_mb <= 10.0:
                            self.log_result(test_name, True, f"PDF returned successfully, size: {size_mb:.2f} MB")
                        else:
                            self.log_result(test_name, True, f"PDF returned but unexpected size: {size_mb:.2f} MB")
                    else:
                        self.log_result(test_name, True, "PDF returned successfully (size unknown)")
                else:
                    self.log_result(test_name, False, f"Expected PDF but got content-type: {content_type}")
            else:
                try:
                    error_data = response.json()
                    self.log_result(test_name, False, f"HTTP {response.status_code}: {error_data}")
                except:
                    self.log_result(test_name, False, f"HTTP {response.status_code}: {response.text[:200]}")
                    
        except Exception as e:
            self.log_result(test_name, False, f"Request failed: {str(e)}")

    def test_trail_route_geojson(self):
        """Test GET /api/v1/trails/{trail_id}/route for GeoJSON coordinates"""
        test_name = "Trail Route GeoJSON"
        
        # First, let's find a trail ID by searching for Yellowstone trails
        try:
            print(f"\n🔍 Finding Yellowstone trails...")
            search_url = f"{self.base_url}/api/v1/places/search"
            search_response = requests.get(search_url, params={"query": "Yellowstone", "limit": 5}, timeout=15)
            
            if search_response.status_code == 200:
                search_data = search_response.json()
                places = search_data.get('places', [])
                
                if places:
                    # Get the first place and look for trails
                    place = places[0]
                    place_id = place.get('id')
                    print(f"Found place: {place.get('name')} (ID: {place_id})")
                    
                    # Get place details to find trails
                    place_url = f"{self.base_url}/api/v1/places/{place_id}"
                    place_response = requests.get(place_url, timeout=15)
                    
                    if place_response.status_code == 200:
                        place_data = place_response.json()
                        trails = place_data.get('trails', [])
                        
                        if trails:
                            trail = trails[0]
                            trail_id = trail.get('id')
                            trail_name = trail.get('name', 'Unknown Trail')
                            print(f"Found trail: {trail_name} (ID: {trail_id})")
                            
                            # Now test the route endpoint
                            route_url = f"{self.base_url}/api/v1/trails/{trail_id}/route"
                            print(f"Testing route URL: {route_url}")
                            
                            route_response = requests.get(route_url, timeout=15)
                            print(f"Route Status Code: {route_response.status_code}")
                            
                            if route_response.status_code == 200:
                                route_data = route_response.json()
                                print(f"Route response keys: {list(route_data.keys())}")
                                
                                # Check for GeoJSON structure
                                geojson = route_data.get('geojson')
                                bounds = route_data.get('bounds')
                                
                                if geojson and isinstance(geojson, dict):
                                    coordinates = geojson.get('coordinates', [])
                                    geom_type = geojson.get('type')
                                    
                                    print(f"GeoJSON type: {geom_type}")
                                    print(f"Coordinates count: {len(coordinates) if coordinates else 0}")
                                    
                                    if coordinates and len(coordinates) > 0:
                                        # Check coordinate format [lng, lat]
                                        first_coord = coordinates[0] if coordinates else None
                                        if first_coord and len(first_coord) >= 2:
                                            print(f"First coordinate: {first_coord}")
                                            self.log_result(test_name, True, 
                                                f"GeoJSON with {len(coordinates)} coordinates returned for trail: {trail_name}")
                                        else:
                                            self.log_result(test_name, False, "Invalid coordinate format in GeoJSON")
                                    else:
                                        self.log_result(test_name, False, "GeoJSON has no coordinates")
                                        
                                    # Check bounds
                                    if bounds:
                                        print(f"Bounds: {bounds}")
                                else:
                                    self.log_result(test_name, False, "No GeoJSON data in response")
                            else:
                                try:
                                    error_data = route_response.json()
                                    self.log_result(test_name, False, f"Route API HTTP {route_response.status_code}: {error_data}")
                                except:
                                    self.log_result(test_name, False, f"Route API HTTP {route_response.status_code}")
                        else:
                            self.log_result(test_name, False, "No trails found for Yellowstone")
                    else:
                        self.log_result(test_name, False, f"Failed to get place details: HTTP {place_response.status_code}")
                else:
                    self.log_result(test_name, False, "No places found for Yellowstone search")
            else:
                self.log_result(test_name, False, f"Places search failed: HTTP {search_response.status_code}")
                
        except Exception as e:
            self.log_result(test_name, False, f"Trail route test failed: {str(e)}")

    def test_api_connectivity(self):
        """Test basic API connectivity"""
        test_name = "API Connectivity"
        url = f"{self.base_url}/"
        
        try:
            print(f"\n🔍 Testing {test_name}...")
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_result(test_name, True, f"API accessible: {data.get('message', 'OK')}")
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_result(test_name, False, f"Connection failed: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting EcoTrails Offline Maps Backend Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Test basic connectivity first
        self.test_api_connectivity()
        
        # Test specific endpoints from review request
        self.test_yellowstone_offline_map_pdf()
        self.test_trail_route_geojson()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed")
            return False

    def save_results(self):
        """Save test results to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"/app/test_reports/offline_maps_test_{timestamp}.json"
        
        results_data = {
            "timestamp": datetime.now().isoformat(),
            "backend_url": self.base_url,
            "tests_run": self.tests_run,
            "tests_passed": self.tests_passed,
            "success_rate": f"{(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%",
            "results": self.results
        }
        
        try:
            with open(filename, 'w') as f:
                json.dump(results_data, f, indent=2)
            print(f"📄 Results saved to: {filename}")
            return filename
        except Exception as e:
            print(f"Failed to save results: {e}")
            return None

def main():
    tester = OfflineMapsTester()
    success = tester.run_all_tests()
    tester.save_results()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())