"""
Official Park Map Service

Fetches official park maps (PDFs) from NPS and other sources.
Provides URLs for offline caching on the frontend.
Enhanced with web scraping to dynamically discover map PDFs.
"""

import os
import logging
import hashlib
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
from urllib.parse import urljoin, urlparse
import re
from difflib import SequenceMatcher
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# Curated list of NPS park maps
# These are direct links to official NPS PDF maps
NPS_MAP_DATABASE: Dict[str, Dict[str, str]] = {
    # California
    "yosemite": {
        "map_url": "https://www.nps.gov/yose/planyourvisit/upload/YOSEmap1.pdf",
        "source": "NPS Yosemite",
        "map_type": "park_map"
    },
    "redwood": {
        "map_url": "https://www.nps.gov/redw/planyourvisit/upload/REDW_Map.pdf",
        "source": "NPS Redwood",
        "map_type": "park_map"
    },
    "joshua tree": {
        "map_url": "https://www.nps.gov/jotr/planyourvisit/upload/JOTR_Map.pdf",
        "source": "NPS Joshua Tree",
        "map_type": "park_map"
    },
    "death valley": {
        "map_url": "https://www.nps.gov/deva/planyourvisit/upload/DEVA_Map.pdf",
        "source": "NPS Death Valley",
        "map_type": "park_map"
    },
    "sequoia": {
        "map_url": "https://www.nps.gov/seki/planyourvisit/upload/SEKI_Map.pdf",
        "source": "NPS Sequoia & Kings Canyon",
        "map_type": "park_map"
    },
    "pinnacles": {
        "map_url": "https://www.nps.gov/pinn/planyourvisit/upload/PINN_Map.pdf",
        "source": "NPS Pinnacles",
        "map_type": "park_map"
    },
    "channel islands": {
        "map_url": "https://www.nps.gov/chis/planyourvisit/upload/CHIS_Map.pdf",
        "source": "NPS Channel Islands",
        "map_type": "park_map"
    },
    "lassen volcanic": {
        "map_url": "https://www.nps.gov/lavo/planyourvisit/upload/LAVO_Map.pdf",
        "source": "NPS Lassen Volcanic",
        "map_type": "park_map"
    },
    # Arizona
    "grand canyon": {
        "map_url": "https://www.nps.gov/grca/planyourvisit/upload/grca-yavapai.pdf",
        "source": "NPS Grand Canyon",
        "map_type": "trail_map"
    },
    "saguaro": {
        "map_url": "https://www.nps.gov/sagu/planyourvisit/upload/SAGU_Map.pdf",
        "source": "NPS Saguaro",
        "map_type": "park_map"
    },
    "petrified forest": {
        "map_url": "https://www.nps.gov/pefo/planyourvisit/upload/PEFO_Map.pdf",
        "source": "NPS Petrified Forest",
        "map_type": "park_map"
    },
    # Utah
    "zion": {
        "map_url": "https://www.nps.gov/zion/planyourvisit/upload/ZION_Map.pdf",
        "source": "NPS Zion",
        "map_type": "park_map"
    },
    "bryce canyon": {
        "map_url": "https://www.nps.gov/brca/planyourvisit/upload/BRCA_Map.pdf",
        "source": "NPS Bryce Canyon",
        "map_type": "park_map"
    },
    "arches": {
        "map_url": "https://www.nps.gov/arch/planyourvisit/upload/ARCH_Map.pdf",
        "source": "NPS Arches",
        "map_type": "park_map"
    },
    "canyonlands": {
        "map_url": "https://www.nps.gov/cany/planyourvisit/upload/CANY_Map.pdf",
        "source": "NPS Canyonlands",
        "map_type": "park_map"
    },
    "capitol reef": {
        "map_url": "https://www.nps.gov/care/planyourvisit/upload/CARE_Map.pdf",
        "source": "NPS Capitol Reef",
        "map_type": "park_map"
    },
    # Colorado
    "rocky mountain": {
        "map_url": "https://www.nps.gov/romo/planyourvisit/upload/ROMO_Map.pdf",
        "source": "NPS Rocky Mountain",
        "map_type": "park_map"
    },
    "mesa verde": {
        "map_url": "https://www.nps.gov/meve/planyourvisit/upload/MEVE_Map.pdf",
        "source": "NPS Mesa Verde",
        "map_type": "park_map"
    },
    "great sand dunes": {
        "map_url": "https://www.nps.gov/grsa/planyourvisit/upload/GRSA_Map.pdf",
        "source": "NPS Great Sand Dunes",
        "map_type": "park_map"
    },
    "black canyon": {
        "map_url": "https://www.nps.gov/blca/planyourvisit/upload/BLCA_Map.pdf",
        "source": "NPS Black Canyon of the Gunnison",
        "map_type": "park_map"
    },
    # Wyoming
    "yellowstone": {
        "map_url": "https://www.nps.gov/yell/planyourvisit/upload/YELL_Map.pdf",
        "source": "NPS Yellowstone",
        "map_type": "park_map"
    },
    "grand teton": {
        "map_url": "https://www.nps.gov/grte/planyourvisit/upload/GRTE_Map.pdf",
        "source": "NPS Grand Teton",
        "map_type": "park_map"
    },
    # Washington
    "olympic": {
        "map_url": "https://www.nps.gov/olym/planyourvisit/upload/OLYM_Map.pdf",
        "source": "NPS Olympic",
        "map_type": "park_map"
    },
    "mount rainier": {
        "map_url": "https://www.nps.gov/mora/planyourvisit/upload/MORA_Map.pdf",
        "source": "NPS Mount Rainier",
        "map_type": "park_map"
    },
    "north cascades": {
        "map_url": "https://www.nps.gov/noca/planyourvisit/upload/NOCA_Map.pdf",
        "source": "NPS North Cascades",
        "map_type": "park_map"
    },
    # Oregon
    "crater lake": {
        "map_url": "https://www.nps.gov/crla/planyourvisit/upload/CRLA_Map.pdf",
        "source": "NPS Crater Lake",
        "map_type": "park_map"
    },
    # Montana
    "glacier": {
        "map_url": "https://www.nps.gov/glac/planyourvisit/upload/GLAC_Map.pdf",
        "source": "NPS Glacier",
        "map_type": "park_map"
    },
    # Texas
    "big bend": {
        "map_url": "https://www.nps.gov/bibe/planyourvisit/upload/BIBE_Map.pdf",
        "source": "NPS Big Bend",
        "map_type": "park_map"
    },
    "guadalupe mountains": {
        "map_url": "https://www.nps.gov/gumo/planyourvisit/upload/GUMO_Map.pdf",
        "source": "NPS Guadalupe Mountains",
        "map_type": "park_map"
    },
    # Florida
    "everglades": {
        "map_url": "https://www.nps.gov/ever/planyourvisit/upload/EVER_Map.pdf",
        "source": "NPS Everglades",
        "map_type": "park_map"
    },
    "dry tortugas": {
        "map_url": "https://www.nps.gov/drto/planyourvisit/upload/DRTO_Map.pdf",
        "source": "NPS Dry Tortugas",
        "map_type": "park_map"
    },
    # Alaska
    "denali": {
        "map_url": "https://www.nps.gov/dena/planyourvisit/upload/DENA_Map.pdf",
        "source": "NPS Denali",
        "map_type": "park_map"
    },
    "glacier bay": {
        "map_url": "https://www.nps.gov/glba/planyourvisit/upload/GLBA_Map.pdf",
        "source": "NPS Glacier Bay",
        "map_type": "park_map"
    },
    "kenai fjords": {
        "map_url": "https://www.nps.gov/kefj/planyourvisit/upload/KEFJ_Map.pdf",
        "source": "NPS Kenai Fjords",
        "map_type": "park_map"
    },
    # Hawaii
    "hawaii volcanoes": {
        "map_url": "https://www.nps.gov/havo/planyourvisit/upload/HAVO_Map.pdf",
        "source": "NPS Hawaii Volcanoes",
        "map_type": "park_map"
    },
    "haleakala": {
        "map_url": "https://www.nps.gov/hale/planyourvisit/upload/HALE_Map.pdf",
        "source": "NPS Haleakala",
        "map_type": "park_map"
    },
    # Other notable parks
    "acadia": {
        "map_url": "https://www.nps.gov/acad/planyourvisit/upload/ACAD_Map.pdf",
        "source": "NPS Acadia",
        "map_type": "park_map"
    },
    "shenandoah": {
        "map_url": "https://www.nps.gov/shen/planyourvisit/upload/SHEN_Map.pdf",
        "source": "NPS Shenandoah",
        "map_type": "park_map"
    },
    "great smoky mountains": {
        "map_url": "https://www.nps.gov/grsm/planyourvisit/upload/GRSM_Map.pdf",
        "source": "NPS Great Smoky Mountains",
        "map_type": "park_map"
    },
    # Bay Area local parks
    "golden gate": {
        "map_url": "https://www.nps.gov/goga/planyourvisit/upload/GOGA_Map.pdf",
        "source": "NPS Golden Gate",
        "map_type": "park_map"
    },
    "muir woods": {
        "map_url": "https://www.nps.gov/muwo/planyourvisit/upload/MUWO_Map.pdf",
        "source": "NPS Muir Woods",
        "map_type": "trail_map"
    },
    "point reyes": {
        "map_url": "https://www.nps.gov/pore/planyourvisit/upload/PORE_Map.pdf",
        "source": "NPS Point Reyes",
        "map_type": "park_map"
    },
}


