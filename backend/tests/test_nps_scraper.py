import unittest
from unittest import mock


class NPSScraperTests(unittest.TestCase):
    def test_derive_park_code_from_url(self):
        from backend.nps_scraper import derive_park_code_from_nps_url

        self.assertEqual(derive_park_code_from_nps_url("https://www.nps.gov/dena/index.htm"), "dena")
        self.assertEqual(derive_park_code_from_nps_url("https://www.nps.gov/glac/planyourvisit/maps.htm"), "glac")
        self.assertIsNone(derive_park_code_from_nps_url("https://www.nps.gov/state/ca/index.htm"))
        self.assertIsNone(derive_park_code_from_nps_url("https://example.com/dena/index.htm"))

    def test_pdf_discovery_filters_non_pdf_and_404(self):
        from backend.nps_scraper import scrape_park_detail

        class _Resp:
            def __init__(self, status_code: int, content: bytes = b"", headers=None):
                self.status_code = status_code
                self.content = content
                self.headers = headers or {}

        # maps page contains one pdf and one upload that's actually html
        maps_html = b"""
        <html><body>
          <a href="/dena/planyourvisit/upload/dena_map.pdf">Map PDF</a>
          <a href="/dena/planyourvisit/upload/not_a_pdf">Broken</a>
        </body></html>
        """
        brochures_html = b"<html><body>No PDFs</body></html>"

        def _fake_get(url, *args, **kwargs):
            if url.endswith("/dena/index.htm"):
                return _Resp(200, b"<html><title>Denali National Park</title></html>")
            if url.endswith("/dena/planyourvisit/basicinfo.htm"):
                return _Resp(200, b"<html><a href='tel:+1-555-555'>Call</a></html>")
            if url.endswith("/dena/planyourvisit/maps.htm"):
                return _Resp(200, maps_html)
            if url.endswith("/dena/planyourvisit/brochures.htm"):
                return _Resp(200, brochures_html)
            return _Resp(404, b"")

        def _fake_head(url, *args, **kwargs):
            if url.endswith("dena_map.pdf"):
                return _Resp(200, b"", headers={"content-type": "application/pdf"})
            if url.endswith("/not_a_pdf"):
                return _Resp(200, b"", headers={"content-type": "text/html"})
            return _Resp(404, b"", headers={"content-type": "text/html"})

        with mock.patch("backend.nps_scraper.requests.get", side_effect=_fake_get):
            with mock.patch("backend.nps_scraper.requests.head", side_effect=_fake_head):
                data = scrape_park_detail("dena")

        assets = data.get("mapAssets") or []
        self.assertEqual(len(assets), 1)
        self.assertTrue(assets[0]["url"].endswith("dena_map.pdf"))

    def test_integration_like_mocked_maps_page_pdf_found(self):
        from backend.nps_scraper import scrape_park_detail, pick_best_pdf

        class _Resp:
            def __init__(self, status_code: int, content: bytes = b"", headers=None):
                self.status_code = status_code
                self.content = content
                self.headers = headers or {}

        maps_html = b"""
        <html><body>
          <a href="/dena/planyourvisit/upload/Denali_Trail_Map.pdf">Print-friendly trail map</a>
        </body></html>
        """

        def _fake_get(url, *args, **kwargs):
            if url.endswith("/dena/index.htm"):
                return _Resp(200, b"<html><title>Denali National Park & Preserve (U.S. National Park Service)</title></html>")
            if url.endswith("/dena/planyourvisit/basicinfo.htm"):
                return _Resp(200, b"<html></html>")
            if url.endswith("/dena/planyourvisit/maps.htm"):
                return _Resp(200, maps_html)
            if url.endswith("/dena/planyourvisit/brochures.htm"):
                return _Resp(200, b"<html></html>")
            return _Resp(404, b"")

        def _fake_head(url, *args, **kwargs):
            return _Resp(200, b"", headers={"content-type": "application/pdf"})

        with mock.patch("backend.nps_scraper.requests.get", side_effect=_fake_get):
            with mock.patch("backend.nps_scraper.requests.head", side_effect=_fake_head):
                detail = scrape_park_detail("dena")

        pdf = pick_best_pdf(detail.get("mapAssets") or [], "dena")
        self.assertIsNotNone(pdf)
        self.assertIn("/dena/planyourvisit/upload/Denali_Trail_Map.pdf", pdf)

    def test_rocky_mountain_query_selects_romo_and_no_defaults(self):
        from backend.nps_matcher import select_best_nps_park

        parks = [
            {"parkCode": "acad", "fullName": "Acadia National Park"},
            {"parkCode": "romo", "fullName": "Rocky Mountain National Park"},
            {"parkCode": "yell", "fullName": "Yellowstone National Park"},
        ]
        sel = select_best_nps_park("Rocky Mountain National Park", parks, min_score=50)
        self.assertIsNotNone(sel)
        self.assertEqual(sel.park_code, "romo")


if __name__ == "__main__":
    unittest.main()

