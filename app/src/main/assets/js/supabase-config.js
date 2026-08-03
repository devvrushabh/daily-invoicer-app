/* ==========================================================================
   SUPABASE AUTHENTICATION & CLOUD DATABASE SYNCHRONIZATION
   Connected to Supabase Project: devvrushabh's Project (ewdaujbxezjujcmxklyj)
   ========================================================================== */

const SUPABASE_URL = "https://ewdaujbxezjujcmxklyj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3ZGF1amJ4ZXpqdWpjbXhrbHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3Nzc5NTEsImV4cCI6MjEwMTM1Mzk1MX0.1wEByWaLW_pBkUaOcdM24EEJMlqh5I6tADqiJzDInyA";

const SupabaseAuthManager = {
  client: null,
  currentUser: null,

  init: function() {
    try {
      if (window.supabase) {
        this.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase Client initialized successfully.");

        // Check current session
        this.client.auth.getSession().then(({ data: { session } }) => {
          if (session && session.user) {
            this.currentUser = session.user;
            sessionStorage.setItem('daily_invoicer_authenticated', 'true');
            updateAuthUIState(session.user);
            unlockAppScreen();
            this.syncInvoicesFromSupabase(session.user.id);
          }
        });

        // Listen for auth state changes (Sign In, Sign Out, Token Refresh)
        this.client.auth.onAuthStateChange((event, session) => {
          const user = session?.user || null;
          this.currentUser = user;
          updateAuthUIState(user);

          if (user) {
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
        });
      }
    } catch (err) {
      console.warn("Supabase Init Warning:", err);
    }
  },

  // 1. Manual Email / Password Sign Up
  signUp: async function(email, password, fullName) {
    const cleanEmail = (email || '').trim().toLowerCase();
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
        if (error) throw error;
        if (data && data.user) {
          sessionStorage.setItem('daily_invoicer_authenticated', 'true');
          this.currentUser = data.user;
          updateAuthUIState(data.user);
          unlockAppScreen();
          return { success: true, user: data.user };
        }
      } catch (err) {
        console.warn("Supabase Sign Up Error:", err);
        return { success: false, error: err.message || "Failed to sign up" };
      }
    }
    const fallbackUser = this._localAuthFallback(cleanEmail, fullName);
    return { success: true, user: fallbackUser };
  },

  // 2. Manual Email / Password Sign In
  signIn: async function(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (this.client) {
      try {
        const { data, error } = await this.client.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });
        if (error) throw error;
        if (data && data.user) {
          sessionStorage.setItem('daily_invoicer_authenticated', 'true');
          this.currentUser = data.user;
          updateAuthUIState(data.user);
          unlockAppScreen();
          return { success: true, user: data.user };
        }
      } catch (err) {
        console.warn("Supabase Sign In Error:", err);
        return { success: false, error: err.message || "Invalid login credentials" };
      }
    }
    const fallbackUser = this._localAuthFallback(cleanEmail, cleanEmail.split('@')[0]);
    return { success: true, user: fallbackUser };
  },

  // 3. Google OAuth Sign In
  signInWithGoogle: async function() {
    if (this.client) {
      try {
        const { data, error } = await this.client.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + window.location.pathname
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

// UI Handler Wrappers for Welcome Auth Screen
function handleWelcomeSignIn(event) {
  event.preventDefault();
  const email = document.getElementById('welcome-signin-email').value;
  const password = document.getElementById('welcome-signin-password').value;

  SupabaseAuthManager.signIn(email, password).then((res) => {
    if (res.success) {
      sessionStorage.setItem('daily_invoicer_authenticated', 'true');
      unlockAppScreen();
      if (window.AndroidNative) window.AndroidNative.showToast("Signed in with Supabase!");
    } else {
      alert("Sign In Error: " + res.error);
    }
  });
}

function handleWelcomeSignUp(event) {
  event.preventDefault();
  const name = document.getElementById('welcome-signup-name').value;
  const email = document.getElementById('welcome-signup-email').value;
  const password = document.getElementById('welcome-signup-password').value;

  SupabaseAuthManager.signUp(email, password, name).then((res) => {
    if (res.success) {
      sessionStorage.setItem('daily_invoicer_authenticated', 'true');
      unlockAppScreen();
      if (window.AndroidNative) window.AndroidNative.showToast("Account Created in Supabase!");
    } else {
      alert("Sign Up Error: " + res.error);
    }
  });
}

function handleGoogleSignIn() {
  SupabaseAuthManager.signInWithGoogle().then((res) => {
    if (res.success) {
      sessionStorage.setItem('daily_invoicer_authenticated', 'true');
      unlockAppScreen();
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

window.handleWelcomeSignIn = handleWelcomeSignIn;
window.handleWelcomeSignUp = handleWelcomeSignUp;
window.handleGoogleSignIn = handleGoogleSignIn;
window.enterAsGuest = enterAsGuest;
window.handleSignOutAction = handleSignOutAction;

document.addEventListener('DOMContentLoaded', () => {
  SupabaseAuthManager.init();
});
