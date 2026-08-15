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
