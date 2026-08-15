-- PostgreSQL Schema for AQI Smart Health Advisor

-- 1. login_data Table: Stores user account information
CREATE TABLE IF NOT EXISTS login_data (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    age INT,
    gender VARCHAR(20),
    city VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    otp VARCHAR(10),
    otp_created_at TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE
);
 
-- future feature
-- -- 2. user_health_profile Table: Stores extended health data for personalized advice
-- CREATE TABLE IF NOT EXISTS user_health_profile (
--     email VARCHAR(255) PRIMARY KEY REFERENCES login_data(email) ON DELETE CASCADE,
--     current_problems TEXT,
--     chronic_conditions TEXT,
--     physical_activity_level INT, -- 1-10 scale
--     pollution_sensitivity INT,   -- 1-10 scale
--     respiratory_risk INT,        -- 1-10 scale
--     immunity_level INT,          -- 1-10 scale
--     daily_outdoor_hours FLOAT,
--     peak_exposure_time VARCHAR(100),
--     smoking_level INT,           -- 0-10 scale
--     mask_usage_level INT,        -- 0-10 scale
--     additional_notes TEXT
-- );

-- 3. aqi_hourly_data Table: Caches air quality data for predictions
CREATE TABLE IF NOT EXISTS aqi_hourly_data (
    id SERIAL PRIMARY KEY,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_name VARCHAR(255),
    hour_timestamp TIMESTAMP NOT NULL,
    unix_timestamp BIGINT,
    pm2_5 FLOAT,
    pm10 FLOAT,
    no2 FLOAT,
    so2 FLOAT,
    co FLOAT,
    o3 FLOAT,
    no FLOAT,
    nh3 FLOAT,
    indian_aqi FLOAT,
    dominant_pollutant VARCHAR(20),
    aqi_category VARCHAR(50),
    sub_index_pm25 FLOAT,
    sub_index_pm10 FLOAT,
    sub_index_no2 FLOAT,
    sub_index_so2 FLOAT,
    sub_index_co FLOAT,
    sub_index_o3 FLOAT,
    data_source VARCHAR(50) DEFAULT 'api',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (latitude, longitude, hour_timestamp)
);

-- Note: To clean up historical data older than 24 hours automatically,
-- a scheduled task (like pg_cron) should run:
-- DELETE FROM aqi_hourly_data WHERE hour_timestamp < NOW() - INTERVAL '24 hours';

-- 4. tracking_alerts Table: Stores live tracking alerts for users
CREATE TABLE IF NOT EXISTS tracking_alerts (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    alert_type VARCHAR(50),
    timestamp TIMESTAMP NOT NULL,
    location VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    aqi INT,
    aqi_category VARCHAR(50),
    message TEXT,
    recommendations JSONB, -- Stores array of advice
    pollutants JSONB,      -- Stores pollutant concentrations
    expiry_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to link with login_data table
    CONSTRAINT fk_tracking_user_email 
        FOREIGN KEY (user_email) 
        REFERENCES login_data (email)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Note: To clean up tracking alerts older than 24 hours automatically,
-- a scheduled task (like pg_cron) should run:
-- DELETE FROM tracking_alerts WHERE timestamp < NOW() - INTERVAL '24 hours';

-- 5. message_list Table: Stores chat messages for the social feature
CREATE TABLE IF NOT EXISTS message_list (
    id SERIAL PRIMARY KEY,
    from_user VARCHAR(100) NOT NULL,
    to_user VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_login_email ON login_data(email);
CREATE INDEX IF NOT EXISTS idx_aqi_coords_time ON aqi_hourly_data(latitude, longitude, hour_timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON tracking_alerts(user_email);
CREATE INDEX IF NOT EXISTS idx_alerts_expiry ON tracking_alerts(expiry_time);
CREATE INDEX IF NOT EXISTS idx_messages_users ON message_list(from_user, to_user);