# EcoAtlas Domain Model

This document defines the complete domain model for the EcoAtlas hiking application, including all entities, their fields, relationships, and example JSON representations.

## Entity Relationship Diagram

```
User
├── owns → HikeSession (one-to-many)
├── owns → SavedTrail (one-to-many)
├── owns → Photo (one-to-many)
├── owns → FitnessMetrics (one-to-many)
└── owns → WearableConnection (one-to-many)

Park
└── contains → Trail (one-to-many)

Trail
├── belongs_to → Park (many-to-one)
├── has → HikeSession (one-to-many)
└── saved_by → User (many-to-many via SavedTrail)

HikeSession
├── belongs_to → Trail (many-to-one)
├── belongs_to → User (many-to-one)
├── has → Photo (one-to-many)
├── has → FitnessMetrics (one-to-one)
└── has → EnvironmentalRecord (one-to-one)

Photo
├── belongs_to → HikeSession (many-to-one)
└── belongs_to → User (many-to-one)

FitnessMetrics
└── belongs_to → HikeSession (many-to-one)

WearableConnection
└── belongs_to → User (many-to-one)
```

---

## 1. User

Represents a user account in the EcoAtlas system.

### Required Fields
- `id` (string): Unique identifier (UUID)
- `email` (string): User's email address (unique)
- `created_at` (datetime): Account creation timestamp

### Optional Fields
- `username` (string): Display name
- `first_name` (string): User's first name
- `last_name` (string): User's last name
- `avatar_url` (string): URL to profile picture
- `preferences` (JSON): User preferences (units, notifications, etc.)
- `fitness_level` (string): 'beginner', 'intermediate', 'advanced', 'expert'
- `updated_at` (datetime): Last update timestamp

### Relationships
- **One-to-Many**: `HikeSession` (user owns multiple hike sessions)
- **One-to-Many**: `SavedTrail` (user can save multiple trails)
- **One-to-Many**: `Photo` (user owns multiple photos)
- **One-to-Many**: `FitnessMetrics` (user has multiple fitness records)
- **One-to-Many**: `WearableConnection` (user can have multiple wearable devices)

