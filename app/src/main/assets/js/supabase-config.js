/* ==========================================================================
   SUPABASE AUTHENTICATION & CLOUD DATABASE SYNCHRONIZATION
   Connected to Supabase Project: devvrushabh's Project (ewdaujbxezjujcmxklyj)
   ========================================================================== */

const SUPABASE_URL = "https://ewdaujbxezjujcmxklyj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3ZGF1amJ4ZXpqdWpjbXhrbHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3Nzc5NTEsImV4cCI6MjEwMTM1Mzk1MX0.1wEByWaLW_pBkUaOcdM24EEJMlqh5I6tADqiJzDInyA";

const SupabaseAuthManager = {
  client: null,
  currentUser: null,

  _isOAuthCallback: false,

  hidePreloader: function() {
    setTimeout(function() {
      const loader = document.getElementById('prelogin-loader');
      if (loader) {
        loader.classList.add('fade-out');
        setTimeout(function() {
          loader.style.display = 'none';
        }, 300);
      }
    }, 150);
  },

  init: function() {
    try {
      // Safety fallback to hide preloader after 3 seconds max
      setTimeout(() => this.hidePreloader(), 3000);

      // Detect if this page load is a Google OAuth callback (tokens in URL hash)
      const hashParams = window.location.hash;
      if (hashParams && (hashParams.includes('access_token') || hashParams.includes('refresh_token') || hashParams.includes('type=recovery'))) {
        this._isOAuthCallback = true;
        // Keep the welcome screen hidden while we process the callback
        const overlay = document.getElementById('auth-welcome-screen');
        if (overlay) overlay.style.display = 'none';
      }

      if (window.supabase) {
        this.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            detectSessionInUrl: true,
            flowType: 'implicit'
          }
        });
        console.log("Supabase Client initialized successfully.");

        // Check current session
        this.client.auth.getSession().then(({ data: { session } }) => {
          if (session && session.user) {
            this.currentUser = session.user;
            sessionStorage.setItem('daily_invoicer_authenticated', 'true');
            updateAuthUIState(session.user);
            unlockAppScreen();
            this.syncInvoicesFromSupabase(session.user.id);
            this._cleanUrlHash();
          } else if (!this._isOAuthCallback) {
            // Only show login screen if this is NOT an OAuth callback in progress
            const sessionActive = sessionStorage.getItem('daily_invoicer_authenticated');
            if (sessionActive !== 'true') {
              lockAppScreen();
            }
          }
          this.hidePreloader();
        }).catch(() => {
          this.hidePreloader();
        });

        // Listen for auth state changes (Sign In, Sign Out, Token Refresh)
        this.client.auth.onAuthStateChange((event, session) => {
          const user = session?.user || null;
          this.currentUser = user;
          updateAuthUIState(user);

          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            sessionStorage.setItem('daily_invoicer_authenticated', 'true');
            unlockAppScreen();
            if (user) this.syncInvoicesFromSupabase(user.id);
            this._cleanUrlHash();
          } else if (event === 'SIGNED_OUT') {
            sessionStorage.removeItem('daily_invoicer_authenticated');
            lockAppScreen();
          } else if (user) {
            sessionStorage.setItem('daily_invoicer_authenticated', 'true');
            unlockAppScreen();
            this.syncInvoicesFromSupabase(user.id);
          } else {
            const sessionActive = sessionStorage.getItem('daily_invoicer_authenticated');
            if (sessionActive === 'true') {
              unlockAppScreen();
            } else {
              lockAppScreen();
            }
          }
          this.hidePreloader();
        });
      } else {
        this.hidePreloader();
      }
    } catch (err) {
      console.warn("Supabase Init Warning:", err);
      this.hidePreloader();
    }
  },

  // 1. Manual Email / Password Sign Up
  signUp: async function(email, password, fullName) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Please enter an email address.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    if (this.client) {
      try {
        const { data, error } = await this.client.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              full_name: fullName || cleanEmail.split('@')[0]
            }
          }
        });
        if (error) {
          return { success: false, error: error.message };
        }
        if (data && data.user) {
          // Check if email confirmation is required
          if (data.user.identities && data.user.identities.length === 0) {
            return { success: false, error: 'This email is already registered. Please sign in instead.' };
          }
          sessionStorage.setItem('daily_invoicer_authenticated', 'true');
          this.currentUser = data.user;
          updateAuthUIState(data.user);
          unlockAppScreen();
          return { success: true, user: data.user };
        }
        return { success: false, error: 'Sign up failed. Please try again.' };
      } catch (err) {
        console.warn("Supabase Sign Up Error:", err);
        return { success: false, error: err.message || 'Sign up failed. Please try again.' };
      }
    }
    return { success: false, error: 'Authentication service unavailable. Please try again later.' };
  },

  // 2. Manual Email / Password Sign In
  signIn: async function(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Please enter an email address.' };
    }
    if (!password) {
      return { success: false, error: 'Please enter your password.' };
    }

    if (this.client) {
      try {
        const { data, error } = await this.client.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });
        if (error) {
          return { success: false, error: error.message };
        }
        if (data && data.user) {
          sessionStorage.setItem('daily_invoicer_authenticated', 'true');
          this.currentUser = data.user;
          updateAuthUIState(data.user);
          unlockAppScreen();
          return { success: true, user: data.user };
        }
        return { success: false, error: 'Sign in failed. Please check your credentials.' };
      } catch (err) {
        console.warn("Supabase Sign In Error:", err);
        return { success: false, error: err.message || 'Sign in failed. Please try again.' };
      }
    }
    return { success: false, error: 'Authentication service unavailable. Please try again later.' };
  },

  // 3. Google OAuth Sign In
  // Clean up OAuth tokens from URL hash after successful auth
  _cleanUrlHash: function() {
    if (window.location.hash && window.location.hash.includes('access_token')) {
      // Replace the hash without triggering a page reload
      const cleanUrl = window.location.pathname + window.location.search;
      window.history.replaceState(null, '', cleanUrl);
    }
  },

  signInWithGoogle: async function() {
    if (this.client) {
      try {
        // Use only the origin to avoid redirect URL mismatches
        const redirectUrl = window.location.origin + window.location.pathname;
        const { data, error } = await this.client.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            queryParams: {
              prompt: 'select_account'
            }
          }
        });
        if (error) throw error;
        return { success: true };
      } catch (err) {
        console.warn("Supabase Google Auth Notice:", err);
      }
    }
    const fallbackUser = this._localAuthFallback("google.user@gmail.com", "Google User");
    return { success: true, user: fallbackUser };
  },

  // Sign Out
  signOut: async function() {
    sessionStorage.removeItem('daily_invoicer_authenticated');
    localStorage.removeItem('apex_mock_user');
    this.currentUser = null;

    if (this.client) {
      try {
        await this.client.auth.signOut();
      } catch (e) {}
    }
    updateAuthUIState(null);
    lockAppScreen();
    return { success: true };
  },

  // Local Auth Fallback if Offline or Unreachable
  _localAuthFallback: function(email, displayName) {
    const mockUser = {
      id: 'usr-' + String(email || 'demo').toLowerCase().replace(/[^a-z0-9]/g, ''),
      email: email || 'demo@email.com',
      user_metadata: {
        full_name: displayName || (email ? email.split('@')[0] : 'Demo User')
      }
    };
    localStorage.setItem('apex_mock_user', JSON.stringify(mockUser));
    sessionStorage.setItem('daily_invoicer_authenticated', 'true');
    this.currentUser = mockUser;
    updateAuthUIState(mockUser);
    unlockAppScreen();
    return mockUser;
  },

  // Cloud Database Sync: Load user invoices from Supabase
  syncInvoicesFromSupabase: async function(userId) {
    if (!this.client || !userId) return;
    try {
      const { data, error } = await this.client
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("Supabase Fetch Invoices Notice:", error);
        return;
      }

      if (data && data.length > 0) {
        const cloudInvoices = data.map(row => ({
          ...(row.data || {}),
          id: row.id,
          number: row.number,
          clientName: row.client_name,
          status: row.status,
          issueDate: row.issue_date,
          dueDate: row.due_date,
          currency: row.currency
        }));
        invoicesList = cloudInvoices;
        if (typeof saveInvoicesToStorage === 'function') saveInvoicesToStorage();
        if (typeof renderSavedInvoicesList === 'function') renderSavedInvoicesList();
        if (typeof updateHeaderStats === 'function') updateHeaderStats();
      }
    } catch (err) {
      console.warn("Supabase Sync Exception:", err);
    }
  },

  // Cloud Database Sync: Save/Upsert single invoice to Supabase
  saveInvoiceToSupabase: async function(invoice) {
    if (!this.client || !this.currentUser) return false;
    try {
      const docId = invoice.id || invoice.number || ('inv-' + Date.now());
      const payload = {
        id: docId,
        user_id: this.currentUser.id,
        number: invoice.number || 'INV-000',
        client_name: invoice.clientName || 'Untitled Client',
        status: invoice.status || 'Unpaid',
        issue_date: invoice.date || '',
        due_date: invoice.dueDate || '',
        currency: invoice.currency || 'INR',
        data: invoice,
        updated_at: new Date().toISOString()
      };

      const { error } = await this.client
        .from('invoices')
        .upsert(payload);

      if (error) {
        console.warn("Supabase Save Invoice Notice:", error);
        return false;
      }
      return true;
    } catch (err) {
      return false;
    }
  },

  // Cloud Database Sync: Delete invoice from Supabase
  deleteInvoiceFromSupabase: async function(invoiceId) {
    if (!this.client || !this.currentUser || !invoiceId) return false;
    try {
      const { error } = await this.client
        .from('invoices')
        .delete()
        .eq('id', invoiceId)
        .eq('user_id', this.currentUser.id);

      if (error) console.warn("Supabase Delete Notice:", error);
      return true;
    } catch (err) {
      return false;
    }
  }
};

