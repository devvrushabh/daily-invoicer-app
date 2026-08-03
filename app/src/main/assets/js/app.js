/* ==========================================================================
   DAILY INVOICER MOBILE - MAIN APPLICATION STATE & UI CONTROLLER
   ========================================================================== */

let currentInvoice = null;
let invoicesList = [];
let businessProfile = {};
let activeTab = 'invoices';

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  loadStoredData();
  setupEventListeners();
  setupBottomNav();

  if (invoicesList.length === 0) {
    currentInvoice = getBlankInvoice();
    invoicesList.push(currentInvoice);
    saveInvoicesToStorage();
  } else {
    currentInvoice = invoicesList[0];
  }

  populateEditorForm(currentInvoice);
  renderSavedInvoicesList();
  updateLivePreviewSheet();
  updateHeaderStats();
  
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const themeText = document.getElementById('settings-theme-text');
  if (themeText) themeText.textContent = (currentTheme === 'dark' ? 'Dark' : 'Light') + ' Theme Active';

  refreshIcons();
});

// Load Data from LocalStorage
function loadStoredData() {
  try {
    const savedInvoices = localStorage.getItem('daily_invoices_list');
    if (savedInvoices) invoicesList = JSON.parse(savedInvoices);

    const savedProfile = localStorage.getItem('daily_biz_profile');
    if (savedProfile) {
      businessProfile = JSON.parse(savedProfile);
      populateProfileForm(businessProfile);
    }
  } catch (e) {
    console.error("Error loading stored data:", e);
  }
}

function saveInvoicesToStorage() {
  localStorage.setItem('daily_invoices_list', JSON.stringify(invoicesList));
  if (typeof saveInvoiceToCloud === 'function' && currentInvoice) {
    saveInvoiceToCloud(currentInvoice);
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Top App Bar Buttons
  const btnNew = document.getElementById('bar-btn-new'); if (btnNew) btnNew.onclick = createNewInvoice;
  const btnSave = document.getElementById('bar-btn-save'); if (btnSave) btnSave.onclick = saveCurrentInvoice;
  const btnPdf = document.getElementById('bar-btn-pdf'); if (btnPdf) btnPdf.onclick = downloadInvoicePDF;
  const btnSignOutHeader = document.getElementById('bar-btn-signout'); if (btnSignOutHeader) btnSignOutHeader.onclick = handleSignOutAction;

  // View 3 Action Bar Buttons
  const btnPayNow = document.getElementById('btn-pay-now'); if (btnPayNow) btnPayNow.onclick = openPaymentModal;
  const btnShare = document.getElementById('btn-share-invoice'); if (btnShare) btnShare.onclick = shareInvoicePDF;
  const btnSendEmail = document.getElementById('btn-send-email'); if (btnSendEmail) btnSendEmail.onclick = openSendEmailModal;
  const btnPrint = document.getElementById('btn-print-invoice'); if (btnPrint) btnPrint.onclick = printInvoiceDocument;
  const btnDownloadPdf = document.getElementById('btn-download-pdf'); if (btnDownloadPdf) btnDownloadPdf.onclick = downloadInvoicePDF;

  // Form Field Live Updates
  const formInputs = document.querySelectorAll('#invoice-form input, #invoice-form select, #invoice-form textarea');
  formInputs.forEach(input => {
    input.addEventListener('input', syncFormToInvoice);
    input.addEventListener('change', syncFormToInvoice);
  });

  // Profile Save
  const btnSaveProfile = document.getElementById('btn-save-business-profile'); if (btnSaveProfile) btnSaveProfile.onclick = saveBusinessProfile;
  const btnLoadProfile = document.getElementById('btn-load-saved-profile'); if (btnLoadProfile) btnLoadProfile.onclick = loadSavedProfileIntoInvoice;

  // Logo File Upload
  const inputLogo = document.getElementById('input-logo-file'); if (inputLogo) inputLogo.addEventListener('change', handleLogoUpload);
  const btnRemoveLogo = document.getElementById('btn-remove-logo'); if (btnRemoveLogo) btnRemoveLogo.onclick = removeLogo;

  // Theme Toggle
  const btnToggleTheme = document.getElementById('btn-toggle-theme'); if (btnToggleTheme) btnToggleTheme.onclick = toggleThemeMode;

  // Auth Modals & Sign Out
  const btnHeaderSignIn = document.getElementById('btn-header-sign-in'); if (btnHeaderSignIn) btnHeaderSignIn.onclick = openAuthModal;
  const btnSettingsSignOut = document.getElementById('btn-settings-sign-out'); if (btnSettingsSignOut) btnSettingsSignOut.onclick = handleSignOutAction;

  // Backup & Import
  const btnExport = document.getElementById('btn-export-backup'); if (btnExport) btnExport.onclick = exportBackupJSON;
  const inputImport = document.getElementById('input-import-json'); if (inputImport) inputImport.addEventListener('change', importBackupJSON);
  
  const btnPrivacy = document.getElementById('btn-open-privacy-policy'); if (btnPrivacy) btnPrivacy.onclick = openPrivacyModal;
  const btnAbout = document.getElementById('btn-open-about'); if (btnAbout) btnAbout.onclick = openAboutModal;
  const btnContact = document.getElementById('btn-open-contact'); if (btnContact) btnContact.onclick = openContactModal;

  // Search & Filter
  const searchInvoices = document.getElementById('search-saved-invoices'); if (searchInvoices) searchInvoices.addEventListener('input', renderSavedInvoicesList);
  const filterStatus = document.getElementById('filter-saved-status'); if (filterStatus) filterStatus.addEventListener('change', renderSavedInvoicesList);
}

// Bottom Navigation Tab Handler
function setupBottomNav() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.onclick = () => {
      const tabName = item.dataset.tab;
      switchTab(tabName);
    };
  });
}

