/**
 * auth.js
 * Authentication flows: login (step 1), OTP verification (step 2),
 * registration, private-key backup, and logout.
 */

/* ════════════════════════════════════════
   SESSION INITIALISATION
════════════════════════════════════════ */

/**
 * Bootstrap the app on page load.
 * Validates stored token; routes to dashboard or login.
 */
async function init() {
  if (state.token) {
    try {
      const { ok, status, data } = await api('GET', '/auth/verify');
      if (ok && data.success) {
        state.user = data.user;
        enterDashboard();
        return;
      }
      
      // Log the error for debugging
      if (status === 401) {
        console.warn('Token expired or invalid (401 Unauthorized)');
      } else if (status === 404) {
        console.warn('User no longer exists (404)');
      } else {
        console.warn('Token verification failed:', status, data);
      }
    } catch (error) {
      console.error('Network error during token verification:', error);
    }

    // Token invalid — clear and show login
    state.token = null;
    localStorage.removeItem('vaultsync_token');
    console.info('Token cleared. User will need to log in again.');
  }
  showView('viewLogin');
}

/**
 * Populate sidebar with user info and navigate to the dashboard.
 */
function enterDashboard() {
  const u        = state.user;
  const initials = u.username ? u.username.substring(0, 2).toUpperCase() : '?';

  document.getElementById('sidebarUsername').textContent = u.username;
  document.getElementById('sidebarAvatar').textContent   = initials;
  document.getElementById('profileAvatar').textContent   = initials;

  showView('viewDashboard');
  switchPage('files');
}

/* ════════════════════════════════════════
   STEP 1 — LOGIN (password)
════════════════════════════════════════ */

/**
 * Submit username + password.
 * On success, transitions to OTP verification view.
 */
async function handleLogin() {
  const email    = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  hideAlert('loginAlert');

  if (!email || !password) {
    showAlert('loginAlert', 'loginAlertMsg', 'Email and password are required');
    return;
  }

  setLoading('loginBtn', true, 'Verifying...');

  try {
    const { ok, data } = await api('POST', '/auth/login', { email, password }, true);

    if (ok && data.success) {
      state.pendingOTP = {
        otp_id:     data.otp_id,
        email:      data.email,
        expires_in: data.expires_in,
      };
      // Guard: active-OTP response only guarantees otp_id + expires_in
      document.getElementById('otpEmailDisplay').textContent =
        data.email || state.pendingOTP?.email || 'your registered email';
      startOTPTimer(data.expires_in || 600);
      showView('viewOTP');
    } else {
      showAlert('loginAlert', 'loginAlertMsg', data.error || 'Login failed. Please check your credentials.');
    }
  } catch {
    showAlert('loginAlert', 'loginAlertMsg', 'Network error. Please try again.');
  }

  setLoading('loginBtn', false, 'Sign In');
}

/* ════════════════════════════════════════
   STEP 2 — OTP VERIFICATION
════════════════════════════════════════ */

let otpTimerInterval = null;
let otpAttemptsLeft  = 3;

/**
 * Start the countdown timer displayed in the OTP view.
 * @param {number} seconds - Total seconds until expiry
 */
