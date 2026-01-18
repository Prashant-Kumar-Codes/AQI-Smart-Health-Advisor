from app.routes.extensions import *

dash_auth = Blueprint('dash_auth', '__name__', url_prefix='/user')

# Placeholder dashboard routes
@dash_auth.route('/student_dashboard')
def student_dashboard():
    if 'user_email' not in session:
        return redirect(url_for('login_auth.login_signup_page'))
    print('Current session user is : ', session['user_email'], session['user_role'])
    # return render_template('auth/student_dashboard.html', unique_id = session['unique_id'], username = session['user'], email = session['user_email'])
    return render_template('login_auth/student_dashboard.html', username = session['user'], email = session['user_email'])

@dash_auth.route('/mentor_dashboard')
def mentor_dashboard():
    if 'user_email' not in session:
        return redirect(url_for('login_auth.login_signup_page'))
    return render_template('dashboards/mentor_dashboard.html')

@dash_auth.route('/placement_dashboard')
def placement_dashboard():
    if 'user_email' not in session:
        return redirect(url_for('login_auth.login_signup_page'))
    return render_template('dashboards/placement_dashboard.html')

@dash_auth.route('/industry_dashboard')
def industry_dashboard():
    if 'user_email' not in session:
        return redirect(url_for('login_auth.login_signup_page'))
    return render_template('dashboards/industry_dashboard.html')
