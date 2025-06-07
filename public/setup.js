// Global variables
let currentToken = '';
let selectedChannel = '';

// Helper function to log to console
function logDebug(message, data) {
    console.log(`[Setup Debug] ${message}`, data || '');
}

// Helper function to toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-solid fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fa-solid fa-eye';
    }
}

// Navigation between steps
function nextStep(current, next) {
    document.getElementById(`step${current}`).classList.add('hidden');
    document.getElementById(`step${next}`).classList.remove('hidden');
    logDebug(`Moved from step ${current} to step ${next}`);
}

function prevStep(current, prev) {
    document.getElementById(`step${current}`).classList.add('hidden');
    document.getElementById(`step${prev}`).classList.remove('hidden');
    logDebug(`Moved back from step ${current} to step ${prev}`);
}

// Show/hide loading overlay
function showLoading(message = 'Processing...') {
    document.getElementById('loadingMessage').textContent = message;
    document.getElementById('loadingOverlay').classList.remove('hidden');
    logDebug(`Loading shown: ${message}`);
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
    logDebug('Loading hidden');
}

// Save configuration
function saveConfig() {
    const tokenInput = document.getElementById('botToken');
    const channelInput = document.getElementById('channelId');
    const configError = document.getElementById('configError');
    
    const token = tokenInput.value.trim();
    const channelId = channelInput.value.trim();
    
    // Basic validation
    if (!token) {
        configError.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Please enter a Discord bot token';
        configError.classList.remove('hidden');
        return;
    }
    
    if (!channelId) {
        configError.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Please enter a channel ID';
        configError.classList.remove('hidden');
        return;
    }
    
    // Basic format validation
    if (!/^\d{17,19}$/.test(channelId)) {
        configError.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Channel ID should be a number with 17-19 digits';
        configError.classList.remove('hidden');
        return;
    }
    
    showLoading('Saving configuration...');
    
    try {
        logDebug(`Saving configuration with channel ID: ${channelId}`);
        
        fetch('/api/save-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: token,
                channelId: channelId
            })
        })
        .then(response => response.json())
        .then(data => {
            logDebug('Save config response:', data);
            
            if (data.success) {
                // Update completion screen
                document.getElementById('configuredChannel').textContent = channelId;
                
                // Move to completion screen
                nextStep(2, 3);
                
                // Redirect after delay if appropriate
                if (data.restartRequired) {
                    setTimeout(() => {
                        showLoading('Restarting DCloud...');
                        setTimeout(() => {
                            window.location.href = '/';
                        }, 5000); // Wait 5 seconds before redirecting
                    }, 2000);
                }
            } else {
                configError.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${data.message}`;
                configError.classList.remove('hidden');
                hideLoading();
            }
        })
        .catch(error => {
            logDebug('Save config error:', error);
            configError.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> An error occurred while saving the configuration';
            configError.classList.remove('hidden');
            hideLoading();
        });
    } catch (error) {
        hideLoading();
        configError.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> An error occurred while saving the configuration';
        configError.classList.remove('hidden');
        logDebug('Save config error:', error);
    }
}

// Finish setup and reload application
function finishSetup() {
    showLoading('Starting DCloud...');
    // Redirect to root
    setTimeout(() => {
        window.location.href = '/';
    }, 3000);
}

// Check if the service is restarting
window.addEventListener('load', function() {
    // Fetch system status to confirm page is serving from the right mode
    fetch('/api/system-status')
        .then(response => response.json())
        .then(data => {
            console.log('System status:', data);
            // If we're in setup mode viewing setup page, we're good
            // If we shouldn't be in setup mode but are, refresh to get app
            if (!data.setupMode) {
                window.location.href = '/';
            }
        })
        .catch(err => {
            console.log('Could not fetch system status');
        });
});
