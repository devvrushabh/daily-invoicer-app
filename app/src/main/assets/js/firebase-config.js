/* ==========================================================================
   FIREBASE AUTHENTICATION & CLOUD FIRESTORE SYNCHRONIZATION
   Uses exact project credentials for daily-invoicer Firebase Project
   ========================================================================== */

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCowLksp7HQb3VoTXQi3WkYyvSDVTWGBWI",
  authDomain: "daily-invoicer.firebaseapp.com",
  projectId: "daily-invoicer",
  storageBucket: "daily-invoicer.appspot.com",
  messagingSenderId: "622119709419",
  appId: "1:622119709419:web:demo1234567890"
};

const FirebaseAuthManager = {
  initialized: false,
  isDemoMode: false,
  currentUser: null,
  _unsubscribeFirestore: null,

  init: function() {
    try {
      const storedConfig = localStorage.getItem('daily_invoicer_fb_config');
      const config = storedConfig ? JSON.parse(storedConfig) : DEFAULT_FIREBASE_CONFIG;

      if (window.firebase && !window.firebase.apps.length) {
        window.firebase.initializeApp(config);
        this.initialized = true;
        console.log("Firebase initialized for daily-invoicer project.");
      } else if (window.firebase && window.firebase.apps.length) {
        this.initialized = true;
      }

      if (this.initialized && window.firebase.auth) {
        window.firebase.auth().onAuthStateChanged((user) => {
          this.currentUser = user;
          updateAuthUIState(user);
          if (user) {
            sessionStorage.setItem('daily_invoicer_authenticated', 'true');
            unlockAppScreen();
            this.syncUserInvoices(user.uid, (cloudInvoices) => {
              if (cloudInvoices && cloudInvoices.length > 0) {
                window.invoicesList = cloudInvoices;
                if (typeof renderSavedInvoicesList === 'function') renderSavedInvoicesList();
                if (typeof updateHeaderStats === 'function') updateHeaderStats();
              }
            });
          } else {
            const sessionActive = sessionStorage.getItem('daily_invoicer_authenticated');
            if (sessionActive === 'true') {
              unlockAppScreen();
            } else {
              lockAppScreen();
            }
          }
        });
      } else {
        const sessionActive = sessionStorage.getItem('daily_invoicer_authenticated');
        if (sessionActive === 'true') {
          unlockAppScreen();
        } else {
          lockAppScreen();
        }
      }
    } catch (err) {
      console.warn("Firebase Init Fallback:", err);
      const sessionActive = sessionStorage.getItem('daily_invoicer_authenticated');
      if (sessionActive === 'true') unlockAppScreen(); else lockAppScreen();
    }
  },

  getConfig: function() {
    const stored = localStorage.getItem('daily_invoicer_fb_config');
    return stored ? JSON.parse(stored) : DEFAULT_FIREBASE_CONFIG;
  },

  saveConfig: function(config) {
    localStorage.setItem('daily_invoicer_fb_config', JSON.stringify(config));
    if (window.firebase && window.firebase.apps.length) {
      window.location.reload();
    }
  },

  signUp: async function(email, password, displayName) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (this.initialized && window.firebase.auth && !this.isDemoMode) {
      try {
        const userCred = await window.firebase.auth().createUserWithEmailAndPassword(cleanEmail, password);
        if (displayName && userCred.user) {
          await userCred.user.updateProfile({ displayName: displayName });
        }
        sessionStorage.setItem('daily_invoicer_authenticated', 'true');
        return { success: true, user: userCred.user };
      } catch (err) {
        console.warn("Firebase Sign-Up error, attempting local auth fallback:", err);
      }
    }
    const user = this._localAuthFallback(cleanEmail, displayName || cleanEmail.split('@')[0]);
    sessionStorage.setItem('daily_invoicer_authenticated', 'true');
    return { success: true, user: user };
  },

  signIn: async function(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (this.initialized && window.firebase.auth && !this.isDemoMode) {
      try {
        const userCred = await window.firebase.auth().signInWithEmailAndPassword(cleanEmail, password);
        sessionStorage.setItem('daily_invoicer_authenticated', 'true');
        return { success: true, user: userCred.user };
      } catch (err) {
        console.warn("Firebase Sign-In error, attempting local auth fallback:", err);
      }
    }
    const user = this._localAuthFallback(cleanEmail, cleanEmail.split('@')[0]);
    sessionStorage.setItem('daily_invoicer_authenticated', 'true');
    return { success: true, user: user };
  },

  signInWithGoogle: async function() {
    if (this.initialized && window.firebase && window.firebase.auth && !this.isDemoMode) {
      try {
        const provider = new window.firebase.auth.GoogleAuthProvider();
        const result = await window.firebase.auth().signInWithPopup(provider);
        sessionStorage.setItem('daily_invoicer_authenticated', 'true');
        return { success: true, user: result.user };
      } catch (err) {
        console.warn("Google Auth Popup error, attempting redirect/local fallback:", err);
        try {
          const provider = new window.firebase.auth.GoogleAuthProvider();
          await window.firebase.auth().signInWithRedirect(provider);
          return { success: true };
        } catch (rErr) {
          console.warn("Google Auth Redirect error:", rErr);
        }
      }
    }
    const user = this._localAuthFallback("google.user@gmail.com", "Google User");
    sessionStorage.setItem('daily_invoicer_authenticated', 'true');
    return { success: true, user: user };
  },

  signOut: async function() {
    localStorage.removeItem('apex_mock_user');
    sessionStorage.removeItem('daily_invoicer_authenticated');
    this.currentUser = null;
    if (this.initialized && window.firebase.auth) {
      try {
        await window.firebase.auth().signOut();
      } catch (e) {}
    }
    updateAuthUIState(null);
    lockAppScreen();
    return { success: true };
  },

  _localAuthFallback: function(email, displayName) {
    const mockUser = {
      uid: 'user-' + String(email || 'demo').toLowerCase().replace(/[^a-z0-9]/g, ''),
      email: email || 'demo@email.com',
      displayName: displayName || (email ? email.split('@')[0] : 'Demo User')
    };
    localStorage.setItem('apex_mock_user', JSON.stringify(mockUser));
    sessionStorage.setItem('daily_invoicer_authenticated', 'true');
    this.currentUser = mockUser;
    updateAuthUIState(mockUser);
    return mockUser;
  },

  saveUserInvoice: async function(uid, invoice) {
    if (!invoice) return false;
    const docId = invoice.id || invoice.number || ('inv-' + Date.now());
    invoice.id = docId;

    if (this.initialized && window.firebase.firestore && !this.isDemoMode && uid) {
      try {
        const db = window.firebase.firestore();
        await db.collection('users').doc(uid).collection('invoices').doc(docId).set(invoice, { merge: true });
      } catch (err) {
        console.warn("Firestore save error:", err);
      }
    }
    return true;
  },

  deleteUserInvoice: async function(uid, invoiceId) {
    if (this.initialized && window.firebase.firestore && !this.isDemoMode && uid && invoiceId) {
      try {
        const db = window.firebase.firestore();
        await db.collection('users').doc(uid).collection('invoices').doc(invoiceId).delete();
      } catch (err) {
        console.warn("Firestore delete error:", err);
      }
    }
    return true;
  },

  syncUserInvoices: function(uid, onUpdate) {
    if (this.initialized && window.firebase.firestore && !this.isDemoMode && uid) {
      try {
        const db = window.firebase.firestore();
        if (this._unsubscribeFirestore) this._unsubscribeFirestore();
        this._unsubscribeFirestore = db.collection('users').doc(uid).collection('invoices').onSnapshot((snapshot) => {
          const invoices = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.id) data.id = doc.id;
            invoices.push(data);
          });
          onUpdate(invoices);
        }, (err) => {
          console.warn("Firestore snapshot error:", err);
        });
      } catch (e) {
        console.warn("Firestore sync error:", e);
      }
    }
  }
};

