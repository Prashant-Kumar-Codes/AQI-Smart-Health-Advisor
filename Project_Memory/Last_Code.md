# AQI Smart Health Advisor - Last Code Modifications & History

## Recent Key Changes & Edits

### 1. Dynamic Navbar Auth State (`app/templates/auth/*.html`)
Updated template files:
- `checkAqi.html`
- `ai_advisor.html`
- `live_track.html`
- `homepage.html`
- `user_health_profile.html`
- `about.html`
- `learnMore.html`
- `learnMoreAqi.html`

**Summary**: Added `{% if session.get('user_id') or session.get('username') %}` block around top navigation links to automatically switch between "Login" and "Logout".

---

### 2. Plotly Graph Responsive Optimization (`app/static/js/checkAqi.js`)
**Function**: `createPredictionGraph(predictionData)`
- Added dynamic viewport check (`window.innerWidth < 500`).
- Rotated timestamp labels by `-45°` on mobile screens to prevent text overlap.
- Reduced tick marks (`nticks: 6`) for tight viewports.
- Disabled `scrollZoom` to prevent touch scroll traps on mobile devices.
- Attached window resize listener (`Plotly.Plots.resize()`).

---

### 3. Coordinate Parameter Resolution (`app/static/js/checkAqi.js`)
**Function**: `fetchAQIPrediction(cityOrCoords)`
- Implemented parameter extraction supporting strings, coordinate objects, and fallback to `window.currentAQIData`.
- Resolved `lon` vs `lng` key naming inconsistency across map search and location auto-detect handlers.

---

### 4. Direct Map Coordinate Fetching (`app/static/js/checkAqi.js`)
**Function**: `confirmMapLocation()` & `getCurrentLocation()`
- Modified map pin confirmation to call `LocationService.getAQIByCoordinates(lat, lng)` directly without triggering extra device GPS permissions.

---

### 5. Environment-Aware Logging & Console Output Optimization
**Files**: `app/logger.py`, `app/__init__.py`, `app/routes/auth_checkAqi.py`, `app/routes/locationService.py`, `app/location_api.py`, `app/db.py`, `app/static/js/appLogger.js`, `app/templates/base.html`
- **Backend Logging**: Created `app/logger.py` to route backend logs through Python's `logging` system. In production (`FLASK_ENV=production` or `DEBUG=False`), verbose ASCII banners and debug logs are suppressed. In development (`FLASK_ENV=development`), full debug output is preserved.
- **Client Console Control**: Implemented `app/static/js/appLogger.js` and injected `window.APP_CONFIG` in `base.html`. Automatically silences `console.log` and `console.info` on deployed production sites while preserving `console.warn` and `console.error`. Full debug console logging remains active on `localhost`, `127.0.0.1`, or when `?debug=true` parameter is appended to the URL.

---

### 6. Windows UTF-8 Stream Reconfiguration & Reloader Optimization (`run.py`, `app/logger.py`)
- **Fix**:
  - Reconfigured `sys.stdout` and `sys.stderr` to `UTF-8` at process startup to prevent `UnicodeEncodeError` crashes on Windows PowerShell (`CP1252`).
  - Configured `use_reloader=False` by default in `run.py` to prevent double-initialization of ML prediction models and Gemini API clients.

---

### 7. Plotly Uncaught Resize Error Fix (`app/static/js/checkAqi.js`)
- **Fix**: Wrapped `Plotly.Plots.resize(graphDiv)` inside a check for `graphDiv.offsetParent !== null` and added a `try-catch` block during `window.resize` events to prevent the `Resize must be passed a displayed plot div element` console error when the graph container is hidden.

---

### 8. Historical Data Proximity Caching & 24h Cleanup (`app/routes/aqi_prediction_service.py`)
- **Fix**: 
  - Refactored `get_24h_data_from_db()` to use proximity matching (`ABS(latitude - %s) < 0.01`) instead of exact coordinate matches. This ensures that text searches and GPS searches for the same area reuse the cached database data instead of redundantly querying the OpenWeather API.
  - Implemented automatic stale data cleanup in `store_hourly_data()`, automatically executing `DELETE FROM aqi_hourly_data WHERE hour_timestamp < NOW() - INTERVAL '24 hours'` on every new insert.
  - Coordinates are now normalized to 4 decimal places before insertion.

---

### 9. Database Schema Consolidation (`app/database/migrations/database_code.sql`)
- **Fix**: Merged `live_tracking.sql` into `database_code.sql` and deleted `live_tracking.sql`. Ensured `tracking_alerts` has the proper foreign key constraint to `login_data(email)`, includes a `created_at` timestamp, and explicitly details a `pg_cron` note for 24-hour cleanup.
