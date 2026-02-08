#!/usr/bin/env python3
"""
EcoTrails Offline Maps Focused Test
Tests the offline maps functionality for the 4 specified parks
"""

import requests
import json
import sys
import time
from datetime import datetime
from typing import Dict, Any, List, Optional

class OfflineMapsTester:
    def __init__(self, base_url: str = "https://ec0aa055-ea47-470e-bc88-1706654d1a17.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'EcoTrails-OfflineMaps-Test/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test place IDs from review request
        self.test_places = {
            "Yellowstone": "ChIJVVVVVVXlUVMRu-GPNDD5qKw",
            "Yosemite": "ChIJxeyK9Z3wloAR_gOA7SycJC0", 
            "Grand Canyon": "ChIJFU2bda4SM4cRKSCRyb6pOB8",
            "Zion": "ChIJ2fhEiNDqyoAR9VY2qhU6Lnw"
        }
        
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
        if response_data and isinstance(response_data, dict):
            # Print key info from response
            if "available" in response_data:
                print(f"    Available: {response_data['available']}")
            if "reason" in response_data:
                print(f"    Reason: {response_data['reason']}")
            if "parkCode" in response_data:
                print(f"    Park Code: {response_data['parkCode']}")
            if "map_url" in response_data:
                print(f"    Map URL: {response_data['map_url'][:100]}...")
        print()

    def test_offline_map_pdf_detailed(self, park_name: str, place_id: str):
        """Test GET /api/v1/places/{id}/offline-map/pdf with detailed analysis"""
        try:
            print(f"\n🔍 Testing {park_name} (ID: {place_id})")
            response = self.session.get(f"{self.base_url}/api/v1/places/{place_id}/offline-map/pdf", timeout=30)
            
            print(f"   Status Code: {response.status_code}")
            print(f"   Content-Type: {response.headers.get('content-type', 'N/A')}")
            print(f"   Content-Length: {response.headers.get('content-length', 'N/A')}")
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '').lower()
                
                if 'application/pdf' in content_type:
                    # Direct PDF response
                    pdf_size = len(response.content)
                    size_mb = pdf_size / (1024 * 1024)
                    self.log_test(f"Offline Map PDF - {park_name}", True, 
                                f"PDF downloaded successfully ({pdf_size:,} bytes = {size_mb:.1f} MB)", 
                                {"content_type": content_type, "size_bytes": pdf_size, "size_mb": size_mb})
                    return True
                elif 'application/json' in content_type:
                    # JSON response with PDF URL or error
                    try:
                        data = response.json()
                        print(f"   JSON Response: {json.dumps(data, indent=2)}")
                        
                        if data.get("available") == True and ("pdf_url" in data or "map_url" in data):
                            pdf_url = data.get("pdf_url") or data.get("map_url")
                            self.log_test(f"Offline Map PDF - {park_name}", True, 
                                        f"PDF URL provided: {pdf_url}", data)
                            return True
                        elif data.get("available") == False:
                            reason = data.get("reason", "unknown")
                            park_code = data.get("parkCode", "unknown")
                            
                            # Check if this is the expected Yosemite campground map issue
                            if park_name == "Yosemite" and reason == "no_pdf_found":
                                self.log_test(f"Offline Map PDF - {park_name}", False, 
                                            f"Expected issue: {reason} for park code {park_code}. Main agent said Yosemite should use campground map.", data)
                            else:
                                self.log_test(f"Offline Map PDF - {park_name}", False, 
                                            f"Map not available: {reason} (park code: {park_code})", data)
                            return False
                        else:
                            self.log_test(f"Offline Map PDF - {park_name}", False, 
                                        "JSON response but no clear success/failure indication", data)
                            return False
                    except json.JSONDecodeError:
                        self.log_test(f"Offline Map PDF - {park_name}", False, 
                                    "Invalid JSON response", response.text[:200])
                        return False
                else:
                    # Other content type
                    self.log_test(f"Offline Map PDF - {park_name}", False, 
                                f"Unexpected content type: {content_type}", 
                                {"content_type": content_type, "response_preview": response.text[:200]})
                    return False
            else:
                self.log_test(f"Offline Map PDF - {park_name}", False, 
                            f"HTTP {response.status_code}: {response.text[:200]}")
                return False
                
        except Exception as e:
            self.log_test(f"Offline Map PDF - {park_name}", False, f"Error: {str(e)}")
            return False

    def test_place_details(self, park_name: str, place_id: str):
        """Test place details to understand the park better"""
        try:
            response = self.session.get(f"{self.base_url}/api/v1/places/{place_id}")
            if response.status_code == 200:
                data = response.json()
                print(f"   Place Name: {data.get('name', 'N/A')}")
                print(f"   Place Type: {data.get('place_type', 'N/A')}")
                if 'metadata' in data:
                    metadata = data['metadata']
                    if 'types' in metadata:
                        print(f"   Google Types: {metadata['types'][:3]}...")  # First 3 types
                return data
            else:
                print(f"   Could not get place details: HTTP {response.status_code}")
                return None
        except Exception as e:
            print(f"   Error getting place details: {e}")
            return None

    def run_all_tests(self):
        """Run all offline maps tests"""
        print("📄 EcoTrails Offline Maps Testing Suite")
        print(f"📍 Testing against: {self.base_url}")
        print("🎯 Focus: Offline PDF maps for Yellowstone, Yosemite, Grand Canyon, Zion")
        print("=" * 80)
        
        # Test offline maps for all specified parks
        for park_name, place_id in self.test_places.items():
            # First get place details for context
            place_details = self.test_place_details(park_name, place_id)
            
            # Then test the offline map
            self.test_offline_map_pdf_detailed(park_name, place_id)
        
        # Print summary
        print("=" * 80)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        # Analyze results
        working_parks = [r for r in self.test_results if r["success"]]
        failing_parks = [r for r in self.test_results if not r["success"]]
        
        if working_parks:
            print(f"✅ Working parks ({len(working_parks)}):")
            for test in working_parks:
                park = test["test_name"].replace("Offline Map PDF - ", "")
                print(f"   - {park}: {test['details']}")
        
        if failing_parks:
            print(f"❌ Failing parks ({len(failing_parks)}):")
            for test in failing_parks:
                park = test["test_name"].replace("Offline Map PDF - ", "")
                print(f"   - {park}: {test['details']}")
        
        return len(failing_parks) == 0

def main():
    """Main test runner"""
    backend_url = "https://ec0aa055-ea47-470e-bc88-1706654d1a17.preview.emergentagent.com"
    
    tester = OfflineMapsTester(backend_url)
    success = tester.run_all_tests()
    
    # Save detailed results
    results_file = f"/app/test_reports/offline_maps_detailed_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    try:
        with open(results_file, 'w') as f:
            json.dump({
                "summary": {
                    "total_tests": tester.tests_run,
                    "passed_tests": tester.tests_passed,
                    "success_rate": tester.tests_passed / tester.tests_run if tester.tests_run > 0 else 0,
                    "backend_url": backend_url,
                    "timestamp": datetime.utcnow().isoformat(),
                    "focus": "Offline maps PDF downloads for 4 national parks"
                },
                "detailed_results": tester.test_results
            }, f, indent=2)
        print(f"\n📄 Detailed results saved to: {results_file}")
    except Exception as e:
        print(f"⚠️  Could not save results file: {e}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())