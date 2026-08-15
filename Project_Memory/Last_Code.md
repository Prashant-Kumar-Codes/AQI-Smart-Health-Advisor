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