def scrape_park_map_urls(park_url: str, park_name: str) -> List[Dict[str, Any]]:
    """
    Scrape park website for downloadable map PDFs
    Returns list of found maps with URLs and descriptions
    """
    try:
        response = requests.get(park_url, timeout=15, headers={
            'User-Agent': 'EcoTrails/1.0 (Educational trail mapping app)'
        })
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        maps = []
        
        # Find all PDF links
        pdf_links = soup.find_all('a', href=lambda x: x and '.pdf' in x.lower())
        
        for link in pdf_links:
            href = link.get('href')
            text = link.get_text().strip().lower()
            
            # Filter for map-related PDFs
            map_keywords = ['map', 'trail', 'park guide', 'visitor guide', 'hiking', 'brochure']
            if any(keyword in text for keyword in map_keywords):
                full_url = urljoin(park_url, href)
                
                try:
                    # Verify PDF is accessible
                    head_response = requests.head(full_url, timeout=5, allow_redirects=True)
                    if head_response.status_code == 200:
                        size_bytes = int(head_response.headers.get('content-length', 0))
                        maps.append({
                            'url': full_url,
                            'title': link.get_text().strip() or 'Park Map',
                            'type': 'trail_map' if 'trail' in text else 'park_map',
                            'size_mb': round(size_bytes / (1024*1024), 2) if size_bytes > 0 else 0
                        })
                except Exception as e:
                    logger.debug(f"Could not verify {full_url}: {e}")
                    continue
        
        logger.info(f"[Scraper] Found {len(maps)} maps for {park_name}")
        return maps
        
    except Exception as e:
        logger.error(f"[Scraper] Failed for {park_name}: {e}")
        return []

