# 🌍 AQI Smart Health Advisor WebApp

> **An AI-powered Air Quality Intelligence Platform** that transforms real-time AQI data into personalized health insights, predictive alerts, and preventive recommendations using Machine Learning and Gemini AI.

---

## 📌 Overview

**AQI Smart Health Advisor** is a comprehensive web application designed to reduce health risks associated with air pollution through data-driven awareness and personalized health guidance.

The platform:
- **Monitors real-time AQI data** from trusted public sources (WAQI API)
- **Combines AQI metrics** with user-specific health and lifestyle data (age, medical conditions, activity levels, etc.)
- **Generates AI-powered health recommendations** using Gemini AI
- **Predicts AQI trends** using Machine Learning models
- **Provides actionable alerts** and preventive guidance tailored to individual health profiles

Whether you're managing respiratory conditions, planning outdoor activities, or simply want to understand air quality impacts on your health — this platform delivers **context-aware, scientifically-grounded health advice**.

---

## 🚀 Core Features

### 🌫️ Real-Time AQI Monitoring
- Live AQI data integration via **WAQI API**
- Supports **city-based** and **GPS-based** location detection
- Standardized **Indian AQI scale** with health impact categorization
- Supports monitoring of 6+ major air pollutants (PM2.5, PM10, O₃, NO₂, CO, SO₂)

### 🧠 AI-Powered Personalized Health Advisory
- Uses **Gemini AI** for context-aware natural-language recommendations
- Considers:
  - Real-time AQI levels and dominant pollutants
  - User demographics (age, gender)
  - Chronic health conditions and current problems
  - Daily outdoor exposure duration
  - Physical activity levels and pollution sensitivity
  - Smoking and mask usage patterns
- Generates **actionable health guidance** including:
  - Mask usage recommendations
  - Activity restrictions and alternatives
  - Medication reminders
  - Indoor air safety tips

### 📊 Machine Learning AQI Prediction
- Short-term AQI trend forecasting using **Scikit-learn**
- Helps users proactively plan outdoor activities
- Data-driven predictive models trained on historical patterns

### 👤 User Health Profiling (feature not added yet)
- Comprehensive health profile system with structured data collection
- Numeric health parameters (1–10 scale) for AI compatibility
- Supports multiple health conditions and exposure factors
- Enables truly personalized and explainable recommendations

### 🔐 Secure Authentication & Session Management
- OTP-based email verification for user registration
- Secure password storage and session handling
- Temporary session data retention (1 hour + session duration)

### ⚠️ Real-Time Alert System
- Location-based AQI threshold monitoring
- Persistent alert tracking and history (for a specific time only)
- Multi-parameter alert generation
- Alert recommendations based on health profile

---

## 🧪 Supported Pollutants

| Pollutant | Symbol | Health Impact |
|-----------|--------|--------------|
| **PM2.5** | PM₂.₅ | Fine particulate matter, respiratory penetration |
| **PM10** | PM₁₀ | Coarse particulate matter, throat/lung irritation |
| **Ozone** | O₃ | Respiratory tract damage, asthma trigger |
| **Nitrogen Dioxide** | NO₂ | Respiratory disease development, inflammation |
| **Carbon Monoxide** | CO | Oxygen deprivation, cardiovascular impact |
| **Sulfur Dioxide** | SO₂ | Respiratory irritation, acid rain formation |

---

## 🚦 AQI Categories & Health Guidance

| AQI Range | Category | Health Advisory |
|-----------|----------|-----------------|
| **0–50** | Good | Minimal risk; outdoor activities safe |
| **51–100** | Moderate | Sensitive groups should limit prolonged exposure |
| **101–150** | Unhealthy for Sensitive Groups | Children, elderly, people with respiratory conditions at increased risk |
| **151–200** | Unhealthy | General population experiences health effects |
| **201–300** | Very Unhealthy | Serious health impacts; outdoor exposure should be minimized |
| **301–500** | Hazardous | Emergency conditions; avoid all outdoor exposure |

---

## 🧠 AI Recommendation Flow

```
1. Prompt given to AI - Real time Aqi data, User health detials
   ↓
2. AI Combine AQI metrics + health risk factors
   ↓
3. AI processes and generates recommendations
   ↓
4. Return structured health guidance to user
```

---

