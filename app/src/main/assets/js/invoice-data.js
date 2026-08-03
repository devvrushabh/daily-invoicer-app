/* ==========================================================================
   INVOICE DATA MODEL & CALCULATION ENGINE
   ========================================================================== */

const CurrencySymbols = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$'
};

function formatCurrency(amount, currencyCode = 'INR') {
  const symbol = CurrencySymbols[currencyCode] || '₹';
  const parsed = parseFloat(amount) || 0;
  return symbol + parsed.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function calculateInvoiceTotals(invoice) {
  let subtotal = 0;

  if (Array.isArray(invoice.items)) {
    invoice.items.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const amount = qty * rate;
      item.amount = amount;
      subtotal += amount;
    });
  }

  const taxRate = parseFloat(invoice.taxRate) || 0;
  const taxAmount = (subtotal * taxRate) / 100;

  let discountAmount = 0;
  const discountVal = parseFloat(invoice.discountValue) || 0;
  if (invoice.discountType === 'percent') {
    discountAmount = (subtotal * discountVal) / 100;
  } else {
    discountAmount = discountVal;
  }

  const shipping = parseFloat(invoice.shipping) || 0;
  const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount + shipping);
  const amountPaid = parseFloat(invoice.amountPaid) || 0;
  const balanceDue = Math.max(0, grandTotal - amountPaid);

  return {
    subtotal: subtotal,
    taxAmount: taxAmount,
    discountAmount: discountAmount,
    shipping: shipping,
    grandTotal: grandTotal,
    amountPaid: amountPaid,
    balanceDue: balanceDue
  };
}

function getBlankInvoice() {
  const today = new Date().toISOString().split('T')[0];
  const dueDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

  return {
    id: 'inv_' + Date.now(),
    number: 'INV-' + new Date().getFullYear() + '-001',
    issueDate: today,
    dueDate: dueDate,
    status: 'Unpaid',
    currency: 'INR',
    poNumber: '',
    bizName: 'Acme Technologies Inc.',
    bizEmail: 'billing@acme.com',
    bizPhone: '+1 555-0199',
    bizAddress: '100 Innovation Way, Suite 400\nNew York, NY 10001',
    logoUrl: '',
    clientName: 'Global Dynamics Corp.',
    clientEmail: 'accounts@global.com',
    clientPhone: '+1 555-0288',
    clientAddress: '500 Enterprise Blvd\nSan Francisco, CA 94105',
    items: [
      { id: 1, description: 'UI/UX Mobile App Design', quantity: 1, rate: 25000, amount: 25000 },
      { id: 2, description: 'Android Application Development', quantity: 1, rate: 45000, amount: 45000 }
    ],
    taxRate: 18,
    discountValue: 0,
    discountType: 'percent',
    shipping: 0,
    amountPaid: 0,
    paymentTerms: 'Bank: HDFC Bank\nA/C: 50100123456789\nIFSC: HDFC0001234\nPayee UPI: devvrushabh@upi',
    notes: 'Thank you for your business! Payment is due within 14 days of invoice date.'
  };
}
