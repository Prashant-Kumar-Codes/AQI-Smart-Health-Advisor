/**
 * Cookie and Session Management System
 * Handles user session persistence and cookie consent
 */

const CookieSessionManager = {
    // Cookie names
    COOKIE_CONSENT: 'cookieConsent',
    USER_SESSION: 'userSession',
    
    // Cookie expiry (days)
    CONSENT_EXPIRY: 365,
    SESSION_EXPIRY: 7,
    
    /**
     * Set a cookie
     * @param {string} name - Cookie name
     * @param {string} value - Cookie value
     * @param {number} days - Expiry in days
     */
    setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = `expires=${date.toUTCString()}`;
        document.cookie = `${name}=${value};${expires};path=/;SameSite=Strict`;
        console.log(`🍪 Cookie set: ${name}`);
    },
    
    /**
     * Get a cookie value
     * @param {string} name - Cookie name
     * @returns {string|null} - Cookie value or null
     */
    getCookie(name) {
        const nameEQ = name + "=";
        const cookies = document.cookie.split(';');
        
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.indexOf(nameEQ) === 0) {
                return cookie.substring(nameEQ.length);
            }
        }
        return null;
    },
    
    /**
     * Delete a cookie
     * @param {string} name - Cookie name
     */
    deleteCookie(name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
        console.log(`🗑️ Cookie deleted: ${name}`);
    },
    
    /**
     * Check if cookies are accepted
     * @returns {boolean}
     */
    areCookiesAccepted() {
        return this.getCookie(this.COOKIE_CONSENT) === 'accepted';
    },
    
    /**
     * Accept cookies
     */
    acceptCookies() {
        this.setCookie(this.COOKIE_CONSENT, 'accepted', this.CONSENT_EXPIRY);
        console.log('✅ Cookies accepted');
    },
    
    /**
     * Decline cookies
     */
    declineCookies() {
        this.setCookie(this.COOKIE_CONSENT, 'declined', this.CONSENT_EXPIRY);
        console.log('❌ Cookies declined');
    },
    
    /**
     * Save user session to cookie
     * @param {Object} userData - User data to save
     */
    saveUserSession(userData) {
        if (!this.areCookiesAccepted()) {
            console.warn('⚠️ Cookies not accepted - cannot save session');
            return false;
        }
        
        try {
            const sessionData = JSON.stringify(userData);
            const encoded = btoa(sessionData); // Base64 encode
            this.setCookie(this.USER_SESSION, encoded, this.SESSION_EXPIRY);
            console.log('✅ User session saved to cookie');
            return true;
        } catch (error) {
            console.error('❌ Error saving session:', error);
            return false;
        }
    },
    
    /**
     * Load user session from cookie
     * @returns {Object|null} - User data or null
     */
    loadUserSession() {
        if (!this.areCookiesAccepted()) {
            return null;
        }
        
        try {
            const encoded = this.getCookie(this.USER_SESSION);
            if (!encoded) {
                return null;
            }
            
            const sessionData = atob(encoded); // Base64 decode
            const userData = JSON.parse(sessionData);
            console.log('✅ User session loaded from cookie');
            return userData;
        } catch (error) {
            console.error('❌ Error loading session:', error);
            return null;
        }
    },
    
    /**
     * Clear user session
     */
    clearUserSession() {
        this.deleteCookie(this.USER_SESSION);
        console.log('🗑️ User session cleared');
    },
    
    /**
     * Initialize session from cookie on page load
     */
    async initializeSession() {
        const userData = this.loadUserSession();
        
        if (userData) {
            console.log('🔄 Restoring session from cookie...');
            
            // Verify session with server
            try {
                const response = await fetch('/api/user/check', {
                    method: 'GET',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const serverData = await response.json();
                    if (serverData.logged_in) {
                        console.log('✅ Session verified with server');
                        return serverData;
                    }
                }
                
                // Session invalid - clear cookie
                console.log('⚠️ Session invalid - clearing cookie');
                this.clearUserSession();
                return null;
                
            } catch (error) {
                console.error('❌ Session verification error:', error);
                return null;
            }
        }
        
        return null;
    },
    
    /**
     * Show cookie consent banner
     */
    showCookieConsent() {
        // Check if already responded
        const consent = this.getCookie(this.COOKIE_CONSENT);
        if (consent) {
            return;
        }
        
        // Create banner if it doesn't exist
        let banner = document.getElementById('cookieConsent');
        if (!banner) {
            banner = this.createCookieBanner();
            document.body.appendChild(banner);
        }
        
        // Show banner with delay
        setTimeout(() => {
            banner.classList.add('show');
        }, 1000);
    },
    
    /**
     * Create cookie consent banner
     * @returns {HTMLElement}
     */
    createCookieBanner() {
        const banner = document.createElement('div');
        banner.id = 'cookieConsent';
        banner.className = 'cookie-consent';
        banner.innerHTML = `
            <div class="cookie-content">
                <div class="cookie-text">
                    <h4>🍪 We Value Your Privacy</h4>
                    <p>We use cookies to keep you logged in, enhance your experience, and analyze site usage. By clicking "Accept", you consent to our use of cookies.</p>
                </div>
                <div class="cookie-buttons">
                    <button class="cookie-btn decline" onclick="CookieSessionManager.handleDecline()">Decline</button>
                    <button class="cookie-btn accept" onclick="CookieSessionManager.handleAccept()">Accept All</button>
                </div>
            </div>
        `;
        
        // Add styles if not already present
        if (!document.getElementById('cookie-styles')) {
            const style = document.createElement('style');
            style.id = 'cookie-styles';
            style.textContent = `
                .cookie-consent {
                    position: fixed;
                    bottom: -200px;
                    left: 0;
                    right: 0;
                    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
                    color: white;
                    padding: 20px;
                    box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
                    z-index: 10000;
                    transition: bottom 0.5s ease-out;
                }
                .cookie-consent.show {
                    bottom: 0;
                }
                .cookie-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                    flex-wrap: wrap;
                }
                .cookie-text {
                    flex: 1;
                    min-width: 250px;
                }
                .cookie-text h4 {
                    margin: 0 0 8px 0;
                    font-size: 18px;
                }
                .cookie-text p {
                    margin: 0;
                    font-size: 14px;
                    color: #d1d5db;
                    line-height: 1.5;
                }
                .cookie-buttons {
                    display: flex;
                    gap: 12px;
                }
                .cookie-btn {
                    padding: 10px 24px;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .cookie-btn.accept {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .cookie-btn.accept:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }
                .cookie-btn.decline {
                    background: transparent;
                    border: 2px solid #4b5563;
                    color: #d1d5db;
                }
                .cookie-btn.decline:hover {
                    border-color: #667eea;
                    color: white;
                }
            `;
            document.head.appendChild(style);
        }
        
        return banner;
    },
    
    /**
     * Handle accept button click
     */
    handleAccept() {
        this.acceptCookies();
        const banner = document.getElementById('cookieConsent');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => banner.remove(), 500);
        }
    },
    
    /**
     * Handle decline button click
     */
    handleDecline() {
        this.declineCookies();
        const banner = document.getElementById('cookieConsent');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => banner.remove(), 500);
        }
        
        // Show info message
        if (window.MessageManager) {
            window.MessageManager.show('You can still use the site, but some features may be limited.', 'info');
        }
    }
};

// Make available globally
window.CookieSessionManager = CookieSessionManager;

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    CookieSessionManager.showCookieConsent();
    CookieSessionManager.initializeSession();
});