function switchTab(tabName) {
  activeTab = tabName;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.mobile-view').forEach(el => el.classList.remove('active'));

  const activeNavItem = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
  const activeView = document.getElementById(`view-${tabName}`);

  if (activeNavItem) activeNavItem.classList.add('active');
  if (activeView) activeView.classList.add('active');

  // Update App Bar Title
  const titles = {
    invoices: 'Saved Invoices',
    editor: 'Invoice Editor',
    preview: 'Live Sheet Preview',
    profile: 'Business Profile',
    settings: 'App Settings'
  };
  document.getElementById('bar-view-title').textContent = titles[tabName] || 'Dashboard';

  if (tabName === 'preview') {
    updateLivePreviewSheet();
  }
  refreshIcons();
}

// Collapsible Card Body Toggler
function toggleCardBody(headerEl) {
  const cardBody = headerEl.nextElementSibling;
  const chevron = headerEl.querySelector('.chevron');
  if (cardBody) {
    if (cardBody.style.display === 'none') {
      cardBody.style.display = 'block';
      if (chevron) chevron.style.transform = 'rotate(0deg)';
    } else {
      cardBody.style.display = 'none';
      if (chevron) chevron.style.transform = 'rotate(-90deg)';
    }
  }
}

// Populate Editor Form
function populateEditorForm(inv) {
  if (!inv) return;
  document.getElementById('inv-number').value = inv.number || '';
  document.getElementById('inv-date').value = inv.issueDate || '';
  document.getElementById('inv-due-date').value = inv.dueDate || '';
  document.getElementById('inv-status').value = inv.status || 'Unpaid';
  document.getElementById('inv-currency').value = inv.currency || 'INR';
  document.getElementById('inv-po-number').value = inv.poNumber || '';

  document.getElementById('biz-name').value = inv.bizName || '';
  document.getElementById('biz-email').value = inv.bizEmail || '';
  document.getElementById('biz-phone').value = inv.bizPhone || '';
  document.getElementById('biz-address').value = inv.bizAddress || '';

  document.getElementById('client-name').value = inv.clientName || '';
  document.getElementById('client-email').value = inv.clientEmail || '';
  document.getElementById('client-phone').value = inv.clientPhone || '';
  document.getElementById('client-address').value = inv.clientAddress || '';

  document.getElementById('inv-tax-rate').value = inv.taxRate || 0;
  document.getElementById('inv-discount-val').value = inv.discountValue || 0;
  document.getElementById('inv-discount-type').value = inv.discountType || 'percent';
  document.getElementById('inv-shipping').value = inv.shipping || 0;
  document.getElementById('inv-amount-paid').value = inv.amountPaid || 0;

  document.getElementById('inv-payment-terms').value = inv.paymentTerms || '';
  document.getElementById('inv-notes').value = inv.notes || '';

  renderLineItems(inv.items || []);
  updateCalculations();
}

