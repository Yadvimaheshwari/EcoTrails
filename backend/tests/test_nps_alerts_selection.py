import unittest
from unittest import mock


class NPSAlertsSelectionTests(unittest.TestCase):
    def test_rocky_mountain_alerts_use_romo_not_defaults(self):
        from backend.nps_service import NPSService

        svc = NPSService()

        async def _fake_search_parks(query: str, limit: int = 10):
            return [
                {"id": "acad", "name": "Acadia National Park"},
                {"id": "romo", "name": "Rocky Mountain National Park"},
            ]

        called = {"parkCode": None}

        async def _fake_get_alerts(park_code: str):
            called["parkCode"] = park_code
            return [{"id": "a1", "title": "Test"}]

        async def _run():
            with mock.patch.object(svc, "search_parks", side_effect=_fake_search_parks):
                with mock.patch.object(svc, "get_park_alerts", side_effect=_fake_get_alerts):
                    park = await svc.get_park_by_name("Rocky Mountain National Park")
                    self.assertIsNotNone(park)
                    self.assertEqual(called["parkCode"], "romo")
                    # Ensure no hardcoded fallback like 'abli'
                    self.assertNotEqual(called["parkCode"], "abli")

        import asyncio
        asyncio.run(_run())


if __name__ == "__main__":
    unittest.main()