## 🏗️ System Architecture

### Backend
- **Framework**: Flask (Python)
- **Core Functions**:
  - RESTful API endpoints for AQI, health profiles, alerts
  - AQI normalization and data processing
  - ML-based AQI prediction
  - AI recommendation engine orchestration

### Frontend
- **HTML5** – Semantic markup
- **CSS3** – Responsive styling
- **JavaScript** – Interactive dashboards and real-time updates

### Database
- **PostgreSQL** – Primary data store
- **Schema Components**:
  - User authentication and profiles
  - Health condition tracking (not added yet)
  - Historical AQI data and trends
  - Alert and notification logs

### AI & Machine Learning
- **Gemini API** – Generative AI recommendations
- **Scikit-learn** – AQI prediction models
- **Pandas & NumPy** – Data processing and analysis

### External APIs
- **OpenWeather API** – Real-time AQI data
- **Geopy & OpenStreat** – Geocoding and location services

### Deployment & Infrastructure
- **Docker** – Containerization
- **Docker Compose** – Multi-container orchestration
- **Nginx** – Reverse proxy and load balancing
- **Gunicorn** – WSGI application server

---

## 🛠️ Tech Stack

### Backend
- Python 3.x
- Flask 2.3.3
- Flask-Mail (notifications)
- Flask-SocketIO (real-time updates)
- Gunicorn (production server)

### Frontend
- HTML5
- CSS3
- JavaScript (vanilla)

### Machine Learning & AI
- Scikit-learn 1.3.2 (predictive models)
- Pandas 2.1.1 (data manipulation)
- NumPy 1.26.4 (numerical computing)
- Google Gemini API (generative recommendations)

### Database
- PostgreSQL (via psycopg2)

### Infrastructure & Deployment
- Docker & Docker Compose
- Nginx (reverse proxy)
- Gunicorn (WSGI server)

### Additional Libraries
- Requests (HTTP requests)
- Flask-CORS (cross-origin requests)
- Werkzeug (security utilities)
- Geopy (geocoding)
- python-dotenv (environment configuration)

---

## 📁 Project Structure

```
AQI-Smart-Health-Advisor-WebApp/
│
├── app/
│   ├── __init__.py                # Flask app factory
│   ├── routes/                    # API endpoints
│   ├── models/                    # Data models & database interactions
│   ├── static/                    # CSS, JavaScript, assets
│   └── templates/                 # HTML templates
│
├── run.py                         # Application entry point
├── requirements.txt               # Python dependencies
├── database_schema.sql            # PostgreSQL schema
│
├── Dockerfile                     # Container image definition
├── docker-compose.yml             # Multi-container orchestration
├── gunicorn.conf.py              # Gunicorn configuration
├── Procfile                       # Deployment manifest
│
├── nginx/
│   └── nginx.conf                # Nginx reverse proxy config
│
├── .dockerignore                 # Docker build exclusions
├── .gitignore                    # Git exclusions
├── LICENSE                       # Apache 2.0 License
└── README.md                     # This file
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- PostgreSQL 12+
- Docker & Docker Compose (for containerized deployment)
- API Keys:
  - **WAQI API** (https://waqi.info/api/)
  - **Google Gemini API** (https://ai.google.dev/)
  - **Brevo SMTP** (for email notifications)

### Installation Steps

#### 1. Clone the Repository
```bash
git clone https://github.com/Prashant-Kumar-Codes/AQI-Smart-Health-Advisor-WebApp.git
cd AQI-Smart-Health-Advisor-WebApp
```

#### 2. Set Up Environment Variables
Create a `.env` file in the root directory:
```env
# Flask Configuration
FLASK_ENV=production
DEBUG=False
SECRET_KEY=your_secret_key_here

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aqi_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# APIs
WAQI_API_KEY=your_waqi_api_key
GEMINI_API_KEY=your_gemini_api_key

# Email (Brevo)
MAIL_SERVER=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_USERNAME=your_email@example.com
MAIL_PASSWORD=your_brevo_smtp_key

