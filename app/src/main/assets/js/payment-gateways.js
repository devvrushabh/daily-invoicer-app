/* ==========================================================================
   MULTI-GATEWAY PAYMENT CHECKOUT & DYNAMIC UPI QR CODE GENERATOR
   ========================================================================== */

let qrCodeInstance = null;

function openPaymentModal() {
  const currentInv = window.currentInvoice || (typeof getBlankInvoice === 'function' ? getBlankInvoice() : {});
  const totals = typeof calculateInvoiceTotals === 'function' ? calculateInvoiceTotals(currentInv) : { balanceDue: 0, grandTotal: 0 };
  
  const dueAmt = totals.balanceDue > 0 ? totals.balanceDue : totals.grandTotal;
  document.getElementById('modal-pay-amount').textContent = typeof formatCurrency === 'function' ? formatCurrency(dueAmt, currentInv.currency) : dueAmt;
  
  // Extract payee UPI ID
  let upiId = 'devvrushabh@upi';
  if (currentInv.payeeUpi) {
    upiId = currentInv.payeeUpi;
  } else if (currentInv.paymentTerms && currentInv.paymentTerms.includes('UPI:')) {
    const match = currentInv.paymentTerms.match(/UPI:\s*([^\s\n]+)/i);
    if (match) upiId = match[1];
  }
  document.getElementById('upi-id-display').textContent = upiId;

  // Generate UPI Deep Link QR Code
  const bizName = currentInv.bizName || 'DailyInvoicer';
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(bizName)}&am=${dueAmt.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Invoice ' + currentInv.number)}`;
  
  const container = document.getElementById('upi-qrcode-container');
  container.innerHTML = '';
  
  if (window.QRCode) {
    qrCodeInstance = new QRCode(container, {
      text: upiUrl,
      width: 170,
      height: 170,
      colorDark: "#0f172a",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  } else {
    const qrImg = document.createElement('img');
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(upiUrl)}`;
    qrImg.alt = "UPI Payment QR Code";
    container.appendChild(qrImg);
  }

  // Format Bank Details Card
  const bankCard = document.getElementById('modal-bank-info');
  if (bankCard) {
    const pTerms = currentInv.paymentTerms || '';
    bankCard.innerHTML = `
      <div class="bank-detail-item"><strong>Payee / Company:</strong> <span>${currentInv.bizName || 'DailyInvoicer'}</span></div>
      <div class="bank-detail-item"><strong>Bank Transfer Details:</strong><br><span style="white-space:pre-line;">${pTerms || 'Bank: HDFC Bank\nA/C: 50100123456789\nIFSC: HDFC0001234'}</span></div>
    `;
  }

  document.getElementById('modal-checkout').style.display = 'flex';

  // Attach tab switchers
  const ptabs = document.querySelectorAll('.p-tab');
  ptabs.forEach(tab => {
    tab.onclick = () => {
      ptabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.p-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const targetId = 'ptab-' + tab.dataset.ptab;
      const content = document.getElementById(targetId);
      if (content) content.classList.add('active');
    };
  });

  if (typeof refreshIcons === 'function') refreshIcons();
}

function closePaymentModal() {
  document.getElementById('modal-checkout').style.display = 'none';
}

function copyUpiId() {
  const upiId = document.getElementById('upi-id-display').textContent;
  navigator.clipboard.writeText(upiId).then(() => {
    if (window.AndroidNative) {
      window.AndroidNative.showToast("UPI ID Copied to Clipboard!");
    } else {
      alert("UPI ID Copied to Clipboard: " + upiId);
    }
  });
}

function launchUpiAppDirectly() {
  const currentInv = window.currentInvoice || {};
  const totals = typeof calculateInvoiceTotals === 'function' ? calculateInvoiceTotals(currentInv) : { balanceDue: 0, grandTotal: 0 };
  const dueAmt = totals.balanceDue > 0 ? totals.balanceDue : totals.grandTotal;
  let upiId = document.getElementById('upi-id-display').textContent || 'devvrushabh@upi';
  const bizName = currentInv.bizName || 'DailyInvoicer';
  
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(bizName)}&am=${dueAmt.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Invoice ' + (currentInv.number || ''))}`;
  window.location.href = upiUrl;
}

function simulateCardPayment() {
  if (window.AndroidNative) window.AndroidNative.showToast("Processing Card Payment...");
  setTimeout(() => {
    if (window.currentInvoice) {
      window.currentInvoice.status = 'Paid';
      const totals = calculateInvoiceTotals(window.currentInvoice);
      window.currentInvoice.amountPaid = totals.grandTotal;
      if (typeof saveCurrentInvoice === 'function') saveCurrentInvoice();
      closePaymentModal();
      alert("Payment Successful! Invoice marked as PAID.");
    }
  }, 1000);
}

function simulatePaypalPayment() {
  if (window.AndroidNative) window.AndroidNative.showToast("Connecting to PayPal...");
  setTimeout(() => {
    if (window.currentInvoice) {
      window.currentInvoice.status = 'Paid';
      const totals = calculateInvoiceTotals(window.currentInvoice);
      window.currentInvoice.amountPaid = totals.grandTotal;
      if (typeof saveCurrentInvoice === 'function') saveCurrentInvoice();
      closePaymentModal();
      alert("PayPal Payment Successful! Invoice marked as PAID.");
    }
  }, 1000);
}
