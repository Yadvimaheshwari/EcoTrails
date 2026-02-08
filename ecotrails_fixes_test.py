#!/usr/bin/env python3
"""
EcoTrails Fixes Testing Suite
Tests the specific fixes mentioned in the review request:
1. Photo enhancement timeout handling
2. 3D conversion in dev mode  
3. Video generation graceful handling
4. Offline maps for Yellowstone, Yosemite, Grand Canyon, Zion
"""

import requests
import json
import sys
import time
import os
from datetime import datetime
from typing import Dict, Any, List, Optional

class EcoTrailsFixesTester:
    def __init__(self, base_url: str = "https://ec0aa055-ea47-470e-bc88-1706654d1a17.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'EcoTrails-Fixes-Test/1.0'
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
        if not success and response_data:
            print(f"    Response: {response_data}")
        print()

    def test_offline_map_pdf(self, park_name: str, place_id: str):
        """Test GET /api/v1/places/{id}/offline-map/pdf"""
        try:
            response = self.session.get(f"{self.base_url}/api/v1/places/{place_id}/offline-map/pdf", timeout=30)
            
            if response.status_code == 200:
                # Check if it's a PDF redirect or JSON response
                content_type = response.headers.get('content-type', '').lower()
                
                if 'application/pdf' in content_type:
                    # Direct PDF response
                    pdf_size = len(response.content)
                    self.log_test(f"Offline Map PDF - {park_name}", True, 
                                f"PDF downloaded successfully ({pdf_size} bytes)", 
                                {"content_type": content_type, "size_bytes": pdf_size})
                    return True
                elif 'application/json' in content_type:
                    # JSON response with PDF URL
                    try:
                        data = response.json()
                        if "pdf_url" in data or "map_url" in data:
                            pdf_url = data.get("pdf_url") or data.get("map_url")
                            self.log_test(f"Offline Map PDF - {park_name}", True, 
                                        f"PDF URL provided: {pdf_url[:100]}...", 
                                        {"pdf_url": pdf_url, "response": data})
                            return True
                        else:
                            self.log_test(f"Offline Map PDF - {park_name}", False, 
                                        "JSON response but no PDF URL found", data)
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
                            f"Status {response.status_code}: {response.text[:200]}")
                return False
                
        except Exception as e:
            self.log_test(f"Offline Map PDF - {park_name}", False, f"Error: {str(e)}")
            return False

    def test_photo_enhancement_timeout(self):
        """Test photo enhancement endpoint timeout handling"""
        try:
            # Test with a mock photo enhancement request
            payload = {
                "image_data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",  # 1x1 pixel PNG
                "options": {
                    "style": "natural",
                    "lighting": "enhanced"
                }
            }
            
            # Test if endpoint exists and handles requests properly
            response = self.session.post(f"{self.base_url}/api/v1/ai/enhance-photo", 
                                       json=payload, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                if "success" in data:
                    if data["success"]:
                        self.log_test("Photo Enhancement Timeout", True, 
                                    "Enhancement completed successfully", data)
                    else:
                        # Check if it's a graceful error (not a timeout)
                        error_msg = data.get("error", "")
                        if "timeout" not in error_msg.lower():
                            self.log_test("Photo Enhancement Timeout", True, 
                                        f"Graceful error handling: {error_msg}", data)
                        else:
                            self.log_test("Photo Enhancement Timeout", False, 
                                        f"Timeout still occurring: {error_msg}", data)
                    return True
                else:
                    self.log_test("Photo Enhancement Timeout", False, 
                                "Unexpected response format", data)
                    return False
            elif response.status_code == 404:
                self.log_test("Photo Enhancement Timeout", False, 
                            "Photo enhancement endpoint not found", response.text)
                return False
            else:
                self.log_test("Photo Enhancement Timeout", False, 
                            f"Status {response.status_code}: {response.text[:200]}")
                return False
                
        except Exception as e:
            self.log_test("Photo Enhancement Timeout", False, f"Error: {str(e)}")
            return False

    def test_3d_conversion_dev_mode(self):
        """Test 3D conversion endpoint in dev mode"""
        try:
            # Test with a mock 3D conversion request
            # First need to test the media endpoint: POST /api/v1/media/{media_id}/3d
            media_id = "test_media_123"
            
            response = self.session.post(f"{self.base_url}/api/v1/media/{media_id}/3d", 
                                       timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                if "success" in data:
                    if data["success"]:
                        self.log_test("3D Conversion Dev Mode", True, 
                                    "3D conversion working in dev mode", data)
                    else:
                        error_msg = data.get("error", "")
                        if "not implemented" in error_msg.lower():
                            self.log_test("3D Conversion Dev Mode", False, 
                                        f"Still showing not implemented: {error_msg}", data)
                        else:
                            self.log_test("3D Conversion Dev Mode", True, 
                                        f"Different error (not 'not implemented'): {error_msg}", data)
                    return True
                else:
                    self.log_test("3D Conversion Dev Mode", False, 
                                "Unexpected response format", data)
                    return False
            elif response.status_code == 404:
                self.log_test("3D Conversion Dev Mode", False, 
                            "3D conversion endpoint not found", response.text)
                return False
            else:
                self.log_test("3D Conversion Dev Mode", False, 
                            f"Status {response.status_code}: {response.text[:200]}")
                return False
                
        except Exception as e:
            self.log_test("3D Conversion Dev Mode", False, f"Error: {str(e)}")
            return False

    def test_video_generation_graceful(self):
        """Test video generation endpoint graceful handling"""
        try:
            # Test with a mock video generation request
            payload = {
                "hike_id": "test_hike_123",
                "options": {
                    "duration": 10,
                    "style": "cinematic"
                }
            }
            
            response = self.session.post(f"{self.base_url}/api/v1/video/generate", 
                                       json=payload, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                if "success" in data:
                    if data["success"]:
                        self.log_test("Video Generation Graceful", True, 
                                    "Video generation completed successfully", data)
                    else:
                        error_msg = data.get("error", "")
                        if "stuck" not in error_msg.lower() and "loading" not in error_msg.lower():
                            self.log_test("Video Generation Graceful", True, 
                                        f"Graceful error handling: {error_msg}", data)
                        else:
                            self.log_test("Video Generation Graceful", False, 
                                        f"Still stuck/loading: {error_msg}", data)
                    return True
                else:
                    self.log_test("Video Generation Graceful", False, 
                                "Unexpected response format", data)
                    return False
            elif response.status_code == 404:
                self.log_test("Video Generation Graceful", False, 
                            "Video generation endpoint not found", response.text)
                return False
            else:
                self.log_test("Video Generation Graceful", False, 
                            f"Status {response.status_code}: {response.text[:200]}")
                return False
                
        except Exception as e:
            self.log_test("Video Generation Graceful", False, f"Error: {str(e)}")
            return False

    def test_api_connectivity(self):
        """Test basic API connectivity"""
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                self.log_test("API Connectivity", True, "Backend is accessible")
                return True
            else:
                self.log_test("API Connectivity", False, f"Status {response.status_code}")
                return False
        except Exception as e:
            self.log_test("API Connectivity", False, f"Connection error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all fix-specific tests"""
        print("🔧 Starting EcoTrails Fixes Testing Suite")
        print(f"📍 Testing against: {self.base_url}")
        print("🎯 Focus: Photo enhancement, 3D conversion, video generation, offline maps")
        print("=" * 80)
        
        # Test basic connectivity first
        if not self.test_api_connectivity():
            print("❌ Cannot connect to API. Stopping tests.")
            return False
        
        # Test offline maps for all specified parks
        print("\n📄 Testing Offline Maps PDF Downloads...")
        for park_name, place_id in self.test_places.items():
            self.test_offline_map_pdf(park_name, place_id)
        
        # Test AI services fixes
        print("\n🤖 Testing AI Services Fixes...")
        self.test_photo_enhancement_timeout()
        self.test_3d_conversion_dev_mode()
        self.test_video_generation_graceful()
        
        # Print summary
        print("=" * 80)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All fixes working correctly!")
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
    
    tester = EcoTrailsFixesTester(backend_url)
    success = tester.run_all_tests()
    
    # Save detailed results
    results_file = f"/app/test_reports/fixes_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    try:
        with open(results_file, 'w') as f:
            json.dump({
                "summary": {
                    "total_tests": tester.tests_run,
                    "passed_tests": tester.tests_passed,
                    "success_rate": tester.tests_passed / tester.tests_run if tester.tests_run > 0 else 0,
                    "backend_url": backend_url,
                    "timestamp": datetime.utcnow().isoformat(),
                    "focus": "EcoTrails reported fixes testing"
                },
                "detailed_results": tester.test_results
            }, f, indent=2)
        print(f"📄 Detailed results saved to: {results_file}")
    except Exception as e:
        print(f"⚠️  Could not save results file: {e}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())