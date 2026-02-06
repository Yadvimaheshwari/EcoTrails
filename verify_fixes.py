#!/usr/bin/env python3
"""
Verification script to ensure all fixes are in place
"""
import sys
import os
sys.path.insert(0, '.')

print("=" * 60)
print("Verifying EcoTrails Fixes")
print("=" * 60)

# 1. Check Query(...) fixes in main.py
print("\n1. Checking Query(...) fixes in main.py...")
with open('main.py', 'r') as f:
    content = f.read()
    if 'query: str = Query(...)' in content:
        print("   ✓ Query(...) fixes found")
    else:
        print("   ✗ Query(...) fixes NOT found")

# 2. Check query: str fix in ai_services.py
print("\n2. Checking query: str fix in ai_services.py...")
with open('backend/ai_services.py', 'r') as f:
    content = f.read()
    if 'query: str,' in content and 'query: string,' not in content:
        print("   ✓ query: str fix found (no 'string' type)")
    else:
        print("   ✗ query: str fix NOT found or 'string' still present")

# 3. Check Place latitude/longitude fixes
print("\n3. Checking Place location extraction fixes...")
with open('backend/stats_service.py', 'r') as f:
    content = f.read()
    if 'Extract lat/lng from location JSON field' in content:
        print("   ✓ Location extraction fix found in stats_service.py")
    else:
        print("   ✗ Location extraction fix NOT found in stats_service.py")
    
    if 'place.latitude' in content or 'place.longitude' in content:
        print("   ✗ WARNING: Still accessing place.latitude/longitude directly!")
    else:
        print("   ✓ No direct place.latitude/longitude access")

with open('backend/hikes_service.py', 'r') as f:
    content = f.read()
    if 'Extract lat/lng from location JSON field' in content:
        print("   ✓ Location extraction fix found in hikes_service.py")
    else:
        print("   ✗ Location extraction fix NOT found in hikes_service.py")

# 4. Check imports
print("\n4. Testing imports...")
try:
    from backend.stats_service import get_dashboard_stats
    print("   ✓ stats_service imports successfully")
except Exception as e:
    print(f"   ✗ stats_service import failed: {e}")

try:
    from backend.hikes_service import get_hike_details
    print("   ✓ hikes_service imports successfully")
except Exception as e:
    print(f"   ✗ hikes_service import failed: {e}")

try:
    from backend.ai_services import search_journal_natural_language
    print("   ✓ ai_services imports successfully")
except Exception as e:
    print(f"   ✗ ai_services import failed: {e}")

# 5. Check main.py can import
print("\n5. Testing main.py import (without API_KEY)...")
os.environ.pop('API_KEY', None)  # Remove API_KEY to test graceful handling
try:
    import main
    print("   ✓ main.py imports successfully (even without API_KEY)")
except Exception as e:
    print(f"   ✗ main.py import failed: {e}")

print("\n" + "=" * 60)
print("Verification complete!")
print("=" * 60)
