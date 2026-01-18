// ============================================
// MESSAGE BAR - Real-time Messaging with SocketIO
// ============================================

// Initialize SocketIO connection
const socket = io();

console.log('SocketIO connection initialized');

// Get message list container
const messageList = document.getElementById('message_list');

// Verify message list exists
if (!messageList) {
    console.error('Message list container not found in DOM');
}

/**
 * Add message to the message list
 * @param {Object} data - Message data from server
 */
function addMessageToList(data) {
    if (!messageList) {
        console.error('Message list container not available');
        return;
    }
    
    try {
        // Remove empty message if it exists
        const emptyMsg = messageList.querySelector('.message_empty');
        if (emptyMsg) {
            emptyMsg.remove();
        }
        
        const messageItem = document.createElement('div');
        messageItem.className = 'message_item';
        
        // Set default values if data is missing
        const timeStr = data.time ? formatTime(data.time) : 'Just now';
        const dateStr = data.date ? data.date : 'Today';
        
        // FIX: Full HTML template
        messageItem.innerHTML = `
            <div class="message_content">
                <p><strong>From:</strong> ${escapeHtml(data.from_user)}</p>
                <p><strong>To:</strong> ${escapeHtml(data.to_user)}</p>
                <p><strong>Message:</strong> ${escapeHtml(data.message)}</p>
                <p class="message_meta">
                    <span>${dateStr}</span> | <span>${timeStr}</span>
                </p>
            </div>
        `;
        
        messageList.appendChild(messageItem);
        
        // Auto-scroll to latest message
        setTimeout(() => {
            messageList.scrollTop = messageList.scrollHeight;
        }, 100);
        
        console.log('✓ Message added to list:', data.message);
    } catch (error) {
        console.error('✗ Error adding message to list:', error);
    }
}

/**
 * Format time string for display
 */
function formatTime(time) {
    if (!time) return 'Just now';
    
    if (typeof time === 'string' && time.includes(':')) {
        return time.substring(0, 5); // Return HH:MM
    }
    
    return time;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    try {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    } catch (error) {
        console.error('✗ Error escaping HTML:', error);
        return text;
    }
}

/**
 * Show browser notification
 */
function showNotification(message) {
    try {
        if ("Notification" in window) {
            if (Notification.permission === "granted") {
                new Notification("New Message", {
                    body: message,
                    icon: '/static/images/notification-icon.png'
                });
            }
        }
    } catch (error) {
        console.error('✗ Error showing notification:', error);
    }
}

/**
 * Request notification permission
 */
function requestNotificationPermission() {
    try {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    } catch (error) {
        console.error('✗ Error requesting notification permission:', error);
    }
}

/**
 * Scroll to bottom on page load
 */
function scrollToBottom() {
    setTimeout(() => {
        if (messageList) {
            messageList.scrollTop = messageList.scrollHeight;
        }
    }, 200);
}

// ============================================
// SocketIO EVENT LISTENERS
// ============================================

socket.on('connect', () => {
    console.log('✓ Connected to server - Socket ID:', socket.id);
});

socket.on('connect_error', (error) => {
    console.error('✗ Connection error:', error);
});

socket.on('disconnect', (reason) => {
    console.log('✗ Disconnected from server - Reason:', reason);
});

// ✅ KEY EVENT: Receive incoming messages
socket.on('receive_message', (data) => {
    console.log('📨 New message received:', data);
    if (data && data.message) {
        addMessageToList(data);
        showNotification(`New message from ${data.from_user}`);
    } else {
        console.error('✗ Invalid message data:', data);
    }
});

// Confirmation when own message sent
socket.on('message_sent', (data) => {
    console.log('✓ Message delivered:', data);
    if (data && data.message) {
        addMessageToList(data);
    }
});

// Handle socket errors properly
socket.on('error', (error) => {
    console.error('✗ Socket error:', error);
    alert('Connection error: ' + error);
});

// Page load events
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded - requesting notification permission');
    requestNotificationPermission();
    scrollToBottom();
});

window.addEventListener('load', () => {
    scrollToBottom();
});
