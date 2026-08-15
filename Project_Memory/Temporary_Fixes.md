# AQI Smart Health Advisor - Temporary Workarounds & Environment Configurations

## Environment & Server Runtime Configuration

### 1. Active Development Server Execution
- **Command**: `python3 run.py` (or `/usr/local/bin/python3.12 run.py`)
- **Port**: `5222`
- **Host**: `0.0.0.0` (accessible locally via `http://127.0.0.1:5222`)

---

### 2. API Rate Limiting Fallbacks
- **WAQI / OpenWeather API**: In case of rate limits or API key throttling, `location_service.py` provides cached or mock fallback data structures for major cities to prevent runtime exceptions.

---

### 3. Session Security & Secret Key
- Flask secret key configured in `app/__init__.py` with fallback default for local development.

---

### 4. Git Repository Tracking
- Recent fixes pushed to git origin (`main` branch):
  - Commit `635c712`: Fixed location prediction error & mobile Plotly graph layout.
  - Latest changes: Template navbar dynamic authentication conditionals.
