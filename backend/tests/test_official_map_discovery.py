import unittest
from unittest import mock


class OfficialMapDiscoveryTests(unittest.TestCase):
    def test_extract_pdf_links_normalizes_relative(self):
        from backend.official_map_service import _extract_pdf_links_from_html

        html = b"""
        <html>
          <body>
            <a href="/crla/planyourvisit/upload/CRLA_TrailMap.pdf">Trail Map</a>
            <a href="upload/CRLA_Brochure.pdf">Brochure</a>
            <a href="https://www.nps.gov/crla/planyourvisit/upload/CRLA_Map.pdf">Absolute</a>
            <a href="https://example.com/not-nps.pdf">Other</a>
            <a href="/crla/planyourvisit/maps.htm">Not a pdf</a>
          </body>
        </html>
        """
        base = "https://www.nps.gov/crla/planyourvisit/maps.htm"
        urls = _extract_pdf_links_from_html(html, base_url=base)

        self.assertIn("https://www.nps.gov/crla/planyourvisit/upload/CRLA_TrailMap.pdf", urls)
        self.assertIn("https://www.nps.gov/crla/planyourvisit/upload/CRLA_Brochure.pdf", urls)
        self.assertIn("https://www.nps.gov/crla/planyourvisit/upload/CRLA_Map.pdf", urls)
        self.assertNotIn("https://example.com/not-nps.pdf", urls)

    def test_head_accepts_pdf_gating(self):
        from backend.official_map_service import _head_accepts_pdf

        class _R:
            def __init__(self, status, ct):
                self.status_code = status
                self.headers = {"content-type": ct}

        with mock.patch("backend.official_map_service.requests.head") as mhead:
            mhead.return_value = _R(404, "application/pdf")
            ok, status, ct = _head_accepts_pdf("https://www.nps.gov/x/y.pdf")
            self.assertFalse(ok)
            self.assertEqual(status, 404)

            mhead.return_value = _R(200, "text/html")
            ok, status, ct = _head_accepts_pdf("https://www.nps.gov/x/y.pdf")
            self.assertFalse(ok)
            self.assertEqual(status, 200)
            self.assertEqual(ct, "text/html")

            mhead.return_value = _R(200, "application/pdf; charset=binary")
            ok, status, ct = _head_accepts_pdf("https://www.nps.gov/x/y.pdf")
            self.assertTrue(ok)

    def test_glacier_discovery_never_requests_acad_urls(self):
        from backend.official_map_service import discover_maps

        class _Resp:
            def __init__(self, status_code: int, content: bytes):
                self.status_code = status_code
                self.content = content

        requested = []

        def _fake_get(url, *args, **kwargs):
            requested.append(url)
            # Return minimal HTML with no PDFs; discovery should just return []
            return _Resp(200, b"<html><body>No pdfs</body></html>")

        with mock.patch("backend.official_map_service.requests.get", side_effect=_fake_get):
            urls = discover_maps("glac")
            self.assertEqual(urls, [])

        self.assertTrue(any("/glac/planyourvisit/maps.htm" in u for u in requested))
        self.assertTrue(any("/glac/planyourvisit/brochures.htm" in u for u in requested))
        self.assertFalse(any("/acad/" in u for u in requested))

    def test_romo_discovery_returns_pdf_with_mocked_html(self):
        from backend.official_map_service import discover_best_pdf_url

        class _Resp:
            def __init__(self, status_code: int, content: bytes, headers=None):
                self.status_code = status_code
                self.content = content
                self.headers = headers or {}

        requested_get = []

        def _fake_get(url, *args, **kwargs):
            requested_get.append(url)
            if url.endswith("/romo/planyourvisit/maps.htm"):
                return _Resp(200, b"<html><a href='/romo/planyourvisit/upload/ROMO_Trail_Map.pdf'>PDF</a></html>")
            if url.endswith("/romo/planyourvisit/brochures.htm"):
                return _Resp(200, b"<html></html>")
            return _Resp(404, b"")

        def _fake_head(url, *args, **kwargs):
            if url.endswith(".pdf"):
                return _Resp(200, b"", headers={"content-type": "application/pdf"})
            return _Resp(404, b"", headers={"content-type": "text/html"})

        with mock.patch("backend.official_map_service.requests.get", side_effect=_fake_get):
            with mock.patch("backend.official_map_service.requests.head", side_effect=_fake_head):
                pdf = discover_best_pdf_url("romo")

        self.assertIsNotNone(pdf)
        self.assertIn("/romo/", pdf)
        self.assertTrue(pdf.endswith(".pdf"))
        self.assertFalse(any("/acad/" in u for u in requested_get))

    def test_park_code_mismatch_regression_crla_not_acad(self):
        # Even if place.meta_data has a stale park code, we must derive from NPS search for the current name.
        from backend.offline_maps_service import resolve_nps_park_code

        class _Place:
            def __init__(self):
                self.name = "Crater Lake National Park"
                self.meta_data = {"nps_park_code": "acad"}

        async def _run():
            class _Resp:
                def __init__(self, status_code, data):
                    self.status_code = status_code
                    self._data = data

                def json(self):
                    return self._data

            parks_data = {
                "data": [
                    {"parkCode": "crla", "fullName": "Crater Lake National Park"},
                    {"parkCode": "acad", "fullName": "Acadia National Park"},
                ]
            }

            import os
            with mock.patch.dict(os.environ, {"NPS_API_KEY": "test"}):
                with mock.patch("backend.offline_maps_service.requests.get", return_value=_Resp(200, parks_data)):
                    code = await resolve_nps_park_code(_Place())
                    self.assertEqual(code, "crla")

        import asyncio
        asyncio.run(_run())


if __name__ == "__main__":
    unittest.main()