def _norm(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"[^a-z0-9\s]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def _safe_base_url(url: str) -> Optional[str]:
    """
    Only allow http(s) URLs and return scheme+netloc base.
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return None
        if not parsed.netloc:
            return None
        return f"{parsed.scheme}://{parsed.netloc}"
    except Exception:
        return None

def _pick_best_map(maps: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Prefer trail maps, then larger files (when size is known).
    """
    if not maps:
        return None
    # Prefer trail maps
    trail = [m for m in maps if (m.get("type") or "").lower() == "trail_map"]
    candidates = trail or maps
    # Prefer larger (likely more detailed) if size_mb available
    def _score(m: Dict[str, Any]) -> Tuple[int, float]:
        has_size = 1 if (m.get("size_mb") or 0) > 0 else 0
        size = float(m.get("size_mb") or 0)
        return (has_size, size)
    candidates = sorted(candidates, key=_score, reverse=True)
    return candidates[0]

def build_osm_static_map_url(
    lat: float,
    lng: float,
    zoom: int = 12,
    size: str = "1024x768",
) -> str:
    """
    Generate a reliable, no-scrape fallback map image URL.
    Uses staticmap.openstreetmap.de.
    """
    # Keep params conservative to avoid overly large images.
    z = max(1, min(int(zoom), 18))
    return (
        "https://staticmap.openstreetmap.de/staticmap.php"
        f"?center={lat},{lng}"
        f"&zoom={z}"
        f"&size={size}"
        f"&markers={lat},{lng},red-pushpin"
    )


def scrape_nps_park_page(park_code: str) -> Dict[str, Any]:
    """
    Scrape NPS park's official page for map links
    Tries multiple common URL patterns
    """
    nps_urls = [
        f"https://www.nps.gov/{park_code}/planyourvisit/maps.htm",
        f"https://www.nps.gov/{park_code}/planyourvisit/brochures.htm",
        f"https://www.nps.gov/{park_code}/planyourvisit/directions.htm"
    ]
    
    for url in nps_urls:
        try:
            maps = scrape_park_map_urls(url, park_code)
            if maps:
                return {
                    'success': True,
                    'maps': maps,
                    'source_url': url,
                    'scraped_at': datetime.utcnow().isoformat()
                }
        except Exception as e:
            logger.debug(f"Failed to scrape {url}: {e}")
            continue
    
    return {'success': False, 'maps': []}

def _extract_pdf_links_from_html(html: bytes, *, base_url: str) -> List[str]:
    """
    Parse HTML and return all .pdf links (absolute or relative) normalized to absolute https://www.nps.gov/ URLs.
    """
    try:
        soup = BeautifulSoup(html, "html.parser")
    except Exception:
        return []

    urls: List[str] = []
    for a in soup.find_all("a"):
        href = a.get("href")
        if not href:
            continue
        href_s = str(href).strip()
        if ".pdf" not in href_s.lower():
            continue
        abs_url = urljoin(base_url, href_s)
        try:
            parsed = urlparse(abs_url)
            if parsed.scheme not in ("http", "https"):
                continue
            # normalize to nps.gov only
            if "nps.gov" not in (parsed.netloc or ""):
                continue
            urls.append(abs_url)
        except Exception:
            continue

    # de-dupe while preserving order
    seen = set()
    out = []
    for u in urls:
        if u in seen:
            continue
        seen.add(u)
        out.append(u)
    return out


def _head_accepts_pdf(url: str) -> Tuple[bool, int, str]:
    """
    HEAD gate: accept only (status==200 and content-type contains application/pdf).
    Returns (ok, status_code, content_type_lower).
    """
    try:
        r = requests.head(url, timeout=10, allow_redirects=True, headers={"User-Agent": "EcoTrails/1.0"})
        ct = (r.headers.get("content-type") or "").split(";")[0].strip().lower()
        return (r.status_code == 200 and "application/pdf" in ct, int(r.status_code), ct)
    except Exception:
        return (False, 0, "")


def _rank_pdf_candidate(url: str, *, park_code: str) -> int:
    """
    Rank PDFs to prefer filenames containing: map, brochure, trail, or parkCode.
    """
    u = (url or "").lower()
    filename = u.rsplit("/", 1)[-1]
    score = 0
    if park_code and park_code.lower() in filename:
        score += 40
    if "map" in filename or "map" in u:
        score += 20
    if "trail" in filename or "trail" in u:
        score += 15
    if "brochure" in filename or "brochure" in u or "visitor" in u or "guide" in u:
        score += 10
    # de-prioritize obvious non-map PDFs
    if any(bad in filename for bad in ("fee", "fees", "permit", "permits", "accessibility", "access", "press")):
        score -= 10
    return score


def discover_maps(park_code: str) -> List[str]:
    """
    Discovery-first flow (no caching, no singleton state):
      - Fetch maps.htm and brochures.htm
      - Extract all .pdf links
      - Normalize to absolute nps.gov URLs
    """
    park_code = (park_code or "").strip().lower()
    if not park_code:
        return []

    pages = [
        f"https://www.nps.gov/{park_code}/planyourvisit/maps.htm",
        f"https://www.nps.gov/{park_code}/planyourvisit/brochures.htm",
    ]

    candidates: List[str] = []
    for page_url in pages:
        try:
            resp = requests.get(page_url, timeout=15, headers={"User-Agent": "EcoTrails/1.0"})
            if resp.status_code != 200:
                logger.info(f"[OfficialMapDiscovery] parkCode={park_code} page={page_url} status={resp.status_code}")
                continue
            candidates.extend(_extract_pdf_links_from_html(resp.content, base_url=page_url))
        except Exception as e:
            logger.info(f"[OfficialMapDiscovery] parkCode={park_code} page_fetch_failed page={page_url} err={e}")
            continue

    return candidates


def discover_best_pdf_url(park_code: str) -> Optional[str]:
    """
    Given a parkCode, discover and validate a PDF URL:
      - parse .pdf links from maps.htm + brochures.htm
      - HEAD validate (200 + application/pdf)
      - rank and return best candidate
    """
    park_code = (park_code or "").strip().lower()
    candidates = discover_maps(park_code)
    if not candidates:
        return None

    accepted: List[Tuple[int, str]] = []
    for u in candidates:
        ok, status, ct = _head_accepts_pdf(u)
        if not ok:
            logger.debug(f"[OfficialMapDiscovery] parkCode={park_code} reject url={u} status={status} ct={ct!r}")
            continue
        accepted.append((_rank_pdf_candidate(u, park_code=park_code), u))

    if not accepted:
        return None

    accepted.sort(key=lambda x: x[0], reverse=True)
    return accepted[0][1]


class OfficialMapService:
    """Service for fetching official park maps with web scraping support"""
    
    def __init__(self):
        # Prevent obviously-wrong NPS matches (e.g., state parks) from being treated as NPS.
        # If the best NPS API result is below this similarity score, we do NOT scrape NPS.
        self.nps_min_match_score = float(os.environ.get("NPS_MIN_MATCH_SCORE", "0.68"))
    
    def fetch_nps_map(self, park_name: str) -> Optional[Dict[str, Any]]:
        """
        Fetch official NPS map for a park with web scraping fallback.
        Returns map URL and metadata if found.
        
        Strategy:
        1. Check cache (with TTL validation)
        2. Try hardcoded database (with URL verification)
        3. Use NPS API + web scraping for dynamic discovery
        """
        if not park_name:
            return None
        
        # Normalize park name for lookup
        normalized = park_name.lower().strip()
        
        # Step 1: Try hardcoded database with URL verification
        for key, data in NPS_MAP_DATABASE.items():
            if key in normalized or normalized in key:
                # Verify URL still works
                try:
                    response = requests.head(data["map_url"], timeout=5, allow_redirects=True)
                    if response.status_code == 200:
                        result = {
                            "success": True,
                            "park_name": park_name,
                            "map_url": data["map_url"],
                            "source": data["source"],
                            "map_type": data["map_type"],
                            "fetched_at": datetime.utcnow().isoformat(),
                            "method": "database"
                        }
                        logger.info(f"[OfficialMapService] Database map verified for {park_name}")
                        return result
                    else:
                        logger.warning(f"[OfficialMapService] Database URL broken (HTTP {response.status_code}), trying scraping")
                except Exception as e:
                    logger.warning(f"[OfficialMapService] Database URL verification failed: {e}, trying scraping")
                    # Continue to scraping fallback
        
        # Step 2: Try NPS API + discovery
        nps_api_key = os.environ.get("NPS_API_KEY")
        if nps_api_key:
            try:
                # Get park code from NPS API
                response = requests.get(
                    "https://developer.nps.gov/api/v1/parks",
                    params={"q": park_name, "limit": 5, "api_key": nps_api_key},
                    timeout=10
                )
                
                if response.status_code == 200:
                    parks = response.json().get("data", [])
                    if parks:
                        from backend.nps_matcher import select_best_nps_park

                        sel = select_best_nps_park(park_name, parks, min_score=50)
                        if not sel:
                            logger.info(f"[OfficialMapService] no NPS match >=50 for '{park_name}'")
                            return None

                        park_code = sel.park_code
                        park_full_name = sel.full_name or park_name
                        
                        # Scrape park website for maps
                        logger.info(f"[OfficialMapService] Scraping NPS website for {park_code}")
                        pdf_url = discover_best_pdf_url(park_code)
                        if pdf_url:
                            result = {
                                "success": True,
                                "park_name": park_full_name,
                                "map_url": pdf_url,
                                "source": f"NPS {park_full_name}",
                                "map_type": "park_map",
                                "park_code": park_code,
                                "fetched_at": datetime.utcnow().isoformat(),
                                "method": "discovery",
                            }
                            logger.info(f"[OfficialMapService] Discovered map PDF for {park_name}")
                            return result
                
            except Exception as e:
                logger.error(f"[OfficialMapService] NPS API + scraping failed: {e}")
        
        logger.info(f"[OfficialMapService] No map found for {park_name} after all attempts")
        return None

    def fetch_official_map_asset(
        self,
        place_name: str,
        *,
        website_url: Optional[str] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Unified entry-point for "offline map asset" downloads.

        Returns a dict:
          - success: bool
          - map_url: str | None
          - asset_type: 'pdf' | 'image' | None
          - source: str | None
          - method: str
        """
        # 1) NPS PDF (best case)
        nps = self.fetch_nps_map(place_name)
        if nps and nps.get("success") and nps.get("map_url"):
            return {
                "success": True,
                "place_name": nps.get("park_name") or place_name,
                "map_url": nps.get("map_url"),
                "asset_type": "pdf",
                "source": nps.get("source") or "Official Park Map",
                "map_type": nps.get("map_type") or "park_map",
                "method": nps.get("method") or "nps",
                "fetched_at": nps.get("fetched_at") or datetime.utcnow().isoformat(),
            }

        # 2) Scrape the park's own website (if we have it)
        base = _safe_base_url(website_url) if website_url else None
        if base:
            candidates: List[Dict[str, Any]] = []
            # Try homepage and a few common subpaths.
            paths = ["", "/maps", "/map", "/visit", "/plan", "/planyourvisit", "/trails", "/brochures"]
            for p in paths:
                url = base + p
                maps = scrape_park_map_urls(url, place_name)
                if maps:
                    candidates.extend(maps)
            best = _pick_best_map(candidates)
            if best and best.get("url"):
                return {
                    "success": True,
                    "place_name": place_name,
                    "map_url": best["url"],
                    "asset_type": "pdf" if ".pdf" in best["url"].lower() else "unknown",
                    "source": f"{place_name} website",
                    "map_type": best.get("type") or "park_map",
                    "method": "website_scrape",
                    "fetched_at": datetime.utcnow().isoformat(),
                    "all_maps": candidates[:50],
                }

        # 3) Guaranteed fallback: OSM static map image (no scraping)
        if lat is not None and lng is not None:
            try:
                url = build_osm_static_map_url(float(lat), float(lng))
                return {
                    "success": True,
                    "place_name": place_name,
                    "map_url": url,
                    "asset_type": "image",
                    "source": "OpenStreetMap (static)",
                    "map_type": "overview",
                    "method": "osm_static",
                    "fetched_at": datetime.utcnow().isoformat(),
                }
            except Exception as e:
                logger.warning(f"[OfficialMapService] Failed building OSM static URL: {e}")

        return {
            "success": False,
            "place_name": place_name,
            "map_url": None,
            "asset_type": None,
            "source": None,
            "method": "none",
            "fetched_at": datetime.utcnow().isoformat(),
        }
    
    def _fetch_from_nps_api(self, park_name: str, api_key: str) -> Optional[Dict[str, Any]]:
        """
        Fetch map URL from NPS API.
        This is a secondary method if curated list doesn't have the park.
        """
        import requests
        
        try:
            # Search for park
            response = requests.get(
                "https://developer.nps.gov/api/v1/parks",
                params={
                    "q": park_name,
                    "limit": 5,
                    "api_key": api_key
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("data") and len(data["data"]) > 0:
                    parks = data["data"]
                    from backend.nps_matcher import select_best_nps_park

                    sel = select_best_nps_park(park_name, parks, min_score=50)
                    if not sel:
                        return None
                    park_code = sel.park_code
                    pdf_url = discover_best_pdf_url(park_code)
                    if not pdf_url:
                        return None

                    return {
                        "success": True,
                        "park_name": sel.full_name or park_name,
                        "map_url": pdf_url,
                        "source": f"NPS {sel.full_name or ''}",
                        "map_type": "park_map",
                        "park_code": park_code,
                        "fetched_at": datetime.utcnow().isoformat(),
                        "method": "discovery",
                    }
        except Exception as e:
            logger.error(f"[OfficialMapService] API error: {e}")
        
        return None
    
    def get_all_available_parks(self) -> list:
        """Return list of all parks with available maps"""
        return list(NPS_MAP_DATABASE.keys())


# NOTE: no module-level singleton instance. Instantiate `OfficialMapService()` per request.
