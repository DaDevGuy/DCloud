// Global variables
let currentToken = '';
let selectedChannel = '';

const THEME_STORAGE_KEY = 'dcloud-theme';

function applyTheme(theme) {
    const normalized = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', normalized);
    try {
        localStorage.setItem(THEME_STORAGE_KEY, normalized);
    } catch {
        // ignore storage failures
    }
    updateThemeToggleUI(normalized);
}

function getInitialTheme() {
    try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'dark' || saved === 'light') return saved;
    } catch {
        // ignore
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function updateThemeToggleUI(theme) {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const icon = btn.querySelector('i');
    const label = btn.querySelector('.icon-btn-label');
    const isDark = theme === 'dark';
    if (icon) icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    if (label) label.textContent = isDark ? 'Light' : 'Dark';
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
}

function initTheme() {
    applyTheme(getInitialTheme());
    const btn = document.getElementById('themeToggle');
    if (btn) {
        btn.addEventListener('click', toggleTheme);
    }
}

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

function setFieldState(inputEl, state) {
    if (!inputEl) return;
    const group = inputEl.closest('.form-group');
    if (!group) return;
    group.classList.remove('is-invalid', 'is-valid');
    if (state === 'invalid') group.classList.add('is-invalid');
    if (state === 'valid') group.classList.add('is-valid');
}

function clearValidation(tokenInput, channelInput) {
    setFieldState(tokenInput, null);
    setFieldState(channelInput, null);
    const configError = document.getElementById('configError');
    if (configError) {
        configError.textContent = '';
        configError.classList.add('hidden');
    }
}

function setSavingState(isSaving) {
    const btn = document.getElementById('saveConfigBtn');
    if (!btn) return;
    btn.disabled = isSaving;
    btn.setAttribute('aria-busy', isSaving ? 'true' : 'false');
    btn.textContent = isSaving ? 'Saving…' : 'Save Configuration';
}

// Save configuration
function saveConfig() {
    const tokenInput = document.getElementById('botToken');
    const channelInput = document.getElementById('channelId');
    const configError = document.getElementById('configError');
    
    const token = tokenInput.value.trim();
    const channelId = channelInput.value.trim();

    clearValidation(tokenInput, channelInput);
    
    // Basic validation
    if (!token) {
        configError.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Please enter a Discord bot token';
        configError.classList.remove('hidden');
        setFieldState(tokenInput, 'invalid');
        return;
    }
    
    if (!channelId) {
        configError.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Please enter a channel ID';
        configError.classList.remove('hidden');
        setFieldState(channelInput, 'invalid');
        return;
    }
    
    // Basic format validation
    if (!/^\d{17,19}$/.test(channelId)) {
        configError.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Channel ID should be a number with 17-19 digits';
        configError.classList.remove('hidden');
        setFieldState(channelInput, 'invalid');
        return;
    }

    setFieldState(tokenInput, 'valid');
    setFieldState(channelInput, 'valid');
    
    setSavingState(true);
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
                hideLoading();
                setSavingState(false);
                // Update completion screen
                document.getElementById('configuredChannel').textContent = channelId;
                
                // Move to completion screen
                nextStep(2, 3);
                
                // Redirect after delay if appropriate
                if (data.restartRequired) {
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2500);
                }
            } else {
                configError.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${data.message}`;
                configError.classList.remove('hidden');
                hideLoading();
                setSavingState(false);
            }
        })
        .catch(error => {
            logDebug('Save config error:', error);
            configError.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> An error occurred while saving the configuration';
            configError.classList.remove('hidden');
            hideLoading();
            setSavingState(false);
        });
    } catch (error) {
        hideLoading();
        configError.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> An error occurred while saving the configuration';
        configError.classList.remove('hidden');
        logDebug('Save config error:', error);
        setSavingState(false);
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
    initTheme();
    // Fetch system status to confirm page is serving from the right mode
    fetch('/api/system-status')
        .then(response => response.json())
        .then(data => {
            console.log('System status:', data);
            if (!data.setupMode) {
                window.location.href = '/';
            }
        })
        .catch(err => {
            console.log('Could not fetch system status');
        });
});
