from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger("EcoAtlas.NPSScraper")


NPS_BASE = "https://www.nps.gov"


def derive_park_code_from_nps_url(url: str) -> Optional[str]:
    """
    Derive parkCode from a canonical NPS URL path, e.g.
      https://www.nps.gov/dena/index.htm -> dena
      https://www.nps.gov/glac/planyourvisit/maps.htm -> glac
    Returns lowercase parkCode or None.
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return None
        if "nps.gov" not in (parsed.netloc or ""):
            return None
        parts = [p for p in (parsed.path or "").split("/") if p]
        if not parts:
            return None
        # first segment after domain is parkCode in NPS URLs
        code = parts[0].strip().lower()
        if not code or code in ("state", "subjects", "aboutus", "index.htm"):
            return None
        # park codes are typically 4 chars but not always; allow 3-8 alnum
        if not re.fullmatch(r"[a-z0-9]{3,8}", code):
            return None
        return code
    except Exception:
        return None


def _absolute_nps_url(base_url: str, href: str) -> Optional[str]:
    href_s = (href or "").strip()
    if not href_s:
        return None
    abs_url = urljoin(base_url, href_s)
    try:
        parsed = urlparse(abs_url)
        if parsed.scheme not in ("http", "https"):
            return None
        if "nps.gov" not in (parsed.netloc or ""):
            return None
        return abs_url
    except Exception:
        return None


def _head_pdf_ok(url: str) -> Tuple[bool, int, str]:
    try:
        r = requests.head(url, timeout=10, allow_redirects=True, headers={"User-Agent": "EcoTrails/1.0"})
        ct = (r.headers.get("content-type") or "").split(";")[0].strip().lower()
        return (r.status_code == 200 and "application/pdf" in ct, int(r.status_code), ct)
    except Exception:
        return (False, 0, "")


def _rank_pdf(url: str, park_code: str) -> int:
    u = (url or "").lower()
    filename = u.rsplit("/", 1)[-1]
    score = 0
    pc = (park_code or "").lower()
    if pc and pc in filename:
        score += 40
    if "map" in filename or "map" in u:
        score += 20
    if "trail" in filename or "trail" in u:
        score += 15
    if "brochure" in filename or "brochure" in u or "visitor" in u or "guide" in u:
        score += 10
    return score


def scrape_state_parks(state_code: str) -> Dict[str, Any]:
    """
    Scrape https://www.nps.gov/state/{stateCode}/index.htm and return parks list:
      [{ name, parkCode, url, quickLinks: { maps?, basicInfo? } }]
    """
    sc = (state_code or "").strip().lower()
    url = f"{NPS_BASE}/state/{sc}/index.htm"
    resp = requests.get(url, timeout=15, headers={"User-Agent": "EcoTrails/1.0"})
    if resp.status_code != 200:
        return {"success": False, "stateCode": sc, "url": url, "parks": []}

    soup = BeautifulSoup(resp.content, "html.parser")
    parks: List[Dict[str, Any]] = []

    # Heuristic: park links are usually /{parkCode}/index.htm anchors
    for a in soup.find_all("a"):
        href = a.get("href") or ""
        if "/index.htm" not in href:
            continue
        abs_url = _absolute_nps_url(url, href)
        if not abs_url:
            continue
        park_code = derive_park_code_from_nps_url(abs_url)
        if not park_code:
            continue
        name = (a.get_text() or "").strip()
        if not name:
            continue
        parks.append(
            {
                "name": name,
                "parkCode": park_code,
                "url": f"{NPS_BASE}/{park_code}/index.htm",
                "canonicalUrl": f"{NPS_BASE}/{park_code}/index.htm",
                "quickLinks": {
                    "basicInfo": f"{NPS_BASE}/{park_code}/planyourvisit/basicinfo.htm",
                    "maps": f"{NPS_BASE}/{park_code}/planyourvisit/maps.htm",
                    "brochures": f"{NPS_BASE}/{park_code}/planyourvisit/brochures.htm",
                },
            }
        )

    # de-dupe by parkCode
    by_code: Dict[str, Dict[str, Any]] = {}
    for p in parks:
        by_code[p["parkCode"]] = p

    return {"success": True, "stateCode": sc, "url": url, "parks": list(by_code.values())}


def _extract_pdf_candidates_from_page(page_url: str, html: bytes) -> List[str]:
    soup = BeautifulSoup(html, "html.parser")
    urls: List[str] = []
    for a in soup.find_all("a"):
        href = a.get("href")
        if not href:
            continue
        href_s = str(href).strip()
        if ".pdf" in href_s.lower() or "/upload/" in href_s.lower():
            abs_url = _absolute_nps_url(page_url, href_s)
            if abs_url:
                urls.append(abs_url)
    # de-dupe
    out = []
    seen = set()
    for u in urls:
        if u in seen:
            continue
        seen.add(u)
        out.append(u)
    return out


def scrape_park_detail(park_code: str) -> Dict[str, Any]:
    """
    Scrape key NPS pages and return:
      { success, parkCode, pages, summary, contact, mapAssets: [ {url,title?,status,contentType,rank} ] }
    """
    pc = (park_code or "").strip().lower()
    pages = {
        "index": f"{NPS_BASE}/{pc}/index.htm",
        "basicInfo": f"{NPS_BASE}/{pc}/planyourvisit/basicinfo.htm",
        "maps": f"{NPS_BASE}/{pc}/planyourvisit/maps.htm",
        "brochures": f"{NPS_BASE}/{pc}/planyourvisit/brochures.htm",
    }

    def _get(u: str) -> Tuple[int, bytes]:
        r = requests.get(u, timeout=15, headers={"User-Agent": "EcoTrails/1.0"})
        return int(r.status_code), (r.content or b"")

    index_status, index_html = _get(pages["index"])
    basic_status, basic_html = _get(pages["basicInfo"])
    maps_status, maps_html = _get(pages["maps"])
    broch_status, broch_html = _get(pages["brochures"])

    summary: Dict[str, Any] = {"name": None, "description": None, "canonicalUrl": pages["index"]}
    contact: Dict[str, Any] = {}

    # Minimal parsing (best-effort)
    if index_status == 200:
        soup = BeautifulSoup(index_html, "html.parser")
        title = (soup.title.get_text().strip() if soup.title else None)
        summary["name"] = title

    if basic_status == 200:
        soup = BeautifulSoup(basic_html, "html.parser")
        # best-effort: first tel/mail in page
        tel = soup.find("a", href=lambda x: x and x.startswith("tel:"))
        mail = soup.find("a", href=lambda x: x and x.startswith("mailto:"))
        if tel:
            contact["phone"] = (tel.get("href") or "").replace("tel:", "")
        if mail:
            contact["email"] = (mail.get("href") or "").replace("mailto:", "")

    candidates: List[str] = []
    if maps_status == 200:
        candidates.extend(_extract_pdf_candidates_from_page(pages["maps"], maps_html))
    if broch_status == 200:
        candidates.extend(_extract_pdf_candidates_from_page(pages["brochures"], broch_html))

    # HEAD validate and rank
    assets: List[Dict[str, Any]] = []
    for u in candidates:
        ok, status, ct = _head_pdf_ok(u)
        if not ok:
            continue
        assets.append(
            {
                "url": u,
                "status": status,
                "contentType": ct,
                "rank": _rank_pdf(u, pc),
            }
        )

    assets.sort(key=lambda a: int(a.get("rank") or 0), reverse=True)

    return {
        "success": True,
        "parkCode": pc,
        "pages": pages,
        "summary": summary,
        "contact": contact,
        "mapAssets": assets,
    }


def pick_best_pdf(map_assets: List[Dict[str, Any]], park_code: str) -> Optional[str]:
    if not map_assets:
        return None
    # assets are already ranked; still be defensive
    best = sorted(map_assets, key=lambda a: int(a.get("rank") or 0), reverse=True)[0]
    return (best.get("url") or "").strip() or None

