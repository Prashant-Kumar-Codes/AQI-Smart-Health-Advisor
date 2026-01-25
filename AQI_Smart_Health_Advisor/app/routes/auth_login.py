from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
from flask_mail import Message
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import mysql.connector
import random

login_auth = Blueprint('login_auth', __name__)

# Database connection function
def get_db_connection():
    return mysql.connector.connect(
        host='localhost',
        user='root',
        password='My@MySql8044',
        database='Aqi_app_db'
    )

@login_auth.route('/login_signup', methods=['GET'])
def login_signup_page():
    """Display login/signup page and capture redirect parameter"""
    redirect_to = request.args.get('redirect', '')
    default_form = request.args.get('form', 'login')
    
    # CRITICAL: Clear ALL flash messages for this AJAX-based page
    # Flash messages don't work with AJAX forms - we use JSON responses instead
    if '_flashes' in session:
        session.pop('_flashes', None)
    
    # Also clear on render to be absolutely sure
    from flask import get_flashed_messages
    get_flashed_messages()  # This consumes and clears them
    
    return render_template('auth/login_signup.html', redirect_to=redirect_to, default_form=default_form)


@login_auth.route('/verify', methods=['GET'])
def verify_page():
    """Display OTP verification page"""
    # Check if user has verification email in session
    if 'verification_email' not in session:
        flash('Please sign up first to verify your email', 'error')
        return redirect(url_for('login_auth.login_signup_page', form='signup'))
    
    # Calculate remaining time
    email = session['verification_email']
    
    mycon = get_db_connection()
    cursor = mycon.cursor()
    cursor.execute("SELECT otp_created_at FROM login_data WHERE email = %s", (email,))
    result = cursor.fetchone()
    cursor.close()
    mycon.close()
    
    remaining = 600  # Default 10 minutes
    if result and result[0]:
        otp_created_at = result[0]
        elapsed = (datetime.now() - otp_created_at).total_seconds()
        remaining = max(0, 600 - int(elapsed))  # 600 seconds = 10 minutes
    
    return render_template('auth/verify.html', remaining=remaining)


@login_auth.route('/verify', methods=['POST'])
def verify():
    """Handle OTP verification from form submission"""
    try:
        # Get email from session
        email = session.get('verification_email')
        
        if not email:
            flash('Session expired. Please sign up again.', 'error')
            return redirect(url_for('login_auth.login_signup_page', form='signup'))
        
        # Get OTP from form
        otp = request.form.get('otp', '').strip()
        
        if not otp or len(otp) != 6:
            flash('Please enter a valid 6-digit OTP', 'error')
            return redirect(url_for('login_auth.verify_page'))
        
        mycon = get_db_connection()
        cursor = mycon.cursor()
        cursor.execute(
            "SELECT otp, otp_created_at FROM login_data WHERE email = %s",
            (email,)
        )
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            mycon.close()
            flash('User not found. Please sign up again.', 'error')
            return redirect(url_for('login_auth.login_signup_page', form='signup'))
        
        stored_otp, otp_created_at = result
        
        # Check if OTP is expired (10 minutes)
        if datetime.now() - otp_created_at > timedelta(minutes=10):
            cursor.close()
            mycon.close()
            flash('OTP has expired. Please request a new code.', 'error')
            return redirect(url_for('login_auth.verify_page'))
        
        # Verify OTP
        if stored_otp != otp:
            cursor.close()
            mycon.close()
            flash('Invalid OTP. Please try again.', 'error')
            return redirect(url_for('login_auth.verify_page'))
        
        # Mark as verified
        cursor.execute(
            "UPDATE login_data SET is_verified = 1, otp = NULL WHERE email = %s",
            (email,)
        )
        mycon.commit()
        cursor.close()
        mycon.close()
        
        # Clear verification session
        session.pop('verification_email', None)
        session.pop('verification_username', None)
        
        flash('Email verified successfully! You can now log in.', 'success')
        return redirect(url_for('login_auth.login_signup_page'))
        
    except Exception as e:
        print(f"❌ Verification error: {str(e)}")
        import traceback
        traceback.print_exc()
        flash('An error occurred during verification. Please try again.', 'error')
        return redirect(url_for('login_auth.verify_page'))


@login_auth.route('/resend_otp', methods=['POST'])
def resend_otp():
    """Resend OTP to user's email"""
    try:
        email = session.get('verification_email')
        username = session.get('verification_username', 'User')
        
        if not email:
            flash('Session expired. Please sign up again.', 'error')
            return redirect(url_for('login_auth.login_signup_page', form='signup'))
        
        # Generate new OTP
        otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        
        mycon = get_db_connection()
        cursor = mycon.cursor()
        cursor.execute(
            "UPDATE login_data SET otp = %s, otp_created_at = NOW() WHERE email = %s",
            (otp, email)
        )
        mycon.commit()
        cursor.close()
        mycon.close()
        
        # Send OTP email
        try:
            send_otp_email(email, otp, username)
            print(f"✓ OTP resent to {email}")
            flash('New OTP sent to your email!', 'success')
        except Exception as e:
            print(f"⚠ Failed to send OTP email: {e}")
            flash('Failed to send email. Please try again.', 'error')
        
        return redirect(url_for('login_auth.verify_page'))
        
    except Exception as e:
        print(f"❌ Resend OTP error: {str(e)}")
        import traceback
        traceback.print_exc()
        flash('An error occurred. Please try again.', 'error')
        return redirect(url_for('login_auth.verify_page'))