// Show auth error message on the welcome screen
function showAuthError(message) {
  // Remove any existing error
  const existing = document.querySelector('.auth-error-msg');
  if (existing) existing.remove();

  const errorDiv = document.createElement('div');
  errorDiv.className = 'auth-error-msg';
  errorDiv.style.cssText = 'background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; padding: 10px 14px; margin-top: 10px; font-size: 13px; text-align: center; animation: fadeIn 0.2s ease;';
  errorDiv.textContent = message;

  // Insert after the active form
  const activeForm = document.getElementById('welcome-signin-form')?.style.display !== 'none'
    ? document.getElementById('welcome-signin-form')
    : document.getElementById('welcome-signup-form');
  if (activeForm) {
    activeForm.parentNode.insertBefore(errorDiv, activeForm.nextSibling);
  }

  // Auto-remove after 5 seconds
  setTimeout(() => { if (errorDiv.parentNode) errorDiv.remove(); }, 5000);
}

// UI Handler Wrappers for Welcome Auth Screen
function handleWelcomeSignIn(event) {
  if (event && event.preventDefault) event.preventDefault();
  const emailInput = document.getElementById('welcome-signin-email');
  const passInput = document.getElementById('welcome-signin-password');

  const email = emailInput ? emailInput.value : '';
  const password = passInput ? passInput.value : '';

  SupabaseAuthManager.signIn(email, password).then((res) => {
    if (res.success) {
      if (window.AndroidNative) window.AndroidNative.showToast("Signed in successfully!");
    } else {
      showAuthError(res.error || 'Invalid email or password.');
    }
  });
}

