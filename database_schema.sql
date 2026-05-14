-- 1. login_data Table: Email is now the Primary Key
CREATE TABLE IF NOT EXISTS login_data (
    email VARCHAR(255) PRIMARY KEY,
    id SERIAL UNIQUE, -- ID remains for session tracking but is now just a Unique field
    username VARCHAR(100) NOT NULL,
    age INT,
    gender VARCHAR(20),
    city VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    otp VARCHAR(10),
    otp_created_at TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE
);

-- 2. user_health_profile Table: Email is Primary Key (1:1 relationship with login_data)
CREATE TABLE IF NOT EXISTS user_health_profile (
    email VARCHAR(255) PRIMARY KEY REFERENCES login_data(email) ON DELETE CASCADE,
    current_problems TEXT,
    chronic_conditions TEXT,
    physical_activity_level INT,
    pollution_sensitivity INT,
    respiratory_risk INT,
    immunity_level INT,
    daily_outdoor_hours FLOAT,
    peak_exposure_time VARCHAR(100),
    smoking_level INT,
    mask_usage_level INT,
    additional_notes TEXT
);

-- 3. aqi_hourly_data Table: No email here, so we use coordinates+time as PK
CREATE TABLE IF NOT EXISTS aqi_hourly_data (
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    hour_timestamp TIMESTAMP NOT NULL,
    id SERIAL UNIQUE, -- ID remains Unique
    location_name VARCHAR(255),
    unix_timestamp BIGINT,
    pm2_5 FLOAT, pm10 FLOAT, no2 FLOAT, so2 FLOAT, co FLOAT, o3 FLOAT, no FLOAT, nh3 FLOAT,
    indian_aqi FLOAT, dominant_pollutant VARCHAR(20), aqi_category VARCHAR(50),
    sub_index_pm25 FLOAT, sub_index_pm10 FLOAT, sub_index_no2 FLOAT,
    sub_index_so2 FLOAT, sub_index_co FLOAT, sub_index_o3 FLOAT,
    data_source VARCHAR(50) DEFAULT 'api',
    PRIMARY KEY (latitude, longitude, hour_timestamp) -- Natural Primary Key
);

-- 4. tracking_alerts Table: A user can have MANY alerts, so id remains the PK
CREATE TABLE IF NOT EXISTS tracking_alerts (
    id SERIAL PRIMARY KEY, -- Must stay PK to allow multiple alerts per user
    user_email VARCHAR(255) NOT NULL REFERENCES login_data(email) ON DELETE CASCADE,
    alert_type VARCHAR(50),
    timestamp TIMESTAMP NOT NULL,
    location VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    aqi INT,
    aqi_category VARCHAR(50),
    message TEXT,
    recommendations TEXT,
    pollutants TEXT,
    expiry_time TIMESTAMP,
    CONSTRAINT unique_id_alert UNIQUE (id)
);

-- 5. message_list Table: A user can have MANY messages, so id remains the PK
CREATE TABLE IF NOT EXISTS message_list (
    id SERIAL PRIMARY KEY, -- Must stay PK to allow multiple messages per user
    from_user VARCHAR(100) NOT NULL,
    to_user VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    CONSTRAINT unique_id_msg UNIQUE (id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_aqi_lookup ON aqi_hourly_data(latitude, longitude, hour_timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON tracking_alerts(user_email);
CREATE INDEX IF NOT EXISTS idx_messages_users ON message_list(from_user, to_user);
