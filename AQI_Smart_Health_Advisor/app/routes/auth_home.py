from .extensions import *

home_auth = Blueprint('home_auth', __name__)

@home_auth.route('/aqi_homepage', methods=['GET'])
def aqi_homepage():
    return render_template('auth/homepage.html')