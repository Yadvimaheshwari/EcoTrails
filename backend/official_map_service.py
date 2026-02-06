"""
Official Park Map Service

Fetches official park maps (PDFs) from NPS and other sources.
Provides URLs for offline caching on the frontend.
Enhanced with web scraping to dynamically discover map PDFs.
"""

import os
import logging
import hashlib
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from urllib.parse import urljoin
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


class OfficialMapService:
    """Service for fetching official park maps with web scraping support"""
    
    def __init__(self):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl_days = 7  # Cache maps for 7 days
    
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
        
        # Step 1: Check cache with TTL validation
        cache_key = hashlib.md5(normalized.encode()).hexdigest()
        if cache_key in self.cache:
            cached = self.cache[cache_key]
            # Check if cache is still fresh
            fetched_at = datetime.fromisoformat(cached.get('fetched_at', datetime.utcnow().isoformat()))
            if (datetime.utcnow() - fetched_at).days < self.cache_ttl_days:
                logger.info(f"[OfficialMapService] Cache hit for {park_name}")
                return cached
            else:
                logger.info(f"[OfficialMapService] Cache expired for {park_name}")
        
        # Step 2: Try hardcoded database with URL verification
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
                        self.cache[cache_key] = result
                        logger.info(f"[OfficialMapService] Database map verified for {park_name}")
                        return result
                    else:
                        logger.warning(f"[OfficialMapService] Database URL broken (HTTP {response.status_code}), trying scraping")
                except Exception as e:
                    logger.warning(f"[OfficialMapService] Database URL verification failed: {e}, trying scraping")
                    # Continue to scraping fallback
        
        # Step 3: Try NPS API + web scraping
        nps_api_key = os.environ.get("NPS_API_KEY")
        if nps_api_key:
            try:
                # Get park code from NPS API
                response = requests.get(
                    "https://developer.nps.gov/api/v1/parks",
                    params={"q": park_name, "limit": 1, "api_key": nps_api_key},
                    timeout=10
                )
                
                if response.status_code == 200:
                    parks = response.json().get("data", [])
                    if parks:
                        park_code = parks[0].get("parkCode", "")
                        park_full_name = parks[0].get("fullName", park_name)
                        
                        # Scrape park website for maps
                        logger.info(f"[OfficialMapService] Scraping NPS website for {park_code}")
                        scrape_result = scrape_nps_park_page(park_code)
                        
                        if scrape_result['success'] and scrape_result['maps']:
                            # Prefer trail maps over general park maps
                            best_map = next(
                                (m for m in scrape_result['maps'] if m['type'] == 'trail_map'),
                                scrape_result['maps'][0]
                            )
                            
                            result = {
                                'success': True,
                                'park_name': park_full_name,
                                'map_url': best_map['url'],
                                'source': f"NPS {park_full_name}",
                                'map_type': best_map['type'],
                                'park_code': park_code,
                                'fetched_at': datetime.utcnow().isoformat(),
                                'method': 'scraping',
                                'all_maps': scrape_result['maps']  # Include all found maps
                            }
                            self.cache[cache_key] = result
                            logger.info(f"[OfficialMapService] Successfully scraped map for {park_name}")
                            return result
                        else:
                            # Scraping failed, try guessing URL pattern
                            logger.info(f"[OfficialMapService] Scraping failed, trying URL pattern guess")
                            guessed_url = f"https://www.nps.gov/{park_code}/planyourvisit/upload/{park_code.upper()}_Map.pdf"
                            
                            # Verify guessed URL
                            try:
                                head_response = requests.head(guessed_url, timeout=5, allow_redirects=True)
                                if head_response.status_code == 200:
                                    result = {
                                        'success': True,
                                        'park_name': park_full_name,
                                        'map_url': guessed_url,
                                        'source': f"NPS {park_full_name}",
                                        'map_type': 'park_map',
                                        'park_code': park_code,
                                        'fetched_at': datetime.utcnow().isoformat(),
                                        'method': 'pattern_guess'
                                    }
                                    self.cache[cache_key] = result
                                    logger.info(f"[OfficialMapService] Guessed URL worked for {park_name}")
                                    return result
                            except:
                                pass
                
            except Exception as e:
                logger.error(f"[OfficialMapService] NPS API + scraping failed: {e}")
        
        logger.info(f"[OfficialMapService] No map found for {park_name} after all attempts")
        return None
    
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
                    "limit": 1,
                    "api_key": api_key
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("data") and len(data["data"]) > 0:
                    park = data["data"][0]
                    park_code = park.get("parkCode", "")
                    
                    # Construct likely map URL pattern
                    map_url = f"https://www.nps.gov/{park_code}/planyourvisit/upload/{park_code.upper()}_Map.pdf"
                    
                    return {
                        "success": True,
                        "park_name": park.get("fullName", park_name),
                        "map_url": map_url,
                        "source": f"NPS {park.get('fullName', '')}",
                        "map_type": "park_map",
                        "park_code": park_code,
                        "fetched_at": datetime.utcnow().isoformat()
                    }
        except Exception as e:
            logger.error(f"[OfficialMapService] API error: {e}")
        
        return None
    
    def get_all_available_parks(self) -> list:
        """Return list of all parks with available maps"""
        return list(NPS_MAP_DATABASE.keys())


# Singleton instance
official_map_service = OfficialMapService()
