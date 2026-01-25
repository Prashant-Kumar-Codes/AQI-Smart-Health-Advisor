from flask import Flask
from flask_socketio import SocketIO
from flask_mail import Mail
from dotenv import load_dotenv
from datetime import timedelta

socketio = SocketIO()
mail = Mail()
load_dotenv()

def create_app():
    app = Flask(__name__,
                static_folder='static',
                template_folder='templates')
    
    # ========== SESSION CONFIGURATION ==========
    app.secret_key = "My@1SecretKey"
    
    # IMPORTANT: Configure session to be permanent and last longer
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)  # Sessions last 7 days
    app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
    app.config['SESSION_COOKIE_HTTPONLY'] = True  # Prevent JavaScript access to session cookie
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # CSRF protection
    app.config['SESSION_REFRESH_EACH_REQUEST'] = True  # Refresh session on each request
    
    # ========== MYSQL CONFIGURATION ==========
    app.config['MYSQL_HOST'] = "localhost"
    app.config['MYSQL_USER'] = "root"
    app.config['MYSQL_PASSWORD'] = "My@MySql8044"
    app.config['MYSQL_DATABASE'] = "aqi_app_db"
    
    # ========== MAIL CONFIGURATION ==========
    # Brevo SMTP config
    app.config['MAIL_SERVER'] = 'smtp-relay.brevo.com'
    app.config['MAIL_PORT'] = 587
    app.config['MAIL_USE_TLS'] = True
    app.config['MAIL_USERNAME'] = '969fcc001@smtp-brevo.com'
    app.config['MAIL_PASSWORD'] = 'xsmtpsib-2d7e8d94c7a80158e62323dd015b24864969f5183eafae9b3752555f756e275d-diEpUbGSYI0AExBV'
    app.config['MAIL_DEFAULT_SENDER'] = 'pkthisisfor1234@gmail.com'
    mail.init_app(app)
    
    # socketio.init_app(app, cors_allowed_origins="*")
    
    # ========== IMPORT BLUEPRINTS ==========
    from app.routes.auth_home import home_auth
    app.register_blueprint(home_auth)
    
    from app.routes.auth_login import login_auth
    app.register_blueprint(login_auth)
    
    from app.routes.auth_checkAqi import checkAqi_auth
    app.register_blueprint(checkAqi_auth)
    
    from app.routes.auth_learnMore import learnMore_auth
    app.register_blueprint(learnMore_auth)
    
    from app.routes.auth_about import about_auth
    app.register_blueprint(about_auth)
    
    from app.routes.auth_ai_advisor import ai_advisor_auth
    app.register_blueprint(ai_advisor_auth)
    
    from app.routes.auth_live_track import live_track_auth
    app.register_blueprint(live_track_auth)
    
    return app