import os
import sys

# Fix Windows terminal encoding for emoji support
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from app import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5222))
    is_dev = os.environ.get("FLASK_ENV", "development") != "production"

    app.run(debug=is_dev, host='0.0.0.0', port=port, use_reloader=False)
