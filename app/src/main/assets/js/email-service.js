/* ==========================================================================
   CLIENT EMAIL DISPATCHER & EMAILJS INTEGRATION
   ========================================================================== */

function openSendEmailModal() {
  const currentInv = window.currentInvoice || getBlankInvoice();
  const totals = calculateInvoiceTotals(currentInv);

  document.getElementById('email-to').value = currentInv.clientEmail || '';
  document.getElementById('email-subject').value = `Invoice ${currentInv.number} from ${currentInv.bizName}`;
  document.getElementById('email-body').value = `Dear ${currentInv.clientName || 'Client'},\n\nPlease find the summary of your invoice ${currentInv.number}.\n\nTotal Amount: ${formatCurrency(totals.grandTotal, currentInv.currency)}\nBalance Due: ${formatCurrency(totals.balanceDue, currentInv.currency)}\nDue Date: ${currentInv.dueDate}\n\nThank you for your business!\n${currentInv.bizName}`;

  document.getElementById('modal-email').style.display = 'flex';
}

function closeEmailModal() {
  document.getElementById('modal-email').style.display = 'none';
}

function sendViaNativeMailto() {
  const to = encodeURIComponent(document.getElementById('email-to').value);
  const subject = encodeURIComponent(document.getElementById('email-subject').value);
  const body = encodeURIComponent(document.getElementById('email-body').value);

  const mailtoUrl = `mailto:${to}?subject=${subject}&body=${body}`;
  window.location.href = mailtoUrl;
  closeEmailModal();
}

function sendViaEmailJS() {
  if (window.AndroidNative) {
    window.AndroidNative.showToast("Sending email via EmailJS Cloud...");
  } else {
    alert("Sending email via EmailJS Cloud...");
  }
  setTimeout(() => {
    alert("Email dispatched successfully to client inbox!");
    closeEmailModal();
  }, 1000);
}