// Render Line Items in Form
function renderLineItems(items) {
  const container = document.getElementById('items-tbody');
  container.innerHTML = '';
  document.getElementById('items-count-badge').textContent = items.length;

  items.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'item-row-card';
    card.innerHTML = `
      <div class="item-row-top">
        <input type="text" placeholder="Service / Product Description" value="${item.description || ''}" oninput="updateLineItem(${index}, 'description', this.value)">
        <button type="button" class="btn-del-item" onclick="removeLineItem(${index})" title="Delete Item"><i data-lucide="trash-2"></i></button>
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label>Qty</label>
          <input type="number" min="1" step="1" value="${item.quantity || 1}" oninput="updateLineItem(${index}, 'quantity', this.value)">
        </div>
        <div class="form-group">
          <label>Rate (${CurrencySymbols[currentInvoice?.currency || 'INR']})</label>
          <input type="number" min="0" step="0.01" value="${item.rate || 0}" oninput="updateLineItem(${index}, 'rate', this.value)">
        </div>
      </div>
    `;
    container.appendChild(card);
  });
  refreshIcons();
}

function addNewLineItem() {
  if (!currentInvoice.items) currentInvoice.items = [];
  currentInvoice.items.push({
    id: Date.now(),
    description: 'New Service Item',
    quantity: 1,
    rate: 1000,
    amount: 1000
  });
  renderLineItems(currentInvoice.items);
  updateCalculations();
}

function updateLineItem(index, prop, value) {
  if (currentInvoice.items[index]) {
    currentInvoice.items[index][prop] = (prop === 'quantity' || prop === 'rate') ? parseFloat(value) || 0 : value;
    updateCalculations();
  }
}

function removeLineItem(index) {
  currentInvoice.items.splice(index, 1);
  renderLineItems(currentInvoice.items);
  updateCalculations();
}

// Sync Form to State
function syncFormToInvoice() {
  if (!currentInvoice) return;
  currentInvoice.number = document.getElementById('inv-number').value;
  currentInvoice.issueDate = document.getElementById('inv-date').value;
  currentInvoice.dueDate = document.getElementById('inv-due-date').value;
  currentInvoice.status = document.getElementById('inv-status').value;
  currentInvoice.currency = document.getElementById('inv-currency').value;
  currentInvoice.poNumber = document.getElementById('inv-po-number').value;

  currentInvoice.bizName = document.getElementById('biz-name').value;
  currentInvoice.bizEmail = document.getElementById('biz-email').value;
  currentInvoice.bizPhone = document.getElementById('biz-phone').value;
  currentInvoice.bizAddress = document.getElementById('biz-address').value;

  currentInvoice.clientName = document.getElementById('client-name').value;
  currentInvoice.clientEmail = document.getElementById('client-email').value;
  currentInvoice.clientPhone = document.getElementById('client-phone').value;
  currentInvoice.clientAddress = document.getElementById('client-address').value;

  currentInvoice.taxRate = parseFloat(document.getElementById('inv-tax-rate').value) || 0;
  currentInvoice.discountValue = parseFloat(document.getElementById('inv-discount-val').value) || 0;
  currentInvoice.discountType = document.getElementById('inv-discount-type').value;
  currentInvoice.shipping = parseFloat(document.getElementById('inv-shipping').value) || 0;
  currentInvoice.amountPaid = parseFloat(document.getElementById('inv-amount-paid').value) || 0;

  currentInvoice.paymentTerms = document.getElementById('inv-payment-terms').value;
  currentInvoice.notes = document.getElementById('inv-notes').value;

  updateCalculations();
}