function handleWelcomeSignUp(event) {
  if (event && event.preventDefault) event.preventDefault();
  const nameInput = document.getElementById('welcome-signup-name');
  const emailInput = document.getElementById('welcome-signup-email');
  const passInput = document.getElementById('welcome-signup-password');

  const name = nameInput ? nameInput.value : '';
  const email = emailInput ? emailInput.value : '';
  const password = passInput ? passInput.value : '';

  SupabaseAuthManager.signUp(email, password, name).then((res) => {
    if (res.success) {
      if (window.AndroidNative) window.AndroidNative.showToast("Account created successfully!");
    } else {
      showAuthError(res.error || 'Sign up failed. Please try again.');
    }
  });
}

function handleGoogleSignIn() {
  // Show loading state on the button — don't unlock the app yet
  const googleBtn = document.querySelector('.btn-google-auth');
  if (googleBtn) {
    googleBtn.disabled = true;
    googleBtn.innerHTML = '<span>Redirecting to Google...</span>';
  }

  SupabaseAuthManager.signInWithGoogle().then((res) => {
    // Don't call unlockAppScreen() here — the browser is about to redirect
    // to Google. The actual sign-in will be handled by onAuthStateChange
    // when the user returns from Google's OAuth page.
    if (!res.success) {
      // Only restore button if OAuth failed (not redirecting)
      if (googleBtn) {
        googleBtn.disabled = false;
        googleBtn.innerHTML = '<svg class="google-svg-icon" viewBox="0 0 48 48" width="20" height="20"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg><span>Sign in with Google</span>';
      }
    }
  }).catch(() => {
    if (googleBtn) {
      googleBtn.disabled = false;
      googleBtn.innerHTML = '<svg class="google-svg-icon" viewBox="0 0 48 48" width="20" height="20"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg><span>Sign in with Google</span>';
    }
  });
}

