from .extensions import *

login_auth = Blueprint('login_auth', __name__)

# Database connection
mycon_obj = mysql.connector.connect(
    host='localhost',
    user='root',
    password='My@MySql8044',
    database='Aqi_app_db'
)

cursor_login_auth = mycon_obj.cursor(dictionary=True)

# Constants
OTP_EXPIRY = 60
RESEND_INTERVAL = 60
STALE_ACCOUNT_SECONDS = 3600

# Cleanup function
def cleanup_stale_unverified():
    cutoff = datetime.now() - timedelta(seconds=STALE_ACCOUNT_SECONDS)
    try:
        cursor_login_auth.execute(
            "DELETE FROM login_data WHERE is_verified=0 AND otp_created_at IS NOT NULL AND otp_created_at < %s",
            (cutoff,)
        )
        mycon_obj.commit()
    except Exception:
        pass

def parse_db_datetime(val):
    """Return a datetime from DB value (handles str or datetime)."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    try:
        return datetime.strptime(val, "%Y-%m-%d %H:%M:%S")
    except Exception:
        try:
            return datetime.strptime(val.split('.')[0], "%Y-%m-%d %H:%M:%S")
        except Exception:
            return None

# Main route - render SPA
@login_auth.route('/login_signup', methods=['GET'])
def login_signup_page():
    """Render the single-page login application"""
    default_form = request.args.get('form', 'login')
    return render_template('auth/login.html', default_form=default_form)

# Signup route (API endpoint)
@login_auth.route('/signup', methods=['POST'])
def signup():
    try:
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip()
        city = request.form.get('primary_location', '').strip()
        password = request.form.get('password', '').strip()
        confirm_password = request.form.get('confirm_password', '').strip()

        # Validate inputs
        if not all([username, email, city, password, confirm_password]):
            flash("All fields are required.", "danger")
            return redirect(url_for('login_auth.login_signup_page'))

        # Check password match
        if password != confirm_password:
            flash("Passwords do not match.", "danger")
            return redirect(url_for('login_auth.login_signup_page'))

        # Check password strength (optional)
        if len(password) < 6:
            flash("Password must be at least 6 characters long.", "danger")
            return redirect(url_for('login_auth.login_signup_page'))

        # Check if email already exists
        cursor_login_auth.execute('SELECT email, is_verified FROM login_data WHERE email=%s', (email,))
        existing_user = cursor_login_auth.fetchone()

        if existing_user:
            if existing_user['is_verified'] == 0:
                # Delete unverified account and allow re-signup
                cursor_login_auth.execute("DELETE FROM login_data WHERE email=%s", (email,))
                mycon_obj.commit()
                flash('Previous attempt was incomplete. Please try again.', "info")
            else:
                flash("Email already registered. Please login.", "warning")
                return redirect(url_for('login_auth.login_signup_page'))

        # Generate OTP
        otp = str(random.randint(100000, 999999))
        now = datetime.utcnow()

        try:
            # Send OTP via email
            msg = Message(
                'Your OTP Verification Code - AQI Smart Health Advisor',
                sender='pkthisisfor1234@gmail.com',
                recipients=[email]
            )
            msg.html = f'''
            <html>
                <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h2 style="color: #667eea; text-align: center;">🛡️ AQI Smart Health Advisor</h2>
                        <h3 style="color: #333;">Welcome {username}!</h3>
                        <p style="color: #666; font-size: 16px;">Thank you for signing up. Please verify your email address using the OTP below:</p>
                        
                        <div style="background-color: #f0f4ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                            <h1 style="color: #667eea; font-size: 36px; margin: 0; letter-spacing: 8px;">{otp}</h1>
                        </div>
                        
                        <p style="color: #999; font-size: 14px; text-align: center;">⏱️ This OTP will expire in 60 seconds</p>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #666; font-size: 14px;">Your registered location: <strong>{city}</strong></p>
                            <p style="color: #999; font-size: 12px; text-align: center;">If you didn't request this, please ignore this email.</p>
                        </div>
                    </div>
                </body>
            </html>
            '''
            mail.send(msg)

            # Insert into database
            cursor_login_auth.execute(
                "INSERT INTO login_data (username, email, city, password, otp, otp_created_at, is_verified) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (username, email, city, password, otp, now, 0)
            )
            mycon_obj.commit()

            session['user_email'] = email
            flash("OTP sent to your email. Please verify.", "success")
            return redirect(url_for('login_auth.verify'))

        except Exception as e:
            flash(f"Error sending OTP: {str(e)}", "danger")
            return redirect(url_for('login_auth.login_signup_page'))

    except Exception as e:
        flash(f"Signup error: {str(e)}", "danger")
        return redirect(url_for('login_auth.login_signup_page'))


# Login route (API endpoint)
@login_auth.route('/login', methods=['POST'])
def login():
    try:
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '').strip()

        if not email or not password:
            flash("Email and password are required.", "danger")
            return redirect(url_for('login_auth.login_signup_page'))

        # Check if user exists and password matches
        cursor_login_auth.execute(
            "SELECT * FROM login_data WHERE email=%s AND password=%s",
            (email, password)
        )
        user = cursor_login_auth.fetchone()

        if user:
            if user['is_verified'] == 1:
                # Set session variables
                session['user_email'] = user['email']
                session['username'] = user['username']
                session['user_city'] = user['city']
                session['user_id'] = user['id']

                flash(f"Welcome back, {user['username']}!", "success")
                
                # Redirect to AQI check page or dashboard
                return redirect(url_for('checkAqi_auth.check_aqi'))
                
            else:
                flash("Please verify your account first.", "warning")
                session['user_email'] = email
                return redirect(url_for('login_auth.verify'))
        else:
            flash("Invalid email or password.", "danger")
            return redirect(url_for('login_auth.login_signup_page'))

    except Exception as e:
        flash(f"Login error: {str(e)}", "danger")
        return redirect(url_for('login_auth.login_signup_page'))

# Verify route
@login_auth.route('/verify', methods=['GET', 'POST'])
def verify():
    email = session.get('user_email')
    if not email:
        flash("Session expired. Please sign up again.", "danger")
        cleanup_stale_unverified()
        return redirect(url_for('login_auth.login_signup_page'))

    if request.method == 'POST':
        entered_otp = request.form.get('otp', '').strip()
        if not entered_otp:
            flash("Please enter the OTP.", "danger")
            return redirect(url_for('login_auth.verify'))

        cursor_login_auth.execute("SELECT * FROM login_data WHERE email=%s", (email,))
        user = cursor_login_auth.fetchone()

        if not user or not user.get('otp') or not user.get('otp_created_at'):
            flash("Invalid OTP or session. Please request a new one.", "danger")
            return redirect(url_for('login_auth.resend_otp'))

        try:
            # Parse OTP creation time
            otp_created_at = parse_db_datetime(user['otp_created_at'])
            if not otp_created_at:
                flash("Invalid OTP timestamp. Please request a new one.", "danger")
                return redirect(url_for('login_auth.resend_otp'))

            expiry_time = otp_created_at + timedelta(seconds=OTP_EXPIRY)

            if datetime.utcnow() > expiry_time:
                flash("OTP expired. Please request a new one.", "warning")
                return redirect(url_for('login_auth.resend_otp'))

            if user['otp'] == entered_otp:
                cursor_login_auth.execute(
                    "UPDATE login_data SET is_verified = 1, otp = NULL, otp_created_at = NULL WHERE email = %s",
                    (email,)
                )
                mycon_obj.commit()
                flash("Account verified successfully! You can now log in.", "success")
                session.pop('user_email', None)
                return redirect(url_for('login_auth.login_signup_page'))
            else:
                flash("Invalid OTP. Please try again.", "danger")
                return redirect(url_for('login_auth.verify'))

        except Exception as e:
            flash("An error occurred during verification. Please try again.", "danger")
            return redirect(url_for('login_auth.verify'))

    # GET request - show verify page
    remaining = 0
    try:
        cursor_login_auth.execute("SELECT otp_created_at FROM login_data WHERE email=%s", (email,))
        data = cursor_login_auth.fetchone()
        if data and data['otp_created_at']:
            otp_created_at = parse_db_datetime(data['otp_created_at'])
            if otp_created_at:
                expiry_time = otp_created_at + timedelta(seconds=OTP_EXPIRY)
                remaining = max(0, int((expiry_time - datetime.utcnow()).total_seconds()))
    except Exception:
        remaining = 0
        cleanup_stale_unverified()

    return render_template('auth/verify.html', remaining=remaining)

# Resend OTP route
@login_auth.route('/resend_otp', methods=['GET', 'POST'])
def resend_otp():
    email = session.get('user_email')
    if not email:
        flash("Session expired. Please sign up again.", "danger")
        return redirect(url_for('login_auth.login_signup_page'))

    cursor_login_auth.execute("SELECT username, otp_created_at FROM login_data WHERE email=%s", (email,))
    data = cursor_login_auth.fetchone()

    if data and data['otp_created_at']:
        otp_created_at = parse_db_datetime(data['otp_created_at'])
        if otp_created_at:
            resend_time = otp_created_at + timedelta(seconds=RESEND_INTERVAL)
            if datetime.utcnow() < resend_time:
                wait_seconds = int((resend_time - datetime.utcnow()).total_seconds())
                flash(f"Please wait {wait_seconds} seconds before requesting a new OTP.", "warning")
                return redirect(url_for('login_auth.verify'))

    # Generate and save new OTP
    otp = str(random.randint(100000, 999999))
    otp_created_at = datetime.utcnow()
    
    try:
        cursor_login_auth.execute(
            "UPDATE login_data SET otp=%s, otp_created_at=%s WHERE email=%s",
            (otp, otp_created_at, email)
        )
        mycon_obj.commit()

        username = data['username'] if data else 'User'
        
        msg = Message(
            'Your New OTP Code - AQI Smart Health Advisor',
            sender='pkthisisfor1234@gmail.com',
            recipients=[email]
        )
        msg.html = f'''
        <html>
            <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #667eea; text-align: center;">🛡️ AQI Smart Health Advisor</h2>
                    <h3 style="color: #333;">Hello {username}!</h3>
                    <p style="color: #666; font-size: 16px;">Here's your new OTP code:</p>
                    
                    <div style="background-color: #f0f4ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #667eea; font-size: 36px; margin: 0; letter-spacing: 8px;">{otp}</h1>
                    </div>
                    
                    <p style="color: #999; font-size: 14px; text-align: center;">⏱️ This OTP will expire in 60 seconds</p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="color: #999; font-size: 12px; text-align: center;">If you didn't request this, please ignore this email.</p>
                    </div>
                </div>
            </body>
        </html>
        '''
        mail.send(msg)

        flash("New OTP sent successfully!", "success")
    except Exception as e:
        flash(f"Failed to send new OTP: {str(e)}", "danger")

    return redirect(url_for('login_auth.verify'))

# Logout route
@login_auth.route('/logout')
def logout():
    session.clear()
    flash("Logged out successfully.", "info")
    return redirect(url_for('login_auth.login_signup_page'))

# Get user city for AQI check (API endpoint)
@login_auth.route('/api/user/city', methods=['GET'])
def get_user_city():
    """Return logged-in user's city"""
    if 'user_city' in session:
        return jsonify({'city': session['user_city']})
    return jsonify({'error': 'Not logged in'}), 401