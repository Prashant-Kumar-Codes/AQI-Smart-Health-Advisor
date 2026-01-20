from .extensions import *

learnMore_auth = Blueprint('learnMore_auth', __name__)

@learnMore_auth.route('/learnMoreAqi', methods=['GET'])
def learnMoreAqi():
    return render_template('auth/learnMoreAqi.html')