### Web → iOS parity checklist (source of truth: web)

| Web feature/screen | Web path | Mobile status | Mobile implementation |
|---|---:|---|---|
| Explore (search + nearby) | `/explore` | Partial | `apps/mobile/src/screens/ExploreScreen.tsx` (search + nearby map; state-wise browse pending) |
| State-wise park browsing | (web UX requirement) | **Pending** | Will add state picker + `/api/nps/state/{stateCode}` browse flow in Explore |
| Park detail (stats, actions, maps, trails) | `/places/[id]` | Partial → **Improving** | `apps/mobile/src/screens/PlaceDetailScreen.tsx` (now aligns to `/api/v1/places/{id}` + `/trails`, adds offline map + weather/alerts cards; more UI parity pending) |
| Trail modal | Park page bottom sheet | Partial | `apps/mobile/src/components/discovery/TrailSelectSheet.tsx` (offline map button pending) |
| Start Hike → Active Hike | `/hikes/[id]/live` | Implemented | `TrackingSetupScreen` → `DuringHikeScreen` (trail coords passed; no SF defaults) |
| Discoveries capture flow | Hike mode + journal hike page | Implemented | `DuringHikeScreen` + discovery components |
| Journal (plans + hikes) | `/journal/*` | Implemented | `JournalScreen`, `TripPlannerScreen`, `TripPlansScreen`, `TripPlanDetailScreen`, `HikeDetailScreen` |
| Offline maps (download/cache/list/open) | Park page “Download Offline Map (PDF)” | **Implemented (PDF local storage)** | `apps/mobile/src/services/offlinePdfMaps.ts`, `OfflineMapsScreen`, button on `PlaceDetailScreen` |
| Alerts section | Park page | Partial | `PlaceDetailScreen` now shows first alert summary; needs full list + empty/error states |
| Weather section | Park page | Partial | `PlaceDetailScreen` shows summary; needs expanded details like web |
| Hike session persistence | (web active hike continues) | **Pending** | Add zustand persist for `useHikeStore` + resume logic |

### Notes
- **API parity**: mobile now uses `/api/v1/places/{id}` and `/api/v1/places/{id}/trails` like web; offline maps use `/api/v1/places/{id}/offline-map/pdf` and respect `{available:false}`.
- **Offline PDF storage**: stored under `expo-file-system` `DocumentDirectory/offline-maps/` with an AsyncStorage index.