### Example JSON
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "hiker@example.com",
  "username": "trailblazer42",
  "first_name": "Alex",
  "last_name": "Johnson",
  "avatar_url": "https://cdn.ecoatlas.com/avatars/user-123.jpg",
  "preferences": {
    "units": "imperial",
    "notifications": {
      "safety_alerts": true,
      "environmental_insights": true,
      "weekly_summary": false
    },
    "theme": "dark"
  },
  "fitness_level": "intermediate",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T14:22:00Z"
}
```

---

## 2. Park

Represents a national park, state park, or protected area.

### Required Fields
- `id` (string): Unique identifier (slug or UUID)
- `name` (string): Official park name
- `type` (string): Park type (e.g., 'National Park', 'State Park', 'National Forest')
- `state` (string): Primary state where park is located
- `coordinates` (object): Geographic center
  - `lat` (number): Latitude
  - `lng` (number): Longitude

### Optional Fields
- `states` (array of strings): Additional states if park spans multiple
- `description` (string): Park description
- `established` (number): Year park was established
- `area` (string): Park area (e.g., "761,748 acres")
- `elevation` (string): Elevation range (e.g., "2,000 - 13,000 ft")
- `features` (array of strings): Key features (e.g., ["Mountains", "Lakes", "Wildlife"])
- `icon` (string): Emoji or icon identifier
- `website_url` (string): Official park website
- `entrance_fee` (object): Fee information
  - `amount` (number): Fee in USD
  - `description` (string): Fee description
- `operating_hours` (object): Operating hours
  - `open` (string): Opening time
  - `close` (string): Closing time
  - `timezone` (string): Timezone
- `created_at` (datetime): Record creation timestamp
- `updated_at` (datetime): Last update timestamp

### Relationships
- **One-to-Many**: `Trail` (park contains multiple trails)

### Example JSON
```json
{
  "id": "yosemite",
  "name": "Yosemite National Park",
  "type": "National Park",
  "state": "California",
  "coordinates": {
    "lat": 37.8651,
    "lng": -119.5383
  },
  "description": "Famous for its granite cliffs, waterfalls, clear streams, giant sequoia groves, and biological diversity.",
  "established": 1890,
  "area": "761,748 acres",
  "elevation": "2,000 - 13,114 ft",
  "features": ["Valley", "Waterfalls", "Giant Sequoias", "Granite Cliffs"],
  "icon": "🏔️",
  "website_url": "https://www.nps.gov/yose/",
  "entrance_fee": {
    "amount": 35,
    "description": "Per vehicle (7-day pass)"
  },
  "operating_hours": {
    "open": "00:00",
    "close": "23:59",
    "timezone": "America/Los_Angeles"
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

## 3. Trail

Represents a hiking trail within a park.

### Required Fields
- `id` (string): Unique identifier (UUID)
- `park_id` (string): Foreign key to `Park.id`
- `name` (string): Trail name
- `difficulty` (string): 'easy', 'moderate', 'hard', 'expert'
- `coordinates` (object): Trail start coordinates
  - `lat` (number): Latitude
  - `lng` (number): Longitude

### Optional Fields
- `description` (string): Trail description
- `length_miles` (number): Trail length in miles
- `length_km` (number): Trail length in kilometers
- `elevation_gain_ft` (number): Elevation gain in feet
- `elevation_gain_m` (number): Elevation gain in meters
- `estimated_duration_hours` (number): Estimated completion time
- `route_type` (string): 'out-and-back', 'loop', 'point-to-point'
- `trailhead_location` (object): Trailhead coordinates
  - `lat` (number): Latitude
  - `lng` (number): Longitude
  - `name` (string): Trailhead name
- `waypoints` (array of objects): Key points along trail
  - `lat` (number): Latitude
  - `lng` (number): Longitude
  - `name` (string): Waypoint name
  - `description` (string): Waypoint description
- `features` (array of strings): Trail features (e.g., ["Waterfall", "Summit", "Lake"])
- `best_season` (array of strings): Best seasons to hike (e.g., ["Spring", "Summer", "Fall"])
- `permit_required` (boolean): Whether permit is required
- `dog_friendly` (boolean): Whether dogs are allowed
- `rating` (number): Average user rating (0-5)
- `review_count` (number): Number of reviews
- `created_at` (datetime): Record creation timestamp
- `updated_at` (datetime): Last update timestamp

### Relationships
- **Many-to-One**: `Park` (trail belongs to one park)
- **One-to-Many**: `HikeSession` (trail has multiple hike sessions)
- **Many-to-Many**: `User` (via `SavedTrail` - users can save trails)

### Example JSON
```json
{
  "id": "trail-123e4567-e89b-12d3-a456-426614174000",
  "park_id": "yosemite",
  "name": "Half Dome Trail",
  "description": "Iconic 16-mile round trip to the top of Half Dome with cable route.",
  "difficulty": "expert",
  "length_miles": 16.0,
  "length_km": 25.7,
  "elevation_gain_ft": 4800,
  "elevation_gain_m": 1463,
  "estimated_duration_hours": 10.0,
  "route_type": "out-and-back",
  "coordinates": {
    "lat": 37.7462,
    "lng": -119.5332
  },
  "trailhead_location": {
    "lat": 37.7406,
    "lng": -119.5594,
    "name": "Happy Isles Trailhead"
  },
  "waypoints": [
    {
      "lat": 37.7420,
      "lng": -119.5550,
      "name": "Vernal Fall",
      "description": "First major waterfall"
    },
    {
      "lat": 37.7440,
      "lng": -119.5500,
      "name": "Nevada Fall",
      "description": "Second major waterfall"
    },
    {
      "lat": 37.7462,
      "lng": -119.5332,
      "name": "Half Dome Summit",
      "description": "Final destination with cable route"
    }
  ],
  "features": ["Summit", "Waterfall", "Cable Route", "Scenic Views"],
  "best_season": ["Summer", "Fall"],
  "permit_required": true,
  "dog_friendly": false,
  "rating": 4.8,
  "review_count": 1247,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

## 4. HikeSession

Represents a single hiking session on a trail.

### Required Fields
- `id` (string): Unique identifier (UUID)
- `user_id` (string): Foreign key to `User.id`
- `trail_id` (string): Foreign key to `Trail.id`
- `start_time` (datetime): When the hike started
- `status` (string): 'active', 'completed', 'paused', 'cancelled'
- `created_at` (datetime): Record creation timestamp

### Optional Fields
- `end_time` (datetime): When the hike ended
- `device_id` (string): EcoDroid device ID if used
- `notes` (string): User's notes about the hike
- `weather_conditions` (object): Weather during hike
  - `temperature_f` (number): Temperature in Fahrenheit
  - `temperature_c` (number): Temperature in Celsius
  - `conditions` (string): Weather description (e.g., "Sunny", "Cloudy", "Rainy")
  - `wind_speed_mph` (number): Wind speed in mph
- `route_taken` (array of objects): GPS track of the hike
  - `lat` (number): Latitude
  - `lng` (number): Longitude
  - `timestamp` (datetime): When this point was recorded
  - `elevation_ft` (number): Elevation at this point
- `distance_miles` (number): Actual distance traveled
- `distance_km` (number): Actual distance in kilometers
- `duration_minutes` (number): Total duration in minutes
- `rating` (number): User's rating (1-5)
- `review` (string): User's review text
- `updated_at` (datetime): Last update timestamp

### Relationships
- **Many-to-One**: `User` (hike belongs to one user)
- **Many-to-One**: `Trail` (hike belongs to one trail)
- **One-to-Many**: `Photo` (hike has multiple photos)
- **One-to-One**: `FitnessMetrics` (hike has one fitness metrics record)
- **One-to-One**: `EnvironmentalRecord` (hike has one environmental record)

### Example JSON
```json
{
  "id": "hike-789e4567-e89b-12d3-a456-426614174111",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "trail_id": "trail-123e4567-e89b-12d3-a456-426614174000",
  "start_time": "2024-01-20T06:00:00Z",
  "end_time": "2024-01-20T16:30:00Z",
  "status": "completed",
  "device_id": "ecodroid-abc123",
  "notes": "Beautiful sunrise at the summit. Saw a bear near Nevada Fall!",
  "weather_conditions": {
    "temperature_f": 65,
    "temperature_c": 18.3,
    "conditions": "Sunny",
    "wind_speed_mph": 5
  },
  "route_taken": [
    {
      "lat": 37.7406,
      "lng": -119.5594,
      "timestamp": "2024-01-20T06:00:00Z",
      "elevation_ft": 4035
    },
    {
      "lat": 37.7420,
      "lng": -119.5550,
      "timestamp": "2024-01-20T07:15:00Z",
      "elevation_ft": 5040
    },
    {
      "lat": 37.7462,
      "lng": -119.5332,
      "timestamp": "2024-01-20T11:00:00Z",
      "elevation_ft": 8836
    }
  ],
  "distance_miles": 16.2,
  "distance_km": 26.1,
  "duration_minutes": 630,
  "rating": 5,
  "review": "Amazing experience! The cable route was challenging but worth it.",
  "created_at": "2024-01-20T06:00:00Z",
  "updated_at": "2024-01-20T16:30:00Z"
}
```

---

## 5. FitnessMetrics

Represents fitness and health metrics recorded during a hike.

### Required Fields
- `id` (string): Unique identifier (UUID)
- `hike_session_id` (string): Foreign key to `HikeSession.id` (unique)
- `created_at` (datetime): Record creation timestamp

### Optional Fields
- `average_heart_rate` (number): Average heart rate in BPM
- `max_heart_rate` (number): Maximum heart rate in BPM
- `min_heart_rate` (number): Minimum heart rate in BPM
- `total_steps` (number): Total steps taken
- `calories_burned` (number): Estimated calories burned
- `active_duration_minutes` (number): Active time in minutes
- `resting_duration_minutes` (number): Rest time in minutes
- `elevation_gain_ft` (number): Total elevation gained
- `elevation_loss_ft` (number): Total elevation lost
- `average_pace_min_per_mile` (number): Average pace in minutes per mile
- `average_speed_mph` (number): Average speed in miles per hour
- `max_speed_mph` (number): Maximum speed in miles per hour
- `heart_rate_zones` (object): Time spent in each heart rate zone
  - `zone1_minutes` (number): Recovery zone (50-60% max HR)
  - `zone2_minutes` (number): Aerobic zone (60-70% max HR)
  - `zone3_minutes` (number): Tempo zone (70-80% max HR)
  - `zone4_minutes` (number): Threshold zone (80-90% max HR)
  - `zone5_minutes` (number): Maximum zone (90-100% max HR)
- `updated_at` (datetime): Last update timestamp

### Relationships
- **Many-to-One**: `HikeSession` (metrics belong to one hike session)

### Example JSON
```json
{
  "id": "fitness-456e7890-e89b-12d3-a456-426614174222",
  "hike_session_id": "hike-789e4567-e89b-12d3-a456-426614174111",
  "average_heart_rate": 142,
  "max_heart_rate": 178,
  "min_heart_rate": 68,
  "total_steps": 35240,
  "calories_burned": 2840,
  "active_duration_minutes": 585,
  "resting_duration_minutes": 45,
  "elevation_gain_ft": 4800,
  "elevation_loss_ft": 4800,
  "average_pace_min_per_mile": 22.5,
  "average_speed_mph": 2.7,
  "max_speed_mph": 4.2,
  "heart_rate_zones": {
    "zone1_minutes": 45,
    "zone2_minutes": 180,
    "zone3_minutes": 240,
    "zone4_minutes": 100,
    "zone5_minutes": 20
  },
  "created_at": "2024-01-20T16:30:00Z",
  "updated_at": "2024-01-20T16:30:00Z"
}
```

---

## 6. Photo

Represents a photo taken during a hike.

### Required Fields
- `id` (string): Unique identifier (UUID)
- `user_id` (string): Foreign key to `User.id`
- `hike_session_id` (string): Foreign key to `HikeSession.id`
- `url` (string): URL to the photo file
- `created_at` (datetime): When photo was taken/uploaded

### Optional Fields
- `thumbnail_url` (string): URL to thumbnail version
- `coordinates` (object): Where photo was taken
  - `lat` (number): Latitude
  - `lng` (number): Longitude
  - `accuracy` (number): GPS accuracy in meters
- `caption` (string): User's caption/description
- `tags` (array of strings): Photo tags (e.g., ["Wildlife", "Landscape", "Summit"])
- `width` (number): Photo width in pixels
- `height` (number): Photo height in pixels
- `file_size_bytes` (number): File size in bytes
- `ai_analysis` (object): AI-generated analysis
  - `detected_objects` (array of strings): Objects detected in photo
  - `scene_description` (string): AI description of the scene
  - `environmental_tags` (array of strings): Environmental features detected
- `favorite` (boolean): Whether user marked as favorite
- `updated_at` (datetime): Last update timestamp

### Relationships
- **Many-to-One**: `User` (photo belongs to one user)
- **Many-to-One**: `HikeSession` (photo belongs to one hike session)

### Example JSON
```json
{
  "id": "photo-789e0123-e89b-12d3-a456-426614174333",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "hike_session_id": "hike-789e4567-e89b-12d3-a456-426614174111",
  "url": "https://cdn.ecoatlas.com/photos/photo-789e0123.jpg",
  "thumbnail_url": "https://cdn.ecoatlas.com/photos/thumbnails/photo-789e0123.jpg",
  "coordinates": {
    "lat": 37.7462,
    "lng": -119.5332,
    "accuracy": 5
  },
  "caption": "View from Half Dome summit at sunrise",
  "tags": ["Summit", "Sunrise", "Landscape", "Yosemite"],
  "width": 4032,
  "height": 3024,
  "file_size_bytes": 2456789,
  "ai_analysis": {
    "detected_objects": ["Mountain", "Sky", "Clouds", "Valley"],
    "scene_description": "Panoramic mountain vista with dramatic sky at sunrise",
    "environmental_tags": ["Alpine", "Granite", "High Elevation", "Clear Sky"]
  },
  "favorite": true,
  "created_at": "2024-01-20T11:15:00Z",
  "updated_at": "2024-01-20T11:15:00Z"
}
```

---

## 7. WearableConnection

Represents a connection to a wearable device (Apple Watch, Wear OS, etc.).

### Required Fields
- `id` (string): Unique identifier (UUID)
- `user_id` (string): Foreign key to `User.id`
- `device_type` (string): 'apple_watch', 'wear_os', 'fitbit', 'garmin', 'other'
- `device_id` (string): Unique device identifier
- `status` (string): 'connected', 'disconnected', 'syncing'
- `created_at` (datetime): Connection creation timestamp

### Optional Fields
- `device_name` (string): User-friendly device name
- `last_sync` (datetime): Last successful sync timestamp
- `capabilities` (object): Device capabilities
  - `heart_rate` (boolean): Can measure heart rate
  - `gps` (boolean): Has GPS
  - `notifications` (boolean): Can receive notifications
  - `vibration` (boolean): Has vibration
  - `battery_level` (number): Current battery percentage
- `firmware_version` (string): Device firmware version
- `model` (string): Device model name
- `sync_enabled` (boolean): Whether auto-sync is enabled
- `updated_at` (datetime): Last update timestamp

### Relationships
- **Many-to-One**: `User` (connection belongs to one user)

### Example JSON
```json
{
  "id": "wearable-123e4567-e89b-12d3-a456-426614174444",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "device_type": "apple_watch",
  "device_id": "watch-abc123xyz",
  "device_name": "Alex's Apple Watch",
  "status": "connected",
  "last_sync": "2024-01-20T16:30:00Z",
  "capabilities": {
    "heart_rate": true,
    "gps": true,
    "notifications": true,
    "vibration": true,
    "battery_level": 85
  },
  "firmware_version": "watchOS 10.2",
  "model": "Apple Watch Series 9",
  "sync_enabled": true,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-20T16:30:00Z"
}
```

---

## 8. SavedTrail (Junction Entity)

Represents a user's saved/favorited trail.

### Required Fields
- `id` (string): Unique identifier (UUID)
- `user_id` (string): Foreign key to `User.id`
- `trail_id` (string): Foreign key to `Trail.id`
- `created_at` (datetime): When trail was saved

### Optional Fields
- `notes` (string): User's personal notes about the trail
- `priority` (string): 'high', 'medium', 'low' - user's priority for this trail
- `planned_date` (datetime): When user plans to hike this trail
- `updated_at` (datetime): Last update timestamp

### Relationships
- **Many-to-One**: `User` (saved trail belongs to one user)
- **Many-to-One**: `Trail` (saved trail references one trail)

### Example JSON
```json
{
  "id": "saved-456e7890-e89b-12d3-a456-426614174555",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "trail_id": "trail-123e4567-e89b-12d3-a456-426614174000",
  "notes": "Want to do this in spring when waterfalls are flowing",
  "priority": "high",
  "planned_date": "2024-05-15T00:00:00Z",
  "created_at": "2024-01-10T12:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

---

## Key Relationships Summary

1. **Trails belong to Parks**: Every trail has a `park_id` foreign key
2. **Hikes belong to Trails**: Every hike session has a `trail_id` foreign key (not `park_id`)
3. **Users own Hikes**: Every hike session has a `user_id` foreign key
4. **Users save Trails**: Many-to-many relationship via `SavedTrail` junction entity
5. **Hikes have Photos**: One-to-many relationship (hike can have many photos)
6. **Hikes have Fitness Metrics**: One-to-one relationship (each hike has one fitness record)
7. **Users have Wearable Connections**: One-to-many relationship (user can have multiple devices)

---

## Database Schema Considerations

### Indexes
- `User.email` (unique index)
- `Trail.park_id` (index for park lookups)
- `HikeSession.user_id` (index for user's hikes)
- `HikeSession.trail_id` (index for trail's hikes)
- `HikeSession.status` (index for filtering active/completed hikes)
- `Photo.hike_session_id` (index for hike photos)
- `SavedTrail.user_id` + `SavedTrail.trail_id` (composite unique index)

### Constraints
- `HikeSession.trail_id` → `Trail.id` (foreign key constraint)
- `Trail.park_id` → `Park.id` (foreign key constraint)
- `SavedTrail.user_id` + `SavedTrail.trail_id` (unique constraint - user can't save same trail twice)

---

## API Endpoint Examples

### Get User's Hikes
```
GET /api/v1/users/{user_id}/hikes
```

### Get Trail's Hikes
```
GET /api/v1/trails/{trail_id}/hikes
```

### Get Park's Trails
```
GET /api/v1/parks/{park_id}/trails
```

### Get User's Saved Trails
```
GET /api/v1/users/{user_id}/saved-trails
```

### Get Hike's Photos
```
GET /api/v1/hikes/{hike_id}/photos
```

### Get Hike's Fitness Metrics
```
GET /api/v1/hikes/{hike_id}/fitness-metrics
```
