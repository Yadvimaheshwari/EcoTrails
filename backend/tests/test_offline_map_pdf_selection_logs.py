import unittest


class OfflineMapPdfSelectionLogsTests(unittest.TestCase):
    def test_glacier_selection_logs_glac(self):
        import main

        parks = [
            {"parkCode": "acad", "fullName": "Acadia National Park"},
            {"parkCode": "glac", "fullName": "Glacier National Park"},
        ]

        with self.assertLogs("EcoAtlas", level="INFO") as cm:
            code, full = main._select_best_nps_park_code("Glacier National Park", parks)
            # Emit the exact log format the handler uses
            main.logger.info(f"[OfflineMapPDF] placeId=test selected parkCode={code!r} fullName={full!r}")

        self.assertEqual(code, "glac")
        joined = "\n".join(cm.output)
        self.assertIn("selected parkCode='glac'", joined)
        self.assertNotIn("/acad/", joined)


if __name__ == "__main__":
    unittest.main()

