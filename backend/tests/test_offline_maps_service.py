import os
import io
import tempfile
import unittest
from unittest import mock
import pathlib


class _FakeResponse:
    def __init__(self, body: bytes, content_type: str = "application/pdf", status_code: int = 200):
        self._body = body
        self.status_code = status_code
        self.headers = {"content-type": content_type, "content-length": str(len(body))}
        self._fp = io.BytesIO(body)

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def iter_content(self, chunk_size=1024):
        while True:
            chunk = self._fp.read(chunk_size)
            if not chunk:
                break
            yield chunk

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class OfflineMapsServiceTests(unittest.TestCase):
    def test_resolve_seed_assets(self):
        from backend.offline_maps_service import resolve_seed_assets

        items = resolve_seed_assets("yose")
        self.assertTrue(items)
        self.assertEqual(items[0]["fileType"], "pdf")
        self.assertIn("nps.gov", items[0]["url"])

    def test_download_stream_to_file_writes_file_and_checksum(self):
        from backend.offline_maps_service import _download_stream_to_file

        fake_pdf = b"%PDF-1.4\\n% test\\n"
        with tempfile.TemporaryDirectory() as td:
            dest = pathlib.Path(td) / "test.pdf"

            with mock.patch("backend.offline_maps_service.requests.get") as mget:
                mget.return_value = _FakeResponse(fake_pdf)
                with mock.patch("backend.offline_maps_service.requests.head") as mhead:
                    mhead.return_value = _FakeResponse(b"", content_type="application/pdf", status_code=200)

                    written, checksum, content_type = _download_stream_to_file(
                        "https://example.test/map.pdf",
                        dest,
                        max_bytes=1024 * 1024,
                        retries=1,
                    )

            self.assertEqual(written, len(fake_pdf))
            self.assertTrue(dest.exists())
            self.assertEqual(content_type, "application/pdf")
            self.assertEqual(len(checksum), 64)  # sha256 hex length

    def test_download_stream_to_file_rejects_non_http_url(self):
        from backend.offline_maps_service import _download_stream_to_file

        with tempfile.TemporaryDirectory() as td:
            dest = pathlib.Path(td) / "x.pdf"
            with self.assertRaises(ValueError):
                _download_stream_to_file("ftp://example.test/x.pdf", dest, max_bytes=1024, retries=1)


if __name__ == "__main__":
    unittest.main()