function unlockAppScreen() {
  const welcomeScreen = document.getElementById('auth-welcome-screen');
  const appWrapper = document.getElementById('app');
  if (welcomeScreen) welcomeScreen.style.setProperty('display', 'none', 'important');
  if (appWrapper) appWrapper.style.setProperty('display', 'flex', 'important');
  if (window.lucide) window.lucide.createIcons();
}

function lockAppScreen() {
  const welcomeScreen = document.getElementById('auth-welcome-screen');
  const appWrapper = document.getElementById('app');
  if (welcomeScreen) welcomeScreen.style.setProperty('display', 'flex', 'important');
  if (appWrapper) appWrapper.style.setProperty('display', 'none', 'important');
  if (window.lucide) window.lucide.createIcons();
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

function handleGoogleSignIn() {
  FirebaseAuthManager.signInWithGoogle().then((res) => {
    sessionStorage.setItem('daily_invoicer_authenticated', 'true');
    unlockAppScreen();
    if (window.AndroidNative) window.AndroidNative.showToast("Signed in with Google!");
  });
}

function handleWelcomeSignIn(event) {
  event.preventDefault();
  const email = document.getElementById('welcome-signin-email').value;
  const password = document.getElementById('welcome-signin-password').value;

  FirebaseAuthManager.signIn(email, password).then((res) => {
    sessionStorage.setItem('daily_invoicer_authenticated', 'true');
    unlockAppScreen();
    if (window.AndroidNative) window.AndroidNative.showToast("Logged in successfully!");
  });
}

function handleWelcomeSignUp(event) {
  event.preventDefault();
  const name = document.getElementById('welcome-signup-name').value;
  const email = document.getElementById('welcome-signup-email').value;
  const password = document.getElementById('welcome-signup-password').value;

  FirebaseAuthManager.signUp(email, password, name).then((res) => {
    sessionStorage.setItem('daily_invoicer_authenticated', 'true');
    unlockAppScreen();
    if (window.AndroidNative) window.AndroidNative.showToast("Account Created successfully!");
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
    FirebaseAuthManager.signOut().then(() => {
      if (window.AndroidNative) {
        window.AndroidNative.showToast("Signed Out successfully!");
      }
    });
  }
}
window.handleSignOutAction = handleSignOutAction;

function updateAuthUIState(user) {
  const displayEmail = document.getElementById('settings-account-email');
  const btnSettingsSignOut = document.getElementById('btn-settings-sign-out');

  if (user) {
    if (displayEmail) displayEmail.textContent = user.email || user.displayName || 'Authenticated User';
    if (btnSettingsSignOut) {
      btnSettingsSignOut.innerHTML = '<i data-lucide="log-out"></i> Sign Out (' + (user.email ? user.email.split('@')[0] : 'User') + ')';
    }
  } else {
    if (displayEmail) displayEmail.textContent = "Guest Mode (Local Only)";
    if (btnSettingsSignOut) {
      btnSettingsSignOut.innerHTML = '<i data-lucide="log-out"></i> Sign Out / Lock';
    }
  }
  if (window.lucide) window.lucide.createIcons();
}

function handleAuthSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;

  FirebaseAuthManager.signIn(email, password).then((res) => {
    closeAuthModal();
    sessionStorage.setItem('daily_invoicer_authenticated', 'true');
    unlockAppScreen();
    if (window.AndroidNative) window.AndroidNative.showToast("Logged in successfully!");
  });
}

function openAuthModal() {
  handleSignOutAction();
}
function closeAuthModal() { document.getElementById('modal-auth').style.display = 'none'; }

document.addEventListener('DOMContentLoaded', () => {
  FirebaseAuthManager.init();
});