@login_auth.route('/login', methods=['POST', 'GET'])
def login():
    """Handle login request with proper redirect"""
    # Handle GET request (direct access to /login URL)
    if request.method == 'GET':
        return redirect(url_for('login_auth.login_signup_page'))
    
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        redirect_to = data.get('redirect_to', '')
        
        print(f"Login attempt for: {email}, redirect_to: {redirect_to}")
        
        if not email or not password:
            return jsonify({'success': False, 'message': 'Email and password are required'}), 400
        
        mycon = get_db_connection()
        cursor = mycon.cursor()
        cursor.execute("SELECT id, username, email, age, gender, city, password, is_verified FROM login_data WHERE email = %s", (email,))
        user = cursor.fetchone()
        cursor.close()
        mycon.close()
        
        if not user:
            return jsonify({'success': False, 'message': 'Invalid email or password'}), 401
        
        user_id, username, user_email, age, gender, city, hashed_password, is_verified = user
        
        # Verify password
        if not check_password_hash(hashed_password, password):
            return jsonify({'success': False, 'message': 'Invalid email or password'}), 401
        
        # Check if email is verified
        if not is_verified:
            # Store email in session for verify page
            session['verification_email'] = email
            return jsonify({
                'success': False, 
                'message': 'Please verify your email before logging in',
                'redirect_to_verify': True
            }), 403
        
        # Set session data with permanent session
        session.permanent = True
        session['user_id'] = user_id
        session['username'] = username
        session['user_email'] = user_email
        session['user_age'] = age
        session['user_gender'] = gender
        session['user_city'] = city
        
        # After successful login, before return
        session.permanent = True  # Make session permanent
        
        print(f"✓ Session created for user: {username} (ID: {user_id})")
        
        # Determine redirect URL
        if redirect_to:
            redirect_map = {
                'live_track': '/live_track',
                'ai_advisor': '/ai_advisor',
                'check_aqi': '/check_aqi',
                'home': '/aqi_homepage'
            }
            redirect_url = redirect_map.get(redirect_to, '/aqi_homepage')
        else:
            redirect_url = '/aqi_homepage'
        
        print(f"✓ Redirecting to: {redirect_url}")
        
        return jsonify({
            'success': True, 
            'message': f'Welcome back, {username}!',
            'redirect': redirect_url,
            'user': {
                'username': username,
                'email': user_email
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'An error occurred during login'}), 500


@login_auth.route('/signup', methods=['POST'])
def signup():
    """Handle signup request"""
    try:
        data = request.get_json()
        
        username = data.get('username')
        email = data.get('email')
        age = data.get('age')
        gender = data.get('gender')
        city = data.get('city')
        password = data.get('password')
        
        if not all([username, email, age, gender, city, password]):
            return jsonify({'success': False, 'message': 'All fields are required'}), 400
        
        # Hash password
        hashed_password = generate_password_hash(password)
        
        # Generate OTP
        otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        
        mycon = get_db_connection()
        cursor = mycon.cursor()
        
        # Check if email already exists
        cursor.execute("SELECT email FROM login_data WHERE email = %s", (email,))
        if cursor.fetchone():
            cursor.close()
            mycon.close()
            return jsonify({'success': False, 'message': 'Email already registered'}), 409
        
        # Insert user
        cursor.execute(
            """INSERT INTO login_data (username, email, age, gender, city, password, otp, otp_created_at, is_verified) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), 0)""",
            (username, email, age, gender, city, hashed_password, otp)
        )
        mycon.commit()
        cursor.close()
        mycon.close()
        
        # Store email in session for verify page
        session['verification_email'] = email
        session['verification_username'] = username
        
        # Send OTP email
        try:
            send_otp_email(email, otp, username)
            print(f"✓ OTP sent to {email}")
        except Exception as e:
            print(f"⚠ Failed to send OTP email: {e}")
        
        return jsonify({
            'success': True, 
            'message': 'Registration successful! Please check your email for OTP.'
        }), 201
        
    except Exception as e:
        print(f"❌ Signup error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'An error occurred during registration'}), 500


@login_auth.route('/logout', methods=['POST', 'GET'])
def logout():
    """Handle logout"""
    session.clear()
    return redirect(url_for('login_auth.login_signup_page'))


def send_otp_email(email, otp, username):
    """Send OTP email using Flask-Mail"""
    from flask_mail import Message
    from flask import current_app
    from app import mail
    
    try:
        msg = Message(
            subject="Your OTP for AQI App Verification",
            recipients=[email],
            html=f"""
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Welcome to AQI Smart Health Advisor!</h2>
                <p>Hello {username},</p>
                <p>Your OTP for email verification is:</p>
                <h1 style="color: #667eea; font-size: 36px; letter-spacing: 5px;">{otp}</h1>
                <p>This OTP is valid for 10 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <br>
                <p>Best regards,<br>AQI Smart Health Advisor Team</p>
            </body>
            </html>
            """
        )
        mail.send(msg)
    except Exception as e:
        print(f"Error sending email: {e}")
        raise