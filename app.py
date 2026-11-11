from __future__ import annotations

import json
import re
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "matches.json"
DATA_LOCK = threading.RLock()
PORT = 8000
OVERS_PATTERN = re.compile(r"^(0|[1-9]\d*)\.[0-5]$")


def load_matches() -> list[dict]:
    with DATA_LOCK:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def save_matches(matches: list[dict]) -> None:
    with DATA_LOCK:
        DATA_FILE.write_text(json.dumps(matches, indent=2) + "\n", encoding="utf-8")


def update_score(match_id: str, payload: dict) -> dict:
    team_name = payload.get("team")
    runs = payload.get("runs")
    wickets = payload.get("wickets")
    overs = payload.get("overs")

    if not isinstance(runs, int) or isinstance(runs, bool) or not 0 <= runs <= 999:
        raise ValueError("Runs must be a whole number between 0 and 999.")
    if not isinstance(wickets, int) or isinstance(wickets, bool) or not 0 <= wickets <= 10:
        raise ValueError("Wickets must be a whole number between 0 and 10.")
    if not isinstance(overs, str) or not OVERS_PATTERN.fullmatch(overs):
        raise ValueError("Overs must use cricket notation, for example 18.4.")

    with DATA_LOCK:
        matches = load_matches()
        match = next((item for item in matches if item["id"] == match_id), None)
        if match is None:
            raise KeyError("Match not found.")
        if team_name not in match["teams"]:
            raise ValueError("Choose a team in this match.")

        over_count, balls = (int(part) for part in overs.split("."))
        total_balls = over_count * 6 + balls
        run_rate = runs * 6 / total_balls if total_balls else 0
        match["scores"][team_name].update(
            {"runs": runs, "wickets": wickets, "overs": overs, "run_rate": f"{run_rate:.2f}"}
        )
        save_matches(matches)
        return match


class ScoreboardHandler(BaseHTTPRequestHandler):
    def send_json(self, status: int, payload: object) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/matches":
            self.send_json(200, load_matches())
            return
        if path == "/" or path.startswith("/static/"):
            relative_path = "index.html" if path == "/" else path.lstrip("/")
            file_path = (ROOT / relative_path).resolve()
            if ROOT not in file_path.parents or not file_path.is_file():
                self.send_error(404)
                return
            content_type = "text/html; charset=utf-8" if file_path.suffix == ".html" else None
            self.send_response(200)
            if content_type:
                self.send_header("Content-Type", content_type)
            self.end_headers()
            self.wfile.write(file_path.read_bytes())
            return
        self.send_error(404)

    def do_PATCH(self) -> None:
        match = re.fullmatch(r"/api/matches/([a-z0-9-]+)", urlparse(self.path).path)
        if not match:
            self.send_json(404, {"error": "Match not found."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length))
            updated = update_score(match.group(1), payload)
        except (ValueError, KeyError, json.JSONDecodeError) as error:
            self.send_json(400, {"error": str(error)})
            return
        self.send_json(200, updated)

    def log_message(self, format: str, *args: object) -> None:
        print(f"{self.address_string()} - {format % args}")


if __name__ == "__main__":
    print(f"Boundary is ready at http://localhost:{PORT}")
    ThreadingHTTPServer(("127.0.0.1", PORT), ScoreboardHandler).serve_forever()