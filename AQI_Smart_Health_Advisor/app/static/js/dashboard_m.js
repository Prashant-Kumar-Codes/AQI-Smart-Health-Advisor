// ============================================
// DIALOG BOX MANAGEMENT - Message Form Handler
// ============================================

/*
 * Wait for socket to be initialized
 * @returns {Promise}
 */
function waitForSocket() {
    return new Promise((resolve) => {
        if (typeof socket !== 'undefined') {
            resolve();
        } else {
            // Check every 100ms if socket is ready
            const checkSocket = setInterval(() => {
                if (typeof socket !== 'undefined') {
                    clearInterval(checkSocket);
                    resolve();
                }
            }, 100);
        }
    });
}

/*
 * Initialize dialog functionality
 */
async function initializeDialog() {
    // Wait for socket to be ready
    await waitForSocket();
    
    // Get dialog elements with null checks
    const addBtn = document.getElementById('add_message_btn');
    const dialogOverlay = document.getElementById('dialog_overlay');
    const messageDialog = document.getElementById('message_dialog');
    const cancelBtn = document.getElementById('cancel_btn');
    const messageForm = document.getElementById('message_form');
    
    // Verify all elements exist
    if (!addBtn || !dialogOverlay || !messageDialog || !cancelBtn || !messageForm) {
        console.error('Dialog elements not found in DOM');
        return;
    }
    
    /**
     * Open message dialog box
     */
    function openDialog() {
        console.log('Opening dialog');
        dialogOverlay.style.display = 'block';
        messageDialog.style.display = 'block';
    }
    
    /**
     * Close message dialog box
     */
    function closeDialog() {
        console.log('Closing dialog');
        dialogOverlay.style.display = 'none';
        messageDialog.style.display = 'none';
        messageForm.reset();
    }
    
    /**
     * Handle form submission with SocketIO
     */
    function handleFormSubmit(e) {
        e.preventDefault();
        
        const recipientId = document.getElementById('recipient_id').value.trim();
        const messageText = document.getElementById('message_text').value.trim();
        
        // Validate form inputs
        if (!recipientId) {
            alert('Please enter recipient ID');
            console.warn('Recipient ID is empty');
            return;
        }
        
        if (!messageText) {
            alert('Please enter message');
            console.warn('Message text is empty');
            return;
        }
        
        // Check socket connection
        if (typeof socket === 'undefined' || !socket.connected) {
            alert('Server connection not established. Please refresh the page.');
            console.error('Socket not connected');
            return;
        }
        
        try {
            // Emit message via SocketIO for real-time delivery
            socket.emit('send_message', {
                recipient_id: recipientId,
                message: messageText
            });
            
            console.log('Message sent to:', recipientId);
            closeDialog();
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        }
    }
    
    // Event listeners for dialog
    addBtn.addEventListener('click', openDialog);
    cancelBtn.addEventListener('click', closeDialog);
    
    // Close dialog when clicking outside (on overlay)
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            closeDialog();
        }
    });
    
    // Form submission handler
    messageForm.addEventListener('submit', handleFormSubmit);
    
    console.log('Dialog initialized successfully');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDialog);
} else {
    // DOM already loaded
    initializeDialog();
}
