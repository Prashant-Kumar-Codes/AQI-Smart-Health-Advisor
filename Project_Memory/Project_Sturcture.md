# AQI Smart Health Advisor - Project Structure & Architecture

## Overview
The **AQI Smart Health Advisor** is a Flask-based web application providing real-time air quality monitoring, ML/AI-powered 24-hour AQI predictions, personalized health guidance (powered by GPT-4), and continuous live atmospheric tracking.

---

## Directory & File Structure

```
AQI-Smart-Health-Advisor-WebApp/
├── app/
│   ├── __init__.py                # Flask App initialization & extensions
│   ├── db.py                      # PostgreSQL database connection factory
│   ├── routes/
│   │   ├── auth.py                # Standard auth routes & session management
│   │   ├── auth_login.py          # User authentication (login, signup, OTP verify, logout)
│   │   ├── checkAqi.py            # AQI lookup & prediction API endpoints
│   │   ├── ai_advisor.py          # AI health advisor integration endpoint
│   │   ├── live_track.py          # Real-time tracking & automated alerts endpoint
│   │   └── home.py                # Homepage & static page controllers
│   ├── services/
│   │   ├── location_service.py    # Geocoding & WAQI/OpenWeather API integration
│   │   └── prediction_service.py  # 24-hour AQI trend forecasting model logic
│   ├── static/
│   │   ├── css/
│   │   │   ├── checkAqi.css       # Styling for AQI dashboard & prediction graph
│   │   │   ├── ai_advisor.css     # Styling for AI advisor UI
│   │   │   ├── live_track.css     # Styling for real-time tracking panel
│   │   │   ├── homepage.css       # Homepage glassmorphic styles
│   │   │   └── profile.css        # Health profile styles
│   │   ├── js/
│   │   │   ├── checkAqi.js        # Main UI controller, map search, Plotly graph creator
│   │   │   ├── locationService.js # Centralized location lookup service (client-side)
│   │   │   ├── ai_advisor.js      # Client controller for AI Health Advisor
│   │   │   ├── live_track.js      # GPS tracking, distance calculation, alert updates
│   │   │   └── messageManager.js  # Global notification overlay system
│   │   ├── images/                # Static assets, badges, infographics
│   │   └── videos/                # Responsive background video assets
│   └── templates/
│       ├── base.html              # Base layout template
│       └── auth/
│           ├── checkAqi.html      # AQI status & 24h prediction dashboard
│           ├── ai_advisor.html    # AI Health Advisor form & response view
│           ├── live_track.html    # Real-time location & alert monitor
│           ├── homepage.html      # Main landing page
│           ├── login_signup.html  # Authentication portal
│           ├── user_health_profile.html # User health metrics & preferences
│           ├── verify.html        # OTP email verification page
│           ├── about.html         # About page & methodology
│           └── learnMore.html     # AQI educational guide
├── run.py                         # Application entry point (runs on port 5222)
├── requirements.txt               # Dependencies (Flask, psycopg2-binary, Flask-SocketIO, etc.)
├── Dockerfile                     # Docker container configuration
└── Project_Memory/                # AI Memory & context documentation
    ├── Project_Sturcture.md       # Architectural overview
    ├── Issuses.md                 # Log of identified bugs and edge cases
    ├── Permament_Fixes.md         # Documented resolutions and permanent fixes
    ├── Temporary_Fixes.md         # Environment configurations & temporary workarounds
    └── Last_Code.md               # Summary of recent commits and modified modules
```

---

## Backend API Endpoints

### 1. AQI Data & Location Lookup
- **`GET /api/aqi/location/name?location=<city_name>`**: Returns real-time AQI and weather data by city name.
- **`GET /api/aqi/location/coordinates?lat=<latitude>&lng=<longitude>`**: Returns AQI data by geographical coordinates.
- **`GET /api/aqi/station/<uid>`**: Fetches detailed monitoring data for a specific WAQI station.

### 2. Predictions & Forecasting
- **`GET /api/aqi/predict/city/<city_name>`**: Returns 12-hour historical and 12-hour predicted AQI trend data.
- **`GET /api/aqi/predict/coordinates?lat=<latitude>&lon=<longitude>`**: Coordinate-based prediction query.

### 3. Authentication & User Profile
- **`POST /login`**: Validates user credentials and sets permanent Flask session.
- **`POST /signup`**: Registers a new user and sends verification OTP email.
- **`POST/GET /logout`**: Clears user session data and redirects to login.

---

## Key Frontend Libraries
- **Plotly.js**: Interactive 24-hour historical & predicted AQI visualization.
- **Leaflet.js**: Interactive map picker and live geolocation tracker.
- **FontAwesome 6**: High-tech SVG icons.
- **Google Fonts**: Inter & Lato typography.