# Application
APP_HOST=0.0.0.0
APP_PORT=5222
```

#### 3. Create PostgreSQL Database
```bash
# Create database and user
psql -U postgres -c "CREATE DATABASE aqi_db;"
psql -U postgres -c "CREATE USER aqi_user WITH PASSWORD 'your_password';"
psql -U postgres -c "ALTER ROLE aqi_user WITH CREATEDB;"
psql -U postgres -d aqi_db -f database_schema.sql
```

#### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

#### 5. Run the Application

**Development (Local)**
```bash
python run.py
# Access at http://localhost:5222
```

**Production (Docker)**
```bash
docker-compose up -d
# Access at http://localhost:8082
```

---

## 📊 Database Schema Overview

### Core Tables

**`login_data`** – User authentication and profile information
- Email (Primary Key)
- Username, password, OTP verification
- Basic demographics (age, gender, city)

**`user_health_profile`** – Detailed health and exposure information
- Chronic conditions and current health problems
- Physical activity and pollution sensitivity levels
- Outdoor exposure duration and peak exposure times
- Smoking and mask usage patterns

**`aqi_hourly_data`** – Real-time and historical AQI measurements
- Location coordinates and timestamp (composite key)
- Pollutant concentrations (PM2.5, PM10, O₃, NO₂, CO, SO₂)
- Calculated AQI metrics and sub-indices
- Dominant pollutant identification

**`tracking_alerts`** – User alert history and recommendations
- Alert generation timestamp and location
- AQI values and category at alert time
- Generated recommendations
- Alert expiry tracking

**`message_list`** – Inter-user messaging system
- Message sender/recipient tracking
- Message content and timestamps

---

## 🔒 Privacy & Data Security

- **Minimal Data Collection**: Only data necessary for health personalization is collected
- **Session-Based Storage**: User session data retained temporarily (during session + 1 hour)
- **Encrypted Credentials**: Passwords hashed with Werkzeug security utilities
- **CORS Protection**: Cross-origin requests carefully managed
- **OTP Verification**: Two-factor authentication for account security

---

## 🔄 API Endpoints

### Authentication
- `POST /auth/register` – User registration with OTP
- `POST /auth/verify-otp` – OTP verification
- `POST /auth/login` – User login
- `POST /auth/logout` – User logout

### AQI Data
- `GET /api/aqi/current?location=<city>` – Current AQI for location
- `GET /api/aqi/history?lat=<lat>&lon=<lon>&days=7` – Historical AQI data
- `GET /api/aqi/predict?location=<city>` – AQI prediction

### User Profile
- `GET /api/profile` – Retrieve user health profile
- `PUT /api/profile` – Update health profile
- `GET /api/profile/recommendations` – Get personalized recommendations

### Alerts
- `GET /api/alerts` – Retrieve user alerts
- `POST /api/alerts/create` – Create new alert
- `DELETE /api/alerts/<id>` – Remove alert

---

## 📈 Machine Learning Models

The platform uses Scikit-learn for AQI prediction:
- **Model Type**: Regression (predicting AQI values)
- **Features**: Historical pollutant concentrations, time-of-day, day-of-week, seasonal factors
- **Training Data**: 30+ days of historical AQI measurements
- **Update Frequency**: Daily model retraining

---

## 🛠️ Customization & Extensibility

### Adding New Pollutants
Update `database_schema.sql` and add new columns to `aqi_hourly_data`. Adjust Gemini prompts accordingly.

### Custom Alert Rules
Modify alert generation logic in `app/routes/alerts.py` or `app/models/alert_model.py`.

### User Profile Enhancements
Extend `user_health_profile` table with additional health metrics relevant to your use case.

### Localization
Add language support through template variables and database-driven translations.

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Commit changes**: `git commit -m "Add your feature"`
4. **Push to branch**: `git push origin feature/your-feature`
5. **Open a Pull Request**

---

## 📝 License

This project is licensed under the **Apache License 2.0**. See the [LICENSE](LICENSE) file for details.

---

## 👤 Maintainer

**Prashant Kumar**  
GitHub: [@Prashant-Kumar-Codes](https://github.com/Prashant-Kumar-Codes)

---

## 🔗 References

- [WAQI API Documentation](https://waqi.info/api/)
- [Google Gemini API](https://ai.google.dev/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Scikit-learn Documentation](https://scikit-learn.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## ⭐ Show Your Support

If this project helps you understand air quality impacts or improve your health decisions, please consider giving it a star! Your support motivates continued development and improvements.

---

**Last Updated**: July 2026  
**Status**: Active Development
