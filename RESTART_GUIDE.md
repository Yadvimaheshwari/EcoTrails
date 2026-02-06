# 🚀 EcoTrails Restart Guide

## Quick Restart (After Bug Fixes)

### 1. Backend Restart
```bash
cd /Users/ayushyajnik/Desktop/Python/EcoAtlas/EcoTrails

# Kill existing backend
pkill -f "python.*main.py"

# Restart backend
./start_backend.sh
```

**Wait for:** `Application startup complete`

### 2. Frontend Restart
```bash
cd /Users/ayushyajnik/Desktop/Python/EcoAtlas/EcoTrails/apps/web

# Clear Next.js cache
rm -rf .next

# Clear node_modules cache (if needed)
rm -rf node_modules/.cache

# Restart dev server
npm run dev
```

**Wait for:** `✓ Ready in XXXms`

### 3. Open App
```
http://localhost:3000/explore
```

---

## Verification Tests

### Test 1: Use My Location
1. Click "Use my location" button
2. **Expect:** Button shows "Locating..." spinner
3. **Expect:** Nearby trails appear (not empty)
4. **Check logs:** Should see `nearby radius_meters=48280` (not 30)

### Test 2: Search Parks
1. Search "national park"
2. **Expect:** List of parks appears
3. **Expect:** No `<sqlalchemy.orm.session.Session>` in backend logs
4. **Check:** Each park has a valid place ID

### Test 3: Click Park
1. Click any park from search results
2. **Expect:** Navigate to `/places/{placeId}` (NOT `/places/undefined`)
3. **Expect:** Park page loads with trails
4. **Check logs:** Should NOT see `GET /api/v1/places/undefined`

### Test 4: Start Hike
1. Click "Start hike" on any trail
2. **Expect:** Hike starts successfully
3. **Expect:** Active hike page loads
4. **Check:** `/api/v1/hikes/active` returns the hike (not 404)

---

## What Fixed?

- ✅ Radius: 30 miles now converts to 48,280 meters
- ✅ Search: No more Session object in URLs
- ✅ Navigation: No more `/places/undefined`
- ✅ Active hike: Endpoint now exists

---

## Still Broken? Debug Steps

### Issue: No nearby trails found
```bash
# Check backend logs for radius conversion
grep "nearby radius_meters" [backend_log_file]

# Should see: "Converted radius 30 miles → 48280 meters"
```

### Issue: Search returning errors
```bash
# Check backend logs for Session leaks
grep "sqlalchemy.orm.session.Session" [backend_log_file]

# Should see: NOTHING (no matches)
```

### Issue: Still seeing `/places/undefined`
```bash
# Check frontend console for place ID warnings
# Should see: "Invalid place ID detected:" if any remain

# Check network tab: requests should go to `/places/{valid_id}`
```

---

## Need More Help?

See `CRITICAL_BUGS_FIXED.md` for detailed explanation of each fix.