function enterAsGuest() {
  sessionStorage.setItem('daily_invoicer_authenticated', 'true');
  unlockAppScreen();
  if (window.AndroidNative) window.AndroidNative.showToast("Entered in Guest Mode!");
}

function handleSignOutAction() {
  const confirmOut = confirm("Are you sure you want to sign out and lock the application?");
  if (confirmOut) {
    SupabaseAuthManager.signOut().then(() => {
      if (window.AndroidNative) window.AndroidNative.showToast("Signed Out successfully!");
    });
  }
}

function updateAuthUIState(user) {
  const displayEmail = document.getElementById('settings-account-email');
  const btnSettingsSignOut = document.getElementById('btn-settings-sign-out');

  if (user) {
    const userEmail = user.email || user.user_metadata?.full_name || 'Authenticated User';
    if (displayEmail) displayEmail.textContent = userEmail;
    if (btnSettingsSignOut) {
      btnSettingsSignOut.innerHTML = '<i data-lucide="log-out"></i> Sign Out (' + userEmail.split('@')[0] + ')';
    }
  } else {
    if (displayEmail) displayEmail.textContent = "Guest Mode (Local Only)";
    if (btnSettingsSignOut) {
      btnSettingsSignOut.innerHTML = '<i data-lucide="log-out"></i> Sign Out / Lock';
    }
  }
  if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
}

function unlockAppScreen() {
  const overlay = document.getElementById('auth-welcome-screen');
  const app = document.getElementById('app');
  if (overlay) overlay.style.display = 'none';
  if (app) app.style.display = 'flex';
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function lockAppScreen() {
  const overlay = document.getElementById('auth-welcome-screen');
  const app = document.getElementById('app');
  if (overlay) overlay.style.display = 'flex';
  if (app) app.style.display = 'none';
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function switchAuthTab(tab) {
  const btnSignIn = document.getElementById('tab-btn-signin');
  const btnSignUp = document.getElementById('tab-btn-signup');
  const formSignIn = document.getElementById('welcome-signin-form');
  const formSignUp = document.getElementById('welcome-signup-form');

  if (tab === 'signup') {
    if (btnSignIn) btnSignIn.classList.remove('active');
    if (btnSignUp) btnSignUp.classList.add('active');
    if (formSignIn) formSignIn.style.display = 'none';
    if (formSignUp) formSignUp.style.display = 'block';
  } else {
    if (btnSignUp) btnSignUp.classList.remove('active');
    if (btnSignIn) btnSignIn.classList.add('active');
    if (formSignUp) formSignUp.style.display = 'none';
    if (formSignIn) formSignIn.style.display = 'block';
  }
}

function autofillDemoCredentials() {
  const emailInput = document.getElementById('welcome-signin-email');
  const passInput = document.getElementById('welcome-signin-password');
  if (emailInput) emailInput.value = 'devvrushabh@gmail.com';
  if (passInput) passInput.value = 'Demo123456';
}

window.unlockAppScreen = unlockAppScreen;
window.lockAppScreen = lockAppScreen;
window.switchAuthTab = switchAuthTab;
window.autofillDemoCredentials = autofillDemoCredentials;
window.handleWelcomeSignIn = handleWelcomeSignIn;
window.handleWelcomeSignUp = handleWelcomeSignUp;
window.handleGoogleSignIn = handleGoogleSignIn;
window.enterAsGuest = enterAsGuest;
window.handleSignOutAction = handleSignOutAction;

document.addEventListener('DOMContentLoaded', () => {
  SupabaseAuthManager.init();
});
