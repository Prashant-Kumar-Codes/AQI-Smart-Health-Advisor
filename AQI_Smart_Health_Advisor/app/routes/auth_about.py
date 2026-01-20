from .extensions import *

about_auth = Blueprint('about_auth', __name__)

@about_auth.route('/about')
def about():
    return render_template('auth/about.html')