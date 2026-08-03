/* ==========================================================================
   HIGH-RESOLUTION PDF EXPORTER & NATIVE PRINT/SHARE DISPATCHER
   ========================================================================== */

function downloadInvoicePDF() {
  const paperElement = document.getElementById('invoice-paper');
  const currentInv = window.currentInvoice || (typeof currentInvoice !== 'undefined' ? currentInvoice : getBlankInvoice());
  
  if (window.AndroidNative) {
    window.AndroidNative.showToast("Generating PDF Document...");
  }

  const filename = `${(currentInv.number || 'Invoice').replace(/[^a-zA-Z0-9_-]/g, '_')}_${(currentInv.clientName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

  const opt = {
    margin:       0.2,
    filename:     filename,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, logging: false },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  if (window.html2pdf) {
    if (window.AndroidNative && typeof window.AndroidNative.savePdf === 'function') {
      html2pdf().set(opt).from(paperElement).outputPdf('datauristring').then((pdfDataUri) => {
        window.AndroidNative.savePdf(pdfDataUri, filename);
      }).catch((err) => {
        console.error("PDF generation error:", err);
        if (window.AndroidNative) {
          window.AndroidNative.showToast("Failed to generate PDF: " + (err.message || err));
        }
      });
    } else {
      html2pdf().set(opt).from(paperElement).save().then(() => {
        if (window.AndroidNative) {
          window.AndroidNative.showToast("PDF Saved to Downloads!");
        }
      });
    }
  } else {
    window.print();
  }
}

function downloadInvoicePDFById(id) {
  if (typeof invoicesList === 'undefined') return;
  const inv = invoicesList.find(i => i.id === id);
  if (inv) {
    currentInvoice = inv;
    if (typeof populateEditorForm === 'function') populateEditorForm(currentInvoice);
    if (typeof updateLivePreviewSheet === 'function') updateLivePreviewSheet();
    setTimeout(() => {
      downloadInvoicePDF();
    }, 150);
  }
}

function shareInvoicePDF() {
  const paperElement = document.getElementById('invoice-paper');
  const currentInv = window.currentInvoice || (typeof currentInvoice !== 'undefined' ? currentInvoice : getBlankInvoice());
  const totals = typeof calculateInvoiceTotals === 'function' ? calculateInvoiceTotals(currentInv) : { grandTotal: 0 };
  const filename = `${(currentInv.number || 'Invoice').replace(/[^a-zA-Z0-9_-]/g, '_')}_${(currentInv.clientName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  const shareText = `Invoice #${currentInv.number || ''} for ${currentInv.clientName || 'Client'}\nTotal Amount: ${typeof formatCurrency === 'function' ? formatCurrency(totals.grandTotal, currentInv.currency) : totals.grandTotal}\nDue Date: ${currentInv.dueDate || 'N/A'}`;

  const opt = {
    margin:       0.2,
    filename:     filename,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, logging: false },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  if (window.html2pdf) {
    if (window.AndroidNative && typeof window.AndroidNative.sharePdf === 'function') {
      window.AndroidNative.showToast("Preparing document to share...");
      html2pdf().set(opt).from(paperElement).outputPdf('datauristring').then((pdfDataUri) => {
        window.AndroidNative.sharePdf(pdfDataUri, filename);
      }).catch((err) => {
        console.error("PDF generation for share failed:", err);
        if (window.AndroidNative) {
          window.AndroidNative.showToast("Failed to prepare PDF for sharing");
        }
      });
      return;
    }

    if (window.AndroidNative) window.AndroidNative.showToast("Preparing document to share...");

    html2pdf().set(opt).from(paperElement).outputPdf('blob').then((pdfBlob) => {
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: `Invoice ${currentInv.number}`,
          text: shareText
        }).catch((err) => {
          console.log("Share cancelled or interrupted:", err);
        });
      } else {
        const encodedMsg = encodeURIComponent(`*${currentInv.bizName || 'DailyInvoicer'}*\n${shareText}`);
        const waUrl = `https://wa.me/?text=${encodedMsg}`;
        window.open(waUrl, '_blank');
        downloadInvoicePDF();
      }
    }).catch(err => {
      console.error("PDF Blob generation failed, falling back to Web Share API:", err);
      if (navigator.share) {
        navigator.share({
          title: `Invoice ${currentInv.number}`,
          text: shareText
        });
      }
    });
  } else {
    const encodedMsg = encodeURIComponent(`${shareText}`);
    window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
  }
}

function shareInvoicePDFById(id) {
  if (typeof invoicesList === 'undefined') return;
  const inv = invoicesList.find(i => i.id === id);
  if (inv) {
    currentInvoice = inv;
    if (typeof populateEditorForm === 'function') populateEditorForm(currentInvoice);
    if (typeof updateLivePreviewSheet === 'function') updateLivePreviewSheet();
    setTimeout(() => {
      shareInvoicePDF();
    }, 150);
  }
}

function printInvoiceDocument() {
  const currentInv = window.currentInvoice || (typeof currentInvoice !== 'undefined' ? currentInvoice : getBlankInvoice());
  const jobName = `Invoice_${currentInv.number}`;

  if (window.AndroidNative && typeof window.AndroidNative.printInvoice === 'function') {
    window.AndroidNative.printInvoice(jobName);
  } else {
    window.print();
  }
}