// Update Summary Calculations
function updateCalculations() {
  if (!currentInvoice) return;
  const totals = calculateInvoiceTotals(currentInvoice);
  const curr = currentInvoice.currency || 'INR';

  document.getElementById('calc-subtotal').textContent = formatCurrency(totals.subtotal, curr);
  document.getElementById('calc-tax-amt').textContent = formatCurrency(totals.taxAmount, curr);
  
  if (totals.discountAmount > 0) {
    document.getElementById('calc-discount-row').style.display = 'flex';
    document.getElementById('calc-discount-amt').textContent = '-' + formatCurrency(totals.discountAmount, curr);
  } else {
    document.getElementById('calc-discount-row').style.display = 'none';
  }

  if (totals.shipping > 0) {
    document.getElementById('calc-shipping-row').style.display = 'flex';
    document.getElementById('calc-shipping-amt').textContent = formatCurrency(totals.shipping, curr);
  } else {
    document.getElementById('calc-shipping-row').style.display = 'none';
  }

  document.getElementById('calc-grand-total').textContent = formatCurrency(totals.grandTotal, curr);
  document.getElementById('calc-balance-due').textContent = formatCurrency(totals.balanceDue, curr);

  updateLivePreviewSheet();
}

// Update Live A4 Sheet Preview
function updateLivePreviewSheet() {
  if (!currentInvoice) return;
  const inv = currentInvoice;
  const totals = calculateInvoiceTotals(inv);
  const curr = inv.currency || 'INR';

  // Status Stamp
  const stamp = document.getElementById('preview-status-stamp');
  stamp.textContent = (inv.status || 'UNPAID').toUpperCase();
  stamp.className = 'status-stamp stamp-' + (inv.status || 'unpaid').toLowerCase();

  // Business Header
  document.getElementById('paper-biz-name').textContent = inv.bizName || 'Company Name';
  document.getElementById('paper-biz-email').textContent = inv.bizEmail || '';
  document.getElementById('paper-biz-phone').textContent = inv.bizPhone || '';
  document.getElementById('paper-biz-address').innerHTML = (inv.bizAddress || '').replace(/\n/g, '<br>');

  // Logo
  const logoImg = document.getElementById('paper-logo-img');
  const logoPlaceholder = document.getElementById('paper-logo-placeholder');
  if (inv.logoUrl) {
    logoImg.src = inv.logoUrl;
    logoImg.style.display = 'block';
    logoPlaceholder.style.display = 'none';
  } else {
    logoImg.style.display = 'none';
    logoPlaceholder.style.display = 'flex';
  }

  // Invoice Identifiers
  document.getElementById('paper-inv-number').textContent = '#' + (inv.number || 'INV-001');
  document.getElementById('paper-inv-date').textContent = inv.issueDate || '';
  document.getElementById('paper-inv-due-date').textContent = inv.dueDate || '';
  document.getElementById('paper-inv-po').textContent = inv.poNumber || 'N/A';
  document.getElementById('paper-status-pill').textContent = inv.status || 'Pending';

  // Client
  document.getElementById('paper-client-name').textContent = inv.clientName || 'Client Name';
  document.getElementById('paper-client-email').textContent = inv.clientEmail || '';
  document.getElementById('paper-client-phone').textContent = inv.clientPhone || '';
  document.getElementById('paper-client-address').innerHTML = (inv.clientAddress || '').replace(/\n/g, '<br>');

  // Table
  const tbody = document.getElementById('paper-items-tbody');
  tbody.innerHTML = '';
  (inv.items || []).forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.description || ''}</td>
      <td>${item.quantity || 1}</td>
      <td>${formatCurrency(item.rate || 0, curr)}</td>
      <td>${formatCurrency((item.quantity || 1) * (item.rate || 0), curr)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Totals
  document.getElementById('paper-subtotal').textContent = formatCurrency(totals.subtotal, curr);
  document.getElementById('paper-tax-amt').textContent = formatCurrency(totals.taxAmount, curr);
  document.getElementById('paper-grand-total').textContent = formatCurrency(totals.grandTotal, curr);
  document.getElementById('paper-amount-paid').textContent = formatCurrency(totals.amountPaid, curr);
  document.getElementById('paper-balance-due').textContent = formatCurrency(totals.balanceDue, curr);

  document.getElementById('paper-payment-terms').innerHTML = (inv.paymentTerms || 'N/A').replace(/\n/g, '<br>');
  document.getElementById('paper-notes').innerHTML = (inv.notes || 'N/A').replace(/\n/g, '<br>');
}

