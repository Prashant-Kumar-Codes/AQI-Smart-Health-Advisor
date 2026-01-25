// Get redirect parameter from URL or hidden input
function getRedirectParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get('redirect');
    
    // Also check if there's a hidden input (for pages that embed the form)
    const redirectInput = document.getElementById('redirect_to');
    if (redirectInput && redirectInput.value) {
        return redirectInput.value;
    }
    
    return redirectParam || '';
}

// Login function with redirect support
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const redirectTo = getRedirectParameter();
    
    if (!email || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // Important for session cookies
            body: JSON.stringify({
                email: email,
                password: password,
                redirect_to: redirectTo
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(data.message, 'success');
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = data.redirect;
            }, 500);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('An error occurred. Please try again.', 'error');
    }
}

// Signup function
async function handleSignup(event) {
    event.preventDefault();
    
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const age = document.getElementById('signup-age').value;
    const gender = document.getElementById('signup-gender').value;
    const city = document.getElementById('signup-city').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    
    if (!username || !email || !age || !gender || !city || !password || !confirmPassword) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        const response = await fetch('/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                email: email,
                age: parseInt(age),
                gender: gender,
                city: city,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(data.message, 'success');
            
            // Store email for OTP verification
            sessionStorage.setItem('verification_email', email);
            
            // Switch to OTP verification view
            setTimeout(() => {
                showOTPVerification();
            }, 1000);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showMessage('An error occurred. Please try again.', 'error');
    }
}

// OTP Verification function
async function handleOTPVerification(event) {
    event.preventDefault();
    
    const email = sessionStorage.getItem('verification_email');
    const otp = document.getElementById('otp-input').value;
    
    if (!otp || otp.length !== 6) {
        showMessage('Please enter a valid 6-digit OTP', 'error');
        return;
    }
    
    try {
        const response = await fetch('/verify_otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                otp: otp
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(data.message, 'success');
            sessionStorage.removeItem('verification_email');
            
            // Switch to login view
            setTimeout(() => {
                showLoginForm();
            }, 1500);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        showMessage('An error occurred. Please try again.', 'error');
    }
}

// UI Helper Functions
function showMessage(message, type) {
    // Create or update message element
    let messageEl = document.getElementById('auth-message');
    
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'auth-message';
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        document.body.appendChild(messageEl);
    }
    
    messageEl.textContent = message;
    
    if (type === 'success') {
        messageEl.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        messageEl.style.color = 'white';
    } else {
        messageEl.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        messageEl.style.color = 'white';
    }
    
    messageEl.style.display = 'block';
    
    // Auto hide after 4 seconds
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 4000);
}

function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('otp-form').style.display = 'none';
}

function showSignupForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
    document.getElementById('otp-form').style.display = 'none';
}

function showOTPVerification() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('otp-form').style.display = 'block';
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Attach event listeners
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const otpForm = document.getElementById('otp-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    if (otpForm) {
        otpForm.addEventListener('submit', handleOTPVerification);
    }
    
    // Log redirect parameter for debugging
    const redirectParam = getRedirectParameter();
    if (redirectParam) {
        console.log('Redirect parameter:', redirectParam);
    }
});