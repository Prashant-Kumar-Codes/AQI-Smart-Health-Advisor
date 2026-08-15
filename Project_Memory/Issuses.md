# AQI Smart Health Advisor - Identified Issues & Bugs Log

## Logged Issues

### 1. Prediction API Error: "City name or coordinates required"
- **Symptom**: When a user searched for AQI using "Use Current Location" or selected a point on the interactive Leaflet map, an error alert appeared stating `Prediction error: Error: City name or coordinates required`.
- **Root Cause**:
  1. `confirmMapLocation` in `checkAqi.js` was erroneously invoking `LocationService.getAQIFromCurrentLocation()` when specific map points were clicked.
  2. `getCurrentLocation` was passing `result.location.lon` instead of `result.location.lng`.
  3. `fetchAQIPrediction` thrown an error when arguments were undefined without attempting to resolve `currentAQIData`.

---

### 2. Unintended Browser Geolocation Prompt on Map Click
- **Symptom**: Clicking a location on the map triggered a browser GPS permission prompt (`LocationService.getAQIFromCurrentLocation()`) instead of retrieving AQI for the clicked coordinate.
- **Root Cause**: Hardcoded call to `getAQIFromCurrentLocation()` in `ai_advisor.js` and `checkAqi.js` during map marker placement workflows.

---

### 3. Plotly Graph Mobile UX Issues
- **Symptom**: The 24-hour AQI prediction chart was difficult to read on mobile phones.
  - X-axis timestamp labels collided and overlapped.
  - Hover tooltips covered the graph canvas.
  - Touch scrolling on mobile was blocked/trapped by the graph canvas.
  - Desktop-oriented fixed margins caused clipping on smaller screens.
- **Root Cause**: Static `layout` and `config` settings in `createPredictionGraph` (`checkAqi.js`) without responsive screen width detection or touch-action optimization.

---

### 4. Missing Logout Button in Navigation Header
- **Symptom**: Authenticated users saw a "Login" button in the top navigation bar instead of a "Logout" option.
- **Root Cause**: Hardcoded `<a href="/login_signup">Login</a>` links across templates without checking `session.get('user_id')` or `session.get('username')`.

---

### 5. Missing Python Environment Dependencies
- **Symptom**: Backend startup failed with `ModuleNotFoundError: No module named 'flask_socketio'` and missing PostgreSQL drivers.
- **Root Cause**: Dependencies were not installed in the active `/usr/local/bin/python3.12` environment.

---

### 6. Verbose Terminal & Browser Console Logging in Production
- **Symptom**: On deployed website, browser console was filled with verbose `console.log` messages and backend terminal dumped full ASCII debug banners on every API call.
- **Root Cause**: Lack of environment-gated logging abstractions in both client-side JavaScript and Python Flask routes.

---

### 7. Windows PowerShell Startup Hang & Encoding Crash (`UnicodeEncodeError`)
- **Symptom**: Running `python run.py` on Windows PowerShell got stuck on `* Debugger is active!` or crashed with `UnicodeEncodeError: 'charmap' codec can't encode character '\u2705'`.
- **Root Cause**:
  1. Default Windows PowerShell stdout/stderr encoding uses `CP1252` which cannot encode UTF-8 emojis (`✅`, `⚠️`, `🤖`).
  2. Flask's `use_reloader=True` re-spawned a child process that repeatedly encountered the encoding error and hung during IPC loop initialization.

---

### 8. Plotly Uncaught Resize Error on Mobile Graph
- **Symptom**: Console throws `Uncaught (in promise) Error: Resize must be passed a displayed plot div element` occasionally after fetching predictions.
- **Root Cause**: `Plotly.newPlot().then()` executed `.resize(graphDiv)` unconditionally, even if the graph container hadn't been fully painted or if it was temporarily hidden in the DOM during animations/tab switches.

---

### 9. Redundant OpenWeather API Fetching (Cache Misses)
- **Symptom**: Even if a user searched "Mohali" multiple times in the same day, the backend kept querying OpenWeather API instead of returning the cached `aqi_hourly_data`.
- **Root Cause**: 
  1. The DB query `get_24h_data_from_db()` used strict 8-decimal exact coordinate matching (`WHERE latitude = %s`). GPS searches and Text searches yield slightly different decimal coordinate tails for the same city, causing the database to consider them different locations and trigger an API miss.
  2. Stale records were never deleted, leading to infinite database bloat since there was no automated cleanup mechanism for records older than 24 hours.

---

### 10. Fragmented Database Migrations & Schemas
- **Symptom**: `tracking_alerts` table definition existed in both `database_code.sql` and `live_tracking.sql`, leading to conflicting schemas regarding foreign keys and created_at timestamps.
- **Root Cause**: Separated migration files were modifying overlapping entities without synchronization.