// Render Saved Invoices List
function renderSavedInvoicesList() {
  const container = document.getElementById('invoices-list');
  container.innerHTML = '';

  const searchQuery = (document.getElementById('search-saved-invoices').value || '').toLowerCase();
  const filterStatus = document.getElementById('filter-saved-status').value;

  const filtered = invoicesList.filter(inv => {
    const matchSearch = (inv.number || '').toLowerCase().includes(searchQuery) || (inv.clientName || '').toLowerCase().includes(searchQuery);
    const matchStatus = filterStatus === 'all' || (inv.status || '').toLowerCase() === filterStatus.toLowerCase();
    return matchSearch && matchStatus;
  });

  filtered.forEach(inv => {
    const totals = calculateInvoiceTotals(inv);
    const card = document.createElement('div');
    card.className = 'invoice-item-card';
    card.innerHTML = `
      <div class="inv-card-top">
        <span class="inv-card-num">${inv.number}</span>
        <span class="badge-status ${inv.status.toLowerCase()}">${inv.status}</span>
      </div>
      <div class="inv-card-mid">
        <span class="inv-client-name">${inv.clientName || 'Untitled Client'}</span>
        <span class="inv-amount">${formatCurrency(totals.grandTotal, inv.currency)}</span>
      </div>
      <div class="inv-card-bottom">
        <span class="due-tag"><i data-lucide="calendar"></i> Due: ${inv.dueDate || 'N/A'}</span>
        <div class="card-actions-mini">
          <button class="btn-xs primary" onclick="editInvoice('${inv.id}')" title="Edit Invoice"><i data-lucide="edit-2"></i> <span>Edit</span></button>
          <button class="btn-xs secondary" onclick="downloadInvoicePDFById('${inv.id}')" title="Download PDF"><i data-lucide="download"></i> <span>PDF</span></button>
          <button class="btn-xs secondary" onclick="shareInvoicePDFById('${inv.id}')" title="Share Invoice on WhatsApp / Apps"><i data-lucide="share-2"></i> <span>Share</span></button>
          <button class="btn-xs secondary" onclick="duplicateInvoice('${inv.id}')" title="Copy Invoice"><i data-lucide="copy"></i> <span>Copy</span></button>
          <button class="btn-xs danger" onclick="deleteInvoice('${inv.id}')" title="Delete Invoice"><i data-lucide="trash-2"></i> <span>Del</span></button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
  refreshIcons();
}

function updateHeaderStats() {
  document.getElementById('stat-total-count').textContent = invoicesList.length;
  let totalPending = 0;
  let totalPaid = 0;

  invoicesList.forEach(inv => {
    const totals = calculateInvoiceTotals(inv);
    if (inv.status === 'Paid') {
      totalPaid += totals.grandTotal;
    } else {
      totalPending += totals.balanceDue;
    }
  });

  document.getElementById('stat-total-pending').textContent = formatCurrency(totalPending, 'INR');
  document.getElementById('stat-total-paid').textContent = formatCurrency(totalPaid, 'INR');
}

// Actions
function createNewInvoice() {
  currentInvoice = getBlankInvoice();
  currentInvoice.number = 'INV-' + new Date().getFullYear() + '-' + String(invoicesList.length + 1).padStart(3, '0');
  invoicesList.unshift(currentInvoice);
  saveInvoicesToStorage();
  populateEditorForm(currentInvoice);
  renderSavedInvoicesList();
  updateHeaderStats();
  switchTab('editor');
  if (window.AndroidNative) window.AndroidNative.showToast("Created New Blank Invoice");
}

function saveCurrentInvoice() {
  syncFormToInvoice();
  const idx = invoicesList.findIndex(i => i.id === currentInvoice.id);
  if (idx !== -1) {
    invoicesList[idx] = currentInvoice;
  } else {
    invoicesList.unshift(currentInvoice);
  }
  saveInvoicesToStorage();
  if (typeof SupabaseAuthManager !== 'undefined') {
    SupabaseAuthManager.saveInvoiceToCloud(currentInvoice);
  }
  renderSavedInvoicesList();
  updateHeaderStats();
  if (window.AndroidNative) window.AndroidNative.showToast("Invoice Saved!");
}

function editInvoice(id) {
  const inv = invoicesList.find(i => i.id === id);
  if (inv) {
    currentInvoice = inv;
    populateEditorForm(currentInvoice);
    switchTab('editor');
  }
}

function duplicateInvoice(id) {
  const inv = invoicesList.find(i => i.id === id);
  if (inv) {
    const copy = JSON.parse(JSON.stringify(inv));
    copy.id = 'inv_' + Date.now();
    copy.number = copy.number + '-COPY';
    invoicesList.unshift(copy);
    saveInvoicesToStorage();
    if (typeof SupabaseAuthManager !== 'undefined') {
      SupabaseAuthManager.saveInvoiceToCloud(copy);
    }
    renderSavedInvoicesList();
    updateHeaderStats();
  }
}

function deleteInvoice(id) {
  if (confirm("Are you sure you want to delete this invoice?")) {
    invoicesList = invoicesList.filter(i => i.id !== id);
    saveInvoicesToStorage();
    if (typeof SupabaseAuthManager !== 'undefined') {
      SupabaseAuthManager.deleteInvoiceFromCloud(id);
    }
    renderSavedInvoicesList();
    updateHeaderStats();
  }
}

// Profile Settings
function saveBusinessProfile() {
  businessProfile = {
    bizName: document.getElementById('pref-biz-name').value,
    bizEmail: document.getElementById('pref-biz-email').value,
    bizPhone: document.getElementById('pref-biz-phone').value,
    bizAddress: document.getElementById('pref-biz-address').value,
    payeeUpi: document.getElementById('pref-payee-upi').value,
    paymentTerms: document.getElementById('pref-payment-terms').value,
    logoUrl: currentInvoice?.logoUrl || ''
  };
  localStorage.setItem('daily_biz_profile', JSON.stringify(businessProfile));
  if (window.AndroidNative) window.AndroidNative.showToast("Profile Settings Saved!");
}

function populateProfileForm(prof) {
  if (!prof) return;
  document.getElementById('pref-biz-name').value = prof.bizName || '';
  document.getElementById('pref-biz-email').value = prof.bizEmail || '';
  document.getElementById('pref-biz-phone').value = prof.bizPhone || '';
  document.getElementById('pref-biz-address').value = prof.bizAddress || '';
  document.getElementById('pref-payee-upi').value = prof.payeeUpi || '';
  document.getElementById('pref-payment-terms').value = prof.paymentTerms || '';
}

function loadSavedProfileIntoInvoice() {
  if (!businessProfile.bizName) {
    alert("Please save your business profile first in Profile tab.");
    return;
  }
  document.getElementById('biz-name').value = businessProfile.bizName;
  document.getElementById('biz-email').value = businessProfile.bizEmail;
  document.getElementById('biz-phone').value = businessProfile.bizPhone;
  document.getElementById('biz-address').value = businessProfile.bizAddress;
  if (businessProfile.paymentTerms) document.getElementById('inv-payment-terms').value = businessProfile.paymentTerms;
  syncFormToInvoice();
}

function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      currentInvoice.logoUrl = event.target.result;
      updateLivePreviewSheet();
    };
    reader.readAsDataURL(file);
  }
}

function removeLogo() {
  if (currentInvoice) {
    currentInvoice.logoUrl = '';
    updateLivePreviewSheet();
  }
}

// Theme Switcher
function toggleThemeMode() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', next);
  document.documentElement.classList.remove('light-theme', 'dark-theme');
  document.documentElement.classList.add(next + '-theme');
  localStorage.setItem('apex_theme_mode', next);

  const text = document.getElementById('settings-theme-text');
  if (text) text.textContent = (next === 'light' ? 'Light' : 'Dark') + ' Theme Active';
  refreshIcons();
}

// Auth Modal
function openAuthModal() {
  document.getElementById('modal-auth').style.display = 'flex';
  refreshIcons();
}

function closeAuthModal() { document.getElementById('modal-auth').style.display = 'none'; }

function autofillDemoCredentials() {
  document.getElementById('auth-email').value = 'demo@email.com';
  document.getElementById('auth-password').value = 'Demo@123';
}

// Firebase Config Modal
function openFirebaseConfigModal() {
  document.getElementById('modal-firebase-config').style.display = 'flex';
  refreshIcons();
}

function closeFirebaseConfigModal() { document.getElementById('modal-firebase-config').style.display = 'none'; }

// Privacy Policy Modal
function openPrivacyModal() {
  const modal = document.getElementById('modal-privacy-policy');
  if (modal) modal.style.display = 'flex';
  refreshIcons();
}

function closePrivacyModal() {
  const modal = document.getElementById('modal-privacy-policy');
  if (modal) modal.style.display = 'none';
}

window.openPrivacyModal = openPrivacyModal;
window.closePrivacyModal = closePrivacyModal;

// About Us Modal
function openAboutModal() {
  const modal = document.getElementById('modal-about-us');
  if (modal) modal.style.display = 'flex';
  refreshIcons();
}

function closeAboutModal() {
  const modal = document.getElementById('modal-about-us');
  if (modal) modal.style.display = 'none';
}

window.openAboutModal = openAboutModal;
window.closeAboutModal = closeAboutModal;

// Contact Us Modal
function openContactModal() {
  const modal = document.getElementById('modal-contact-us');
  if (modal) modal.style.display = 'flex';
  refreshIcons();
}

function closeContactModal() {
  const modal = document.getElementById('modal-contact-us');
  if (modal) modal.style.display = 'none';
}

window.openContactModal = openContactModal;
window.closeContactModal = closeContactModal;

function handleContactSubmit(e) {
  if (e) e.preventDefault();
  const name = document.getElementById('contact-name').value;
  const email = document.getElementById('contact-email').value;
  const subject = document.getElementById('contact-subject').value;
  const message = document.getElementById('contact-message').value;

  const mailtoBody = `Sender Name: ${name}\nSender Email: ${email}\n\nMessage / Inquiry:\n${message}\n\nSent via DailyInvoicer App`;
  const mailtoUrl = `mailto:vrushabhdhote29@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailtoBody)}`;
  
  window.open(mailtoUrl, '_blank');
  
  if (window.AndroidNative) {
    window.AndroidNative.showToast("Opening Mail Client for vrushabhdhote29@gmail.com");
  } else {
    alert("Opening your Email client to send message to vrushabhdhote29@gmail.com!");
  }
  closeContactModal();
}

function saveCustomFirebaseConfig() {
  const cfg = {
    apiKey: document.getElementById('fb-apiKey').value,
    authDomain: document.getElementById('fb-authDomain').value,
    projectId: document.getElementById('fb-projectId').value
  };
  localStorage.setItem('daily_invoicer_fb_config', JSON.stringify(cfg));
  closeFirebaseConfigModal();
  alert("Firebase Config Saved. Restarting Firebase Connection...");
}

// Export / Import Backup JSON
function exportBackupJSON() {
  const data = {
    invoices: invoicesList,
    profile: businessProfile,
    exportDate: new Date().toISOString()
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Daily_Invoicer_Backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
}

function importBackupJSON(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.invoices && Array.isArray(parsed.invoices)) {
          invoicesList = parsed.invoices;
          saveInvoicesToStorage();
          renderSavedInvoicesList();
          updateHeaderStats();
          alert("Backup imported successfully!");
        }
      } catch (err) {
        alert("Invalid JSON file format!");
      }
    };
    reader.readAsText(file);
  }
}