function startOTPTimer(seconds) {
  clearInterval(otpTimerInterval);
  let remaining = seconds;
  const el      = document.getElementById('otpTimer');

  function tick() {
    const m   = Math.floor(remaining / 60);
    const s   = remaining % 60;
    el.textContent = `Expires in ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    el.className   = remaining <= 60 ? 'otp-timer urgent' : 'otp-timer ok';

    if (remaining <= 0) {
      clearInterval(otpTimerInterval);
      el.textContent = 'Code expired — please resend';
      el.className   = 'otp-timer urgent';
    }
    remaining--;
  }

  tick();
  otpTimerInterval = setInterval(tick, 1000);
}

/**
 * Handle character entry in a single OTP digit input.
 * Advances focus automatically; auto-submits when all 6 digits are filled.
 * @param {HTMLInputElement} el
 * @param {number}           index - 0-based position
 */
function otpInput(el, index) {
  const inputs = document.querySelectorAll('.otp-input');

  // Clamp to single digit
  if (el.value.length > 1) el.value = el.value.slice(-1);
  el.classList.toggle('filled', el.value !== '');

  if (el.value && index < 5) inputs[index + 1]?.focus();

  // Auto-verify when complete
  const code = Array.from(inputs).map(i => i.value).join('');
  if (code.length === 6) setTimeout(handleVerifyOTP, 200);
}

/**
 * Collect all OTP digit values into one string.
 * @returns {string}
 */
function getOTPCode() {
  return Array.from(document.querySelectorAll('.otp-input')).map(i => i.value).join('');
}

/** Clear all OTP digit inputs and refocus the first one. */
function clearOTPInputs() {
  document.querySelectorAll('.otp-input').forEach(i => {
    i.value = '';
    i.classList.remove('filled');
  });
  document.querySelectorAll('.otp-input')[0]?.focus();
}

/**
 * Verify the entered OTP code against the backend.
 * On success, stores the JWT and navigates to the dashboard.
 */
async function handleVerifyOTP() {
  const code = getOTPCode();
  if (code.length !== 6) {
    showAlert('otpAlert', 'otpAlertMsg', 'Please enter all 6 digits');
    return;
  }
  hideAlert('otpAlert');
  setLoading('verifyOtpBtn', true, 'Verifying...');

  try {
    const { ok, data } = await api('POST', '/auth/verify-login-otp', {
      otp_id:   state.pendingOTP.otp_id,
      otp_code: code,
    }, true);

    if (ok && data.success) {
      state.token = data.token;
      state.user  = data.user;
      localStorage.setItem('vaultsync_token', state.token);
      clearInterval(otpTimerInterval);
      enterDashboard();
      toast('success', `Welcome back, ${state.user.username}!`, 'Login successful');
    } else {
      otpAttemptsLeft = Math.max(0, otpAttemptsLeft - 1);
      document.getElementById('otpAttempts').textContent = `${otpAttemptsLeft} attempts remaining`;
      showAlert('otpAlert', 'otpAlertMsg', data.error || 'Invalid OTP code');
      clearOTPInputs();

      if (otpAttemptsLeft <= 0) {
        toast('error', 'Too many attempts', 'Please request a new code.');
        document.getElementById('verifyOtpBtn').disabled = true;
      }
    }
  } catch {
    showAlert('otpAlert', 'otpAlertMsg', 'Verification failed. Please try again.');
  }

  setLoading('verifyOtpBtn', false, 'Verify Code');
}

/**
 * Resend the OTP email using the current otp_id.
 */
async function handleResendOTP() {
  if (!state.pendingOTP) return;
  setLoading('resendOtpBtn', true, 'Sending...');

  try {
    const { ok, data } = await api('POST', '/auth/resend-login-otp', {
      otp_id:  state.pendingOTP.otp_id,
    }, true);

    if (ok && data.success) {
      clearOTPInputs();
      otpAttemptsLeft = 3;
      document.getElementById('otpAttempts').textContent = '3 attempts remaining';
      startOTPTimer(600);
      hideAlert('otpAlert');
      document.getElementById('verifyOtpBtn').disabled = false;
      toast('success', 'Code resent', 'Check your email for the new OTP.');
    } else {
      toast('error', 'Failed to resend', data.error || 'Please try again.');
    }
  } catch {
    toast('error', 'Network error', 'Please try again.');
  }

  setLoading('resendOtpBtn', false, 'Resend code');
}

/* ════════════════════════════════════════
   REGISTRATION
════════════════════════════════════════ */

let usernameCheckTimer = null;

/**
 * Debounced check of username availability.
 * Updates the hint element beneath the username input.
 * @param {string} username
 */
async function checkUsernameAvailability(username) {
  clearTimeout(usernameCheckTimer);
  const hint  = document.getElementById('regUsernameHint');
  const input = document.getElementById('regUsername');

  if (username.length < 3) {
    hint.textContent    = 'At least 3 characters required';
    hint.style.color    = '';
    input.className     = 'form-input';
    return;
  }

  hint.textContent = 'Checking...';

  usernameCheckTimer = setTimeout(async () => {
    try {
      const { ok, data } = await api('GET', `/user/check_username/${encodeURIComponent(username)}`, null, true);
      if (ok) {
        if (data.available) {
          hint.textContent  = '✓ Available';
          hint.style.color  = 'var(--emerald-400)';
          input.className   = 'form-input success';
        } else {
          hint.textContent  = '✗ Already taken';
          hint.style.color  = 'var(--red-400)';
          input.className   = 'form-input error';
        }
      }
    } catch {
      hint.textContent = 'Could not verify';
      hint.style.color = '';
    }
  }, 500);
}

/**
 * Update the 4-segment password strength bar and show missing requirements.
 * @param {string} password
 */
function updatePasswordStrength(password) {
  const bars  = ['sb1','sb2','sb3','sb4'].map(id => document.getElementById(id));
  let score   = 0;
  const issues = [];

  if (password.length >= 8)                            score++;
  else issues.push("8+ chars");
  
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  else issues.push("upper+lower");
  
  if (/[0-9]/.test(password))                          score++;
  else issues.push("number");
  
  if (/[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/.test(password))  score++;
  else issues.push("special char");

  // Update strength bars
  bars.forEach((bar, i) => {
    bar.className = 'strength-bar';
    if (i < score) {
      if (score <= 1)      bar.classList.add('weak');
      else if (score <= 2) bar.classList.add('fair');
      else                 bar.classList.add('strong');
    }
  });
  
  // Show missing requirements hint
  const hint = document.getElementById('passwordHint');
  if (hint) {
    if (issues.length > 0) {
      hint.textContent = 'Missing: ' + issues.join(', ');
      hint.style.color = 'var(--orange-400)';
    } else {
      hint.textContent = '✓ Password is strong';
      hint.style.color = 'var(--emerald-400)';
    }
  }
}

/**
 * Submit the registration form.
 * On success, shows the private key backup screen.
 */
async function handleRegister() {
  const username = document.getElementById('regUsername').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm  = document.getElementById('regConfirmPassword').value;
  hideAlert('registerAlert');

  if (!username || !email || !password) {
    showAlert('registerAlert', 'registerAlertMsg', 'All fields are required');
    return;
  }
  if (password !== confirm) {
    showAlert('registerAlert', 'registerAlertMsg', 'Passwords do not match');
    return;
  }
  
  // Validate password strength (match backend requirements)
  const issues = [];
  if (password.length < 8)
    issues.push("at least 8 characters");
  if (!/[A-Z]/.test(password))
    issues.push("one uppercase letter");
  if (!/[a-z]/.test(password))
    issues.push("one lowercase letter");
  if (!/[0-9]/.test(password))
    issues.push("one number");
  if (!/[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/.test(password))
    issues.push("one special character");
  
  if (issues.length > 0) {
    showAlert('registerAlert', 'registerAlertMsg', 'Password must contain: ' + issues.join(', '));
    return;
  }

  setLoading('registerBtn', true, 'Creating account...');

  try {
    const { ok, data } = await api('POST', '/auth/register', { username, email, password }, true);

    if (ok && data.success) {
      state.token               = data.token;
      state.user                = { id: data.user.id, username: data.user.username, email: data.user.email };
      state.pendingRegister     = data.encrypted_private_key;
      state.encryptedPrivateKey = data.encrypted_private_key;

      localStorage.setItem('vaultsync_token', state.token);
      localStorage.setItem('vaultsync_enc_key', data.encrypted_private_key);
      showKeyBackup(data.encrypted_private_key);
      toast('success', 'Account created!', 'Please save your encrypted private key securely.');
    } else {
      showAlert('registerAlert', 'registerAlertMsg', data.error || 'Registration failed');
    }
  } catch {
    showAlert('registerAlert', 'registerAlertMsg', 'Network error. Please try again.');
  }

  setLoading('registerBtn', false, 'Create Account');
}

/* ════════════════════════════════════════
   PRIVATE KEY BACKUP
════════════════════════════════════════ */

/**
 * Display the private key backup screen with the generated key.
 * @param {string} privateKey - PEM-formatted RSA private key
 */
function showKeyBackup(privateKey) {
  document.getElementById('privateKeyDisplay').textContent = privateKey;
  document.getElementById('keyConfirm').checked            = false;
  document.getElementById('keyConfirmBtn').disabled        = true;

  // Enable Continue button only after the user ticks the checkbox
  document.getElementById('keyConfirm').addEventListener('change', function () {
    document.getElementById('keyConfirmBtn').disabled = !this.checked;
  });

  showView('viewKeyBackup');
}

/** Copy the displayed private key to the clipboard. */
function copyPrivateKey() {
  const key = document.getElementById('privateKeyDisplay').textContent;
  copyToClipboard(key, 'Private key copied to clipboard');
}

/** Trigger a .pem file download of the private key. */
function downloadPrivateKey() {
  const key  = document.getElementById('privateKeyDisplay').textContent;
  const blob = new Blob([key], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `vaultsync_private_key_${state.user.username}.pem`;
  a.click();
  URL.revokeObjectURL(url);
  toast('success', 'Key downloaded', 'Store it in a secure location.');
}

/** Continue to the dashboard once the user has confirmed key backup. */
function proceedAfterKeyBackup() {
  state.pendingRegister = null;
  enterDashboard();
}

/* ════════════════════════════════════════
   LOGOUT
════════════════════════════════════════ */

/**
 * Invalidate the session on the server and redirect to login.
 */
async function handleLogout() {
  try { await api('POST', '/auth/logout'); } catch { /* best effort */ }

  state.token               = null;
  state.user                = null;
  state.encryptedPrivateKey = null;
  localStorage.removeItem('vaultsync_token');
  localStorage.removeItem('vaultsync_enc_key');
  stopMetricsPolling();
  showView('viewLogin');
  toast('info', 'Logged out', 'Your session has ended.');
}

/* ════════════════════════════════════════
   OTP INPUT KEYBOARD WIRING
   (runs once DOM is ready)
════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Backspace in an empty OTP cell moves focus to previous cell
  document.querySelectorAll('.otp-input').forEach((input, index) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) {
        const inputs = document.querySelectorAll('.otp-input');
        inputs[index - 1].focus();
        inputs[index - 1].value = '';
        inputs[index - 1].classList.remove('filled');
      }
    });
  });

  // Enter key triggers login when on the login view
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const loginView = document.getElementById('viewLogin');
      if (loginView && !loginView.classList.contains('hidden')) {
        handleLogin();
      }
    }
  });
});