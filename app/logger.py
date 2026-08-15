"""
Centralized Logging for AQI Smart Health Advisor
- Development (default): Shows all logs (DEBUG level)
- Production (FLASK_ENV=production): Shows only WARNING and above
"""

import logging
import os
import sys

# Fix Windows terminal encoding for emoji support
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')


def setup_logging(app=None):
    """Configure logging based on environment."""
    is_dev = os.getenv("FLASK_ENV", "development") != "production"
    if app:
        is_dev = is_dev or app.debug

    level = logging.DEBUG if is_dev else logging.WARNING

    app_logger = logging.getLogger("aqi_app")
    app_logger.setLevel(level)

    if not app_logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        handler.setFormatter(logging.Formatter(
            '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        ))
        app_logger.addHandler(handler)

    # Quiet Werkzeug access logs in production
    if not is_dev:
        logging.getLogger('werkzeug').setLevel(logging.WARNING)

    return app_logger


# Ready-to-import logger instance
logger = logging.getLogger("aqi_app")
if not logger.handlers:
    setup_logging()
