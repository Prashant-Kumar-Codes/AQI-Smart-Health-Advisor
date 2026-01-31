# 🌍 AQI Smart Health Advisor

An **AI-powered Air Quality Intelligence Platform** that transforms real-time AQI data into **personalized health insights, predictive alerts, and preventive recommendations** using Machine Learning and Generative AI.

---

## 📌 Overview

**AQI Smart Health Advisor** is a web-based application designed to reduce the health risks associated with air pollution through **data-driven awareness and personalized guidance**.

The platform continuously monitors real-time **Air Quality Index (AQI)** data from trusted public sources and combines it with **user-specific health and lifestyle data** such as age, outdoor exposure, activity level, and pollution sensitivity.

Using **Machine Learning models** and **Gemini AI**, the system predicts near-future AQI trends and generates **context-aware health recommendations**, helping users make safer decisions in polluted environments.

---

## 🚀 Core Features

### 🌫️ Real-Time AQI Monitoring
- Live AQI data using **WAQI API**
- Supports city-based and GPS-based AQI detection
- Standardized AQI categories with health impact interpretation

### 🧠 AI-Powered Personalized Health Advisory
- Uses **Gemini AI** for natural-language recommendations
- Considers:
  - AQI level & pollutants
  - User age and gender
  - Health problems (stored as structured inputs)
  - Outdoor working duration
  - Pollution sensitivity and physical activity level

### 📊 AQI Prediction (Machine Learning)
- Predicts short-term AQI trends
- Helps users plan outdoor activities proactively
- Designed to be location-agnostic (not dependent on specific lat/long during training)

### 👤 User Health Profiling
- Numeric health parameters (1–10 scale) for AI compatibility
- Structured MySQL schema for explainable AI reasoning
- Enables adaptive and personalized advisories

### 🔐 Secure Authentication
- OTP-based user verification
- Secure credential storage
- Session-based access control

---

## 🧪 Supported Pollutants

- PM2.5
- PM10
- O₃ (Ozone)
- NO₂
- CO
- SO₂

---

## 🚦 AQI Categories & Health Guidance

| AQI Range | Category | Health Guidance |
|----------|----------|----------------|
| 0–50 | Good | No health risk |
| 51–100 | Moderate | Sensitive individuals should limit prolonged outdoor activity |
| 101–150 | Unhealthy for Sensitive Groups | Increased risk for children, elderly, and people with respiratory conditions |
| 151–200 | Unhealthy | Everyone may experience health effects |
| 201–300 | Very Unhealthy | Serious health effects; stay indoors |
| 301–500 | Hazardous | Emergency conditions; avoid exposure |

Health advisories include **mask usage**, **activity restrictions**, **medication reminders**, and **indoor air safety tips**.

---

## 🧠 AI Recommendation Flow

1. Fetch real-time AQI data
2. Normalize AQI to Indian standards
3. Load user health profile from MySQL
4. Combine AQI + health risk factors
5. Generate structured prompt
6. Gemini AI produces actionable health guidance

---

## 🧱 System Architecture

### Backend
- Flask (REST APIs)
- AQI normalization & processing
- ML-based AQI prediction
- AI recommendation engine

### Frontend
- HTML, CSS, JavaScript
- Interactive AQI dashboards
- User health input forms

### Database
- MySQL
- Stores:
  - User authentication data
  - Health profiles
  - Exposure-related attributes

### AI & ML
- Gemini API (Generative recommendations)
- Scikit-learn (AQI prediction models)

---

## 🛠️ Tech Stack

**Backend**
- Python (Flask)
- RESTful APIs

**Frontend**
- HTML5
- CSS3
- JavaScript

**AI & ML**
- Gemini AI
- Scikit-learn
- Pandas, NumPy

**Database**
- MySQL

**APIs**
- WAQI
- OpenWeather (optional)

---

## 📁 Project Structure

```text
AQI_SMART_HEALTH_ADVISOR_WEB_APP/
│
├── app/
│   ├── routes/
│   ├── static/
│   ├── templates/
│
├── models/
├── run.py
├── requirements.txt
├── README.md

## Getting Started

1. Clone the repository
2. Configure environment variables for AQI data sources and notification providers
3. Install backend and frontend dependencies
4. Run backend and frontend services locally
5. Create or import user profiles to receive personalized AQI health recommendations

## Data Sources & Reliability

- Integrates with trusted public AQI providers (e.g., WAQI, OpenAQ)
- Supports calibration for improved accuracy with local sensors
- Uses WAQI standard AQI scale

## Customization & Extensibility

- Rule-based advisory system for easy modification without code changes
- Extendable user profiles (e.g., asthma, elderly, outdoor workers)
- Support for internationalization and localization

## Privacy & Ethics

- Minimal personal data collection — only what is required for personalization and notifications(temporary during session + 1hr only)
- User data used only for health personalization and analytics with clear consent
- Built with privacy, transparency, and regulatory compliance in mind

## License

Specify the license (e.g., MIT). See the LICENSE file for details.

## Maintainer

Prashant Kumar  

---

This repository contains the complete source code for the AQI Smart Health Advisor platform, including real-time data integration, AI-based health analysis, and user-facing applications aimed at reducing the health impact of air pollution.
