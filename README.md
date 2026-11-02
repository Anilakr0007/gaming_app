# Boundary

A small, local cricket scoreboard app built with Python's standard library. Browse every match in `matches.json`, open a scorecard, see each match's weather and pitch context, and edit a team's score. Score updates are saved to `matches.json` on this computer, and the browser refreshes the match feed every 30 seconds.

## Run

1. Open a terminal in this folder.
2. Run `python app.py`.
3. Open `http://localhost:8000` in your browser.

No package installation is required. Match scores, weather, and pitch reports are sample data and are not connected to a live cricket or weather provider. Add each new match as a record in `matches.json`; the list, filters, score editor, and match detail view read from that feed. Conditions-based insights are indicative only, not match-result predictions.
