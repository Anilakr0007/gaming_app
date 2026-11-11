import json
import tempfile
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

import app


class ScoreUpdateTests(unittest.TestCase):
    def setUp(self):
        self.temp_file = tempfile.TemporaryDirectory()
        self.data_path = Path(self.temp_file.name) / "matches.json"
        self.data_path.write_text(
            json.dumps([{
                "id": "test-match",
                "teams": ["India", "Australia"],
                "scores": {
                    "India": {"runs": 10, "wickets": 1, "overs": "2.0", "run_rate": "5.00"},
                    "Australia": {"runs": 0, "wickets": 0, "overs": "0.0", "run_rate": "0.00"},
                },
            }]),
            encoding="utf-8",
        )
        self.data_patch = patch.object(app, "DATA_FILE", self.data_path)
        self.data_patch.start()

    def tearDown(self):
        self.data_patch.stop()
        self.temp_file.cleanup()

    def test_update_persists_score_and_calculates_run_rate(self):
        updated = app.update_score("test-match", {"team": "India", "runs": 24, "wickets": 2, "overs": "4.0"})

        self.assertEqual(updated["scores"]["India"], {"runs": 24, "wickets": 2, "overs": "4.0", "run_rate": "6.00"})
        self.assertEqual(app.load_matches()[0], updated)

    def test_rejects_invalid_ball_count(self):
        with self.assertRaisesRegex(ValueError, "cricket notation"):
            app.update_score("test-match", {"team": "India", "runs": 24, "wickets": 2, "overs": "4.6"})

    def test_rejects_team_outside_match(self):
        with self.assertRaisesRegex(ValueError, "Choose a team"):
            app.update_score("test-match", {"team": "England", "runs": 24, "wickets": 2, "overs": "4.0"})

    def test_concurrent_updates_preserve_both_teams(self):
        start = threading.Barrier(2)

        def update(team, runs):
            start.wait()
            return app.update_score("test-match", {"team": team, "runs": runs, "wickets": 1, "overs": "2.0"})

        with ThreadPoolExecutor(max_workers=2) as executor:
            first = executor.submit(update, "India", 24)
            second = executor.submit(update, "Australia", 18)
            first.result()
            second.result()

        scores = app.load_matches()[0]["scores"]
        self.assertEqual(scores["India"]["runs"], 24)
        self.assertEqual(scores["Australia"]["runs"], 18)


if __name__ == "__main__":
    unittest.main()