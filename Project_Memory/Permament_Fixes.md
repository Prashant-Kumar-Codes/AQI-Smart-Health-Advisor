# AQI Smart Health Advisor - Permanent Fixes & Resolutions

## Architectural Fixes

### 1. Robust Coordinate & City Fallback in `fetchAQIPrediction`
- **Location**: `app/static/js/checkAqi.js`
- **Fix**:
  - Refactored signature to handle city strings or `{ lat, lng }` coordinate objects safely.
  - Added intelligent fallback: If parameters are omitted, `fetchAQIPrediction` uses global `currentAQIData.city` or `currentAQIData.location` (latitude/longitude).
  - Ensured correct coordinate key mapping (`lat` & `lng`).

```javascript
// Robust parameter resolution
let queryCity = typeof cityOrCoords === 'string' ? cityOrCoords : null;
let queryLat = null, queryLng = null;

if (!queryCity && cityOrCoords && typeof cityOrCoords === 'object') {
    queryLat = cityOrCoords.lat || cityOrCoords.latitude;
    queryLng = cityOrCoords.lng || cityOrCoords.longitude || cityOrCoords.lon;
}

if (!queryCity && !queryLat && window.currentAQIData) {
    if (window.currentAQIData.city) queryCity = window.currentAQIData.city;
    else if (window.currentAQIData.location) {
        queryLat = window.currentAQIData.location.lat;
        queryLng = window.currentAQIData.location.lng || window.currentAQIData.location.lon;
    }
}
```

---

### 2. Direct Coordinate Lookups without Triggering Browser GPS
- **Location**: `app/static/js/checkAqi.js` & `app/static/js/ai_advisor.js`
- **Fix**:
  - Replaced hardcoded calls to `LocationService.getAQIFromCurrentLocation()` in `confirmMapLocation()` with direct calls to `LocationService.getAQIByCoordinates(lat, lng)`.
  - Fixed property mismatch: normalized `result.location.lng` across all handlers.

---

### 3. Mobile-Optimized Responsive Plotly Charting
- **Location**: `app/static/js/checkAqi.js` & `app/static/css/checkAqi.css`
- **Fix**:
  - Dynamic responsive layout sizing based on `window.innerWidth`:
    - Screen width < 500px: `margin: { l: 30, r: 15, t: 30, b: 50 }`, `nticks: 6`, `tickangle: -45`.
    - Screen width ≥ 500px: standard margin, `nticks: 12`, horizontal ticks.
  - Disabled map/graph scroll trapping on mobile touch screens (`scrollZoom: false`, `displayModeBar: false`).
  - Added dynamic window resize listener using `Plotly.Plots.resize()`.
  - Added CSS style `.prediction-graph-container-pro { touch-action: pan-y; }` to prevent scroll freezing.

---

### 4. Dynamic Conditional Auth Navbar (Login vs Logout)
- **Location**: `app/templates/auth/*.html` (`checkAqi.html`, `ai_advisor.html`, `live_track.html`, `homepage.html`, `user_health_profile.html`, `about.html`, `learnMore.html`, `learnMoreAqi.html`)
- **Fix**:
  - Replaced hardcoded Login buttons with Jinja2 session checks:

```html
{% if session.get('user_id') or session.get('username') %}
    <a href="{{ url_for('login_auth.logout') }}" class="nav-link btn-login-nav">Logout</a>
{% else %}
    <a href="{{ url_for('login_auth.login_signup_page') }}" class="nav-link btn-login-nav">Login</a>
{% endif %}
```

---

### 5. Dependency & Virtual Environment Synchronization
- **Fix**: Installed missing dependencies via pip (`Flask-SocketIO`, `psycopg2-binary`, `gunicorn`, `requests`, `python-dotenv`) into `/usr/local/bin/python3.12`.

---

### 6. Environment-Aware Logging Control System
- **Location**: `app/logger.py`, `app/__init__.py`, `app/routes/auth_checkAqi.py`, `app/routes/locationService.py`, `app/location_api.py`, `app/db.py`, `app/static/js/appLogger.js`, `app/templates/base.html`
- **Fix**:
  - Replaced un-gated `print()` statements across backend Flask routes and services with structured `logger.debug/info/warning/error` calls via `app/logger.py`.
  - Added `app/static/js/appLogger.js` client wrapper to automatically disable `console.log` / `console.info` on deployed production environments while keeping logs available on `localhost`, `127.0.0.1`, or when `?debug=true` is present in the browser URL.

---

### 7. Windows UTF-8 Terminal Stream Reconfiguration & Reloader Optimization
- **Location**: `run.py` & `app/logger.py`
- **Fix**:
  - Added `sys.stdout.reconfigure(encoding='utf-8', errors='backslashreplace')` and `sys.stderr.reconfigure(encoding='utf-8', errors='backslashreplace')` at the entry point of `run.py` and `app/logger.py`. Prevents Windows `CP1252` `UnicodeEncodeError` crashes when log statements contain emojis (`✅`, `⚠️`, `🤖`).
  - Configured `use_reloader=False` by default in `run.py` to prevent double-initialization of ML prediction models and Gemini API clients.

---

### 8. Plotly Uncaught Resize Error Fix
- **Location**: `app/static/js/checkAqi.js`
- **Fix**: Wrapped `Plotly.Plots.resize(graphDiv)` inside a check for `graphDiv.offsetParent !== null` and added a `try-catch` block during `window.resize` events to prevent the `Resize must be passed a displayed plot div element` console error when the graph container is hidden.

---

### 9. Historical Data Proximity Caching & 24h Cleanup
- **Location**: `app/routes/aqi_prediction_service.py`
- **Fix**: 
  - Refactored `get_24h_data_from_db()` to use proximity matching (`ABS(latitude - %s) < 0.01`) instead of exact coordinate matches. This ensures that text searches and GPS searches for the same area reuse the cached database data instead of redundantly querying the OpenWeather API.
  - Implemented automatic stale data cleanup in `store_hourly_data()`, automatically executing `DELETE FROM aqi_hourly_data WHERE hour_timestamp < NOW() - INTERVAL '24 hours'` on every new insert.
  - Coordinates are now normalized to 4 decimal places before insertion.

---

### 10. Database Schema Consolidation
- **Location**: `app/database/migrations/database_code.sql`
- **Fix**: Merged `live_tracking.sql` into `database_code.sql` and deleted `live_tracking.sql`. Ensured `tracking_alerts` has the proper foreign key constraint to `login_data(email)`, includes a `created_at` timestamp, and explicitly details a `pg_cron` note for 24-hour cleanup.
