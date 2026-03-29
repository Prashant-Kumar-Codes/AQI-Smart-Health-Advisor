-- ============================================
-- SQL Table for Live Tracker Alerts (PostgreSQL)
-- ============================================

-- Create tracking_alerts table
CREATE TABLE IF NOT EXISTS tracking_alerts (
    id SERIAL NOT NULL,
    user_email VARCHAR(100) PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    alert_timestamp TIMESTAMP NOT NULL, -- Renamed from 'timestamp' to avoid keyword conflicts
    location VARCHAR(200) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    aqi INT NOT NULL,
    aqi_category VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    recommendations JSONB NOT NULL,
    pollutants JSONB,
    expiry_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to link with aqi_login_data table
    CONSTRAINT fk_tracking_user_email 
        FOREIGN KEY (user_email) 
        REFERENCES aqi_login_data (email)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- ============================================
-- Indexes for faster queries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_email ON tracking_alerts (user_email);
CREATE INDEX IF NOT EXISTS idx_expiry_time ON tracking_alerts (expiry_time);
CREATE INDEX IF NOT EXISTS idx_alert_timestamp ON tracking_alerts (alert_timestamp);

-- ============================================
-- Cleanup Mechanism Recommendation
-- ============================================

-- NOTE: PostgreSQL doesn't have a native "CREATE EVENT". 
-- You have three options for the hourly cleanup:
-- 1. Use an external CRON job to run: 
--    DELETE FROM tracking_alerts WHERE expiry_time < NOW();
-- 2. If using an extension like pg_cron:
--    SELECT cron.schedule('0 * * * *', $$DELETE FROM tracking_alerts WHERE expiry_time < NOW()$$);
-- 3. Run the deletion query inside your Flask app periodically (e.g., on every user login or via Celery).
