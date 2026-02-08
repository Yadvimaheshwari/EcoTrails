### Mobile parity QA test plan (manual)

#### Explore
- **Search**
  - Enter “Yosemite National Park”
  - Verify results render and tapping navigates to Park detail
- **Nearby**
  - Verify nearby cards render (or gracefully empty on error)
- **Browse by state**
  - Tap `CA` then `CO`
  - Verify a horizontal list of NPS parks loads
  - Tap a park and confirm it navigates to Park detail (via place search)

#### Park detail (PlaceDetail)
- **Loading state**
  - Open a park; verify “Loading park details…” shows briefly
- **Stats**
  - Verify Trails count and Total miles render
- **Weather/Alerts**
  - Verify Weather and Alerts cards appear when available
- **Offline map (PDF)**
  - Tap “📥 Download Offline Map (PDF)”
  - If available: verify “Offline map downloaded” appears and “Open” works
  - If not available: verify message “Offline map not available for this park” and button disables
  - Tap “View all offline maps” and confirm the downloaded map appears in the list

#### Offline maps list
- **List**
  - Open `Offline maps` screen from a park
  - Verify downloaded maps appear with size/date
- **Open**
  - Tap Open and confirm PDF opens
- **Delete**
  - Tap Delete and confirm it is removed

#### Start Hike + Active Hike
- From a park, select a trail and tap “🥾 Start Hike”
- Verify During Hike shows “Preparing your hike…” then renders map
- Background the app for ~10s, relaunch, verify active hike state is still present (store persistence)

