#!/usr/bin/env python3
"""
Seed Script for Hike Mode Testing

This script creates test data to verify the end-to-end hike mode flow:
1. Creates a test park (Muir Woods as example)
2. Creates a test trail with coordinates
3. Creates a test user
4. Creates a test hike session

Run: python scripts/seed_hike_mode.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
import uuid

from backend.database import init_db, SessionLocal
from backend.models import User, Place, Trail, Hike

def create_seed_data():
    """Create seed data for hike mode testing"""
    init_db()
    db = SessionLocal()
    
    try:
        print("🌲 Creating seed data for Hike Mode testing...")
        
        # ========================================
        # 1. Create or find test user
        # ========================================
        test_user = db.query(User).filter(User.email == "hiker@test.com").first()
        if not test_user:
            test_user = User(
                id=str(uuid.uuid4()),
                email="hiker@test.com",
                name="Test Hiker",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(test_user)
            db.commit()
            print(f"✅ Created test user: {test_user.email}")
        else:
            print(f"ℹ️ Test user exists: {test_user.email}")
        
        # ========================================
        # 2. Create test park (Muir Woods)
        # ========================================
        park_id = "seed-muir-woods"
        test_park = db.query(Place).filter(Place.id == park_id).first()
        if not test_park:
            test_park = Place(
                id=park_id,
                name="Muir Woods National Monument",
                description="Famous for its old-growth coast redwoods, Muir Woods offers peaceful trails through ancient forest. A perfect escape from the city.",
                location={
                    "lat": 37.8914,
                    "lng": -122.5811,
                    "address": "Mill Valley, CA 94941"
                },
                place_type="national_monument",
                meta_data={
                    "nps_code": "muwo",
                    "state": "California",
                    "entrance_fee": "15.00",
                    "hours": "8:00 AM - Sunset",
                    "best_months": ["April", "May", "September", "October"],
                    "rating": 4.7,
                    "user_ratings_total": 15234,
                },
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(test_park)
            db.commit()
            print(f"✅ Created test park: {test_park.name}")
        else:
            print(f"ℹ️ Test park exists: {test_park.name}")
        
        # ========================================
        # 3. Create test trails
        # ========================================
        trails_data = [
            {
                "id": "seed-main-trail",
                "name": "Main Trail (Redwood Creek)",
                "difficulty": "easy",
                "distance": 1.0,
                "elevation_gain": 100,
                "estimated_time": 0.75,
                "description": "A gentle loop through the heart of Muir Woods, passing by Cathedral Grove and other majestic redwoods.",
                "lat": 37.8914,
                "lng": -122.5811,
                "loop_type": "Out & Back",
            },
            {
                "id": "seed-hillside-trail",
                "name": "Hillside Trail",
                "difficulty": "moderate",
                "distance": 2.5,
                "elevation_gain": 500,
                "estimated_time": 2.0,
                "description": "Climb above the valley floor for stunning views of the redwood canopy. More challenging but rewarding.",
                "lat": 37.8925,
                "lng": -122.5798,
                "loop_type": "Loop",
            },
            {
                "id": "seed-ocean-view-trail",
                "name": "Ocean View Trail",
                "difficulty": "hard",
                "distance": 4.0,
                "elevation_gain": 1200,
                "estimated_time": 3.5,
                "description": "The longest trail in the monument, connecting to panoramic views of the Pacific Ocean.",
                "lat": 37.8940,
                "lng": -122.5780,
                "loop_type": "Point to Point",
            },
        ]
        
        for trail_data in trails_data:
            existing = db.query(Trail).filter(Trail.id == trail_data["id"]).first()
            if not existing:
                trail = Trail(
                    id=trail_data["id"],
                    name=trail_data["name"],
                    place_id=park_id,
                    difficulty=trail_data["difficulty"],
                    distance_miles=trail_data["distance"],
                    elevation_gain_feet=trail_data["elevation_gain"],
                    estimated_duration_minutes=int(trail_data["estimated_time"] * 60),
                    description=trail_data["description"],
                    meta_data={
                        "lat": trail_data["lat"],
                        "lng": trail_data["lng"],
                        "loop_type": trail_data["loop_type"],
                        "surface": "dirt",
                        "shade": "full",
                        "dogs_allowed": False,
                        "source": "seed_data",
                    },
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(trail)
                print(f"✅ Created trail: {trail.name}")
            else:
                print(f"ℹ️ Trail exists: {trail_data['name']}")
        
        db.commit()
        
        # ========================================
        # 4. Create a test hike session
        # ========================================
        hike_id = "seed-test-hike"
        test_hike = db.query(Hike).filter(Hike.id == hike_id).first()
        if not test_hike:
            test_hike = Hike(
                id=hike_id,
                user_id=test_user.id,
                trail_id="seed-main-trail",
                place_id=park_id,
                start_time=datetime.utcnow(),
                meta_data={
                    "status": "ready",
                    "discovery_nodes": [],
                    "discovery_captures": [],
                    "earned_badges": [],
                },
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(test_hike)
            db.commit()
            print(f"✅ Created test hike: {test_hike.id}")
        else:
            print(f"ℹ️ Test hike exists: {test_hike.id}")
        
        # ========================================
        # Summary
        # ========================================
        print("\n" + "=" * 50)
        print("🎉 Seed data created successfully!")
        print("=" * 50)
        print(f"\nTest URLs:")
        print(f"  Park Page:     http://localhost:3000/places/{park_id}")
        print(f"  Hike Mode:     http://localhost:3000/hikes/{hike_id}/live")
        print(f"  Hike Summary:  http://localhost:3000/hikes/{hike_id}/summary")
        print(f"\nTest User:")
        print(f"  Email: hiker@test.com")
        print(f"  ID:    {test_user.id}")
        print("\n📱 To test the full flow:")
        print("  1. Go to the park page")
        print("  2. Click on a trail")
        print("  3. Click 'Start Hike'")
        print("  4. Explore discoveries on the map")
        print("  5. Capture a discovery")
        print("  6. Stop the hike to see the summary")
        
    except Exception as e:
        print(f"❌ Error creating seed data: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_seed_data()
