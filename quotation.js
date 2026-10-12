document.addEventListener('DOMContentLoaded', () => {

// --- Google Sheets Sync Logic ---
  const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxAEBF8TMG6Q-j1vMGjcwgYZnHO7y-b4IkkJh1VIS-rs_Qdf0YdqdYVnCEqk9o7Ne20/exec';

  const fetchBtn = document.getElementById('fetchSheetDataBtn');
  if (fetchBtn) {
    fetchBtn.addEventListener('click', async () => {
      const rowIdInput = document.getElementById('sheetRowId').value.trim();
      const selectedYear = document.getElementById('sheetYear').value; // Get selected year tab

      if (!rowIdInput) {
        showAppModal('Please enter a valid Row ID (e.g. 1, 2, 3...).');
        return;
      }

      try {
        // Pass the year as a parameter to the script URL
        const response = await fetch(`${WEB_APP_URL}?year=${selectedYear}`);
        const result = await response.json();
        
        if (result.error) {
          showAppModal(result.error);
          return;
        }

        const matchedRow = result.find(r => r.rowId === rowIdInput);

        if (!matchedRow) {
          showAppModal(`Row ID ${rowIdInput} not found in the ${selectedYear} sheet.`);
          return;
        }

        // 1. Populate basic client & document fields
        if (matchedRow.client) {
          document.getElementById('clientName').value = matchedRow.client;
        }
        if (matchedRow.contact_number) {
          document.getElementById('clientContact').value = formatMauritianPhone(matchedRow.contact_number);
        }

        const downpayment = parseFloat(matchedRow['amount_paid_/_downpayment']) || 0;
        document.getElementById('advancePayment').value = downpayment;

        // 2. Format performance date from sheet
        let showDate = new Date().toISOString().split('T')[0];
        if (matchedRow.date) {
          showDate = matchedRow.date.split('T')[0];
        }

        // 3. Populate the Show / Performance details table
        sampleShows.length = 0;
        sampleShows.push({
          date: showDate,
          venue: matchedRow.location || '—',
          pkg: `${matchedRow.event_type || 'Show'} (${matchedRow['no._of_dancers'] || 0} Dancers)`,
          price: parseFloat(matchedRow.amount) || 0,
          addons: matchedRow.notes ? [{ name: `Note: ${matchedRow.notes}`, price: 0 }] : []
        });

        renderRows();
        showAppModal(`Successfully loaded data for Row ID ${rowIdInput} from the ${selectedYear} sheet!`);

      } catch (error) {
        console.error('Error fetching from Google Sheets:', error);
        showAppModal('Failed to connect to Google Sheets. Check console for details.');
      }
    });
  }

  // --- Custom Modal Helper ---
  function showAppModal(message, title = 'Art In Motion') {
    const modal = document.getElementById('appModal');
    const msgEl = document.getElementById('modalMessage');
    const titleEl = document.getElementById('modalTitle');
    if (modal && msgEl && titleEl) {
      titleEl.textContent = title;
      msgEl.textContent = message;
      modal.style.display = 'flex';
    } else {
      showAppModal(message); // Fallback if modal is missing
    }
  }

  // Close modal event listeners
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      document.getElementById('appModal').style.display = 'none';
    });
  }

  const modalOverlay = document.getElementById('appModal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.style.display = 'none';
      }
    });
  }

  // Set default quotation date to today if empty
  const dateInput = document.getElementById('quoteDate');
  if (dateInput && !dateInput.value) {
    dateInput.valueAsDate = new Date();
  }

  const showsContainer = document.getElementById('showsInputList');
  
  const sampleShows = [];

  function formatDateToDDMMYYYY(dateString) {
    if (!dateString) return '—';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString;
  }

  function formatMauritianPhone(phone) {
  if (!phone) return '';
  // Remove all non-numeric characters (e.g., spaces, plus signs, dashes)
  const cleaned = phone.toString().replace(/\D/g, '');
  
  // If it's an 8-digit Mauritian number (e.g., 58273172), format as 5 827 3172
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 1)} ${cleaned.slice(1, 4)} ${cleaned.slice(4)}`;
  }
  // If it includes the country code +230 followed by 8 digits (total 11 digits), format nicely
  if (cleaned.length === 11 && cleaned.startsWith('230')) {
    return `+230 ${cleaned.slice(3, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  
  // Fallback to original string if it doesn't match standard lengths
  return phone;
}

  function renderRows() {
    showsContainer.innerHTML = '';
    sampleShows.forEach((show, showIndex) => {
      const showCard = document.createElement('div');
      showCard.className = 'show-card';
      
      let addonsHtml = '';
      show.addons.forEach((addon) => {
        addonsHtml += `
          <div class="addon-row">
            <input type="text" class="a-name" placeholder="Add-on item (e.g. Extra rehearsal)" value="${addon.name}" required>
            <input type="number" class="a-price" placeholder="Price (MUR)" value="${addon.price}" required>
            <button type="button" class="remove-row-btn remove-addon-btn" title="Remove add-on">✕</button>
          </div>
        `;
      });

      showCard.innerHTML = `
        <div class="show-main-inputs">
          <input type="date" class="s-date" value="${show.date}" required>
          <input type="text" class="s-venue" placeholder="Venue name" value="${show.venue}" required>
          <input type="text" class="s-pkg" placeholder="Package / Style" value="${show.pkg}" required>
          <input type="number" class="s-price" placeholder="Price (MUR)" value="${show.price}" required>
          <button type="button" class="remove-row-btn remove-show-btn" title="Remove show">✕</button>
        </div>
        <div class="addons-container">
          <div style="margin-bottom: 6px;"><button type="button" class="btn-sm-addon add-addon-btn">+ Add Optional Add-on</button></div>
          <div class="addon-list-inputs">${addonsHtml}</div>
        </div>
      `;
      
      // Delete show event
      showCard.querySelector('.remove-show-btn').addEventListener('click', () => {
        sampleShows.splice(showIndex, 1);
        renderRows();
        updateQuotationPreview();
      });

      // Add add-on event
      showCard.querySelector('.add-addon-btn').addEventListener('click', () => {
        show.addons.push({ name: '', price: 0 });
        renderRows();
        updateQuotationPreview();
      });

      // Remove add-on event listeners
      showCard.querySelectorAll('.remove-addon-btn').forEach((btn, addonIndex) => {
        btn.addEventListener('click', () => {
          show.addons.splice(addonIndex, 1);
          renderRows();
          updateQuotationPreview();
        });
      });

      // Main show input listeners
      showCard.querySelectorAll('.show-main-inputs input').forEach(input => {
        input.addEventListener('input', (e) => {
          const fieldType = e.target.className.replace('s-', '');
          show[fieldType] = e.target.value;
          updateQuotationPreview();
        });
      });

      // Add-on input listeners
      showCard.querySelectorAll('.addon-list-inputs .addon-row').forEach((row, addonIndex) => {
        const nameInput = row.querySelector('.a-name');
        const priceInput = row.querySelector('.a-price');
        
        nameInput.addEventListener('input', (e) => {
          show.addons[addonIndex].name = e.target.value;
          updateQuotationPreview();
        });
        priceInput.addEventListener('input', (e) => {
          show.addons[addonIndex].price = e.target.value;
          updateQuotationPreview();
        });
      });

      showsContainer.appendChild(showCard);
    });
    updateQuotationPreview();
  }

  document.getElementById('addShowRowBtn').addEventListener('click', () => {
    sampleShows.push({ date: '', venue: '', pkg: '', price: 0, addons: [] });
    renderRows();
  });

  function updateQuotationPreview() {
    const docType = document.getElementById('docType').value;
    const isInvoice = docType === 'invoice';

    // Dynamically update form labels and buttons based on type
    document.getElementById('docNoLabel').textContent = isInvoice ? 'Invoice Number' : 'Quotation Number';
    document.getElementById('docDateLabel').textContent = isInvoice ? 'Invoice Date' : 'Quotation Date';
    document.getElementById('advanceLabel').textContent = isInvoice ? 'Advance Paid / Deposit Deducted (MUR)' : 'Advance Payment / Deduction (MUR)';
    document.getElementById('downloadPdfBtn').textContent = isInvoice ? '📥 Download A4 PDF Invoice' : '📥 Download A4 PDF Quotation';

    // Dynamically update sheet headers and labels
    document.getElementById('valDocTitle').textContent = isInvoice ? 'Invoice' : 'Quotation';
    document.getElementById('valRefLabel').textContent = isInvoice ? 'Invoice No:' : 'Ref No:';
    document.getElementById('valDateLabel').textContent = isInvoice ? 'Invoice Date:' : 'Date:';
    document.getElementById('valPreparedForLabel').textContent = isInvoice ? 'Billed To:' : 'Prepared For:';
    document.getElementById('valDeductionLabel').textContent = isInvoice ? 'Less: Deposit / Advance Paid' : 'Less: Advance Payment';
    document.getElementById('valBalanceLabel').textContent = isInvoice ? 'Total' : 'Total';
    document.getElementById('valNotesTitle').textContent = isInvoice ? 'Payment Terms & Instructions' : 'Terms & Conditions';

    // Auto-swap default text in the textarea if it hasn't been heavily customized yet
    const quoteNoteTextarea = document.getElementById('quoteNote');
    if (isInvoice && quoteNoteTextarea.value.includes('All prices quoted herein')) {
      quoteNoteTextarea.value = `• All prices mentioned herein are inclusive of standard transportation and ancillary expenses.
• Payment is due within 30 days of invoice date.
• Please reference the invoice number when making your bank transfer or Juice payment.
• Bank: Mauritius Commercial Bank Ltd (MCB) | Account Number: 000451370740 | Juice: 5833 0980.
• Kindly share payment receipt via WhatsApp upon settlement.`;
    } else if (!isInvoice && quoteNoteTextarea.value.includes('Payment is due within')) {
      quoteNoteTextarea.value = `• All prices quoted herein are inclusive of standard transportation and ancillary expenses.
• In the event that catering is not provided on-site, a subsistence allowance of MUR 200 per dancer may be levied by the company.
• The client agrees to provide a secure, private, and appropriate dressing area for the performers (strictly excluding restroom facilities) along with complimentary drinking water.
• An advance payment is required to formally secure the booking, and settlement of this deposit constitutes full acceptance of these terms and conditions.
• Bank: Mauritius Commercial Bank Ltd (MCB) | Account Number: 000451370740 | Juice: 5833 0980.`;
    }

    // Default reference prefix swap convenience check
    const quoteNoInput = document.getElementById('quoteNo');
    if (isInvoice && quoteNoInput.value.startsWith('AIM-Q-')) {
      quoteNoInput.value = quoteNoInput.value.replace('AIM-Q-', 'AIM-INV-');
    } else if (!isInvoice && quoteNoInput.value.startsWith('AIM-INV-')) {
      quoteNoInput.value = quoteNoInput.value.replace('AIM-INV-', 'AIM-Q-');
    }

    // Dynamic text bindings
    document.querySelector('.val-clientName').textContent = document.getElementById('clientName').value || '—';
    document.querySelector('.val-clientContact').textContent = document.getElementById('clientContact').value || '—';
    document.querySelector('.val-quoteNo').textContent = quoteNoInput.value || (isInvoice ? 'AIM-INV-2026-001' : 'AIM-Q-2026-001');
    
    const selectedDate = document.getElementById('quoteDate').value;
    document.querySelector('.val-quoteDate').textContent = formatDateToDDMMYYYY(selectedDate);
    
    // Update terms and conditions stacked paragraphs
    const quoteNoteEl = document.getElementById('valQuoteNote');
    if (quoteNoteEl) {
      const rawText = document.getElementById('quoteNote').value || '';
      quoteNoteEl.innerHTML = '';
      rawText.split('\n').forEach(line => {
        if (line.trim() !== '') {
          const p = document.createElement('p');
          p.textContent = line.trim();
          quoteNoteEl.appendChild(p);
        }
      });
    }

    // Status badge update
    const statusVal = document.getElementById('quoteStatus').value;
    const badgeEl = document.getElementById('valStatusBadge');
    badgeEl.textContent = statusVal;
    badgeEl.className = `status-pill ${statusVal.toLowerCase()}`;

    // Render dynamic table rows & sub-rows inside the A4 sheet
    const tableBody = document.getElementById('invoiceTableBody');
    tableBody.innerHTML = '';
    
    let subtotal = 0;
    sampleShows.forEach((s, idx) => {
      const priceNum = parseFloat(s.price) || 0;
      subtotal += priceNum;

      // Main Show Row
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align: center;"><b>${idx + 1}</b></td>
        <td><b>${formatDateToDDMMYYYY(s.date)}</b></td>
        <td><b>${s.venue || '—'}</b></td>
        <td><b>${s.pkg || '—'}</b></td>
        <td style="text-align: right;"><b>${priceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td>
      `;
      tableBody.appendChild(tr);

      // Add-on Sub-rows
      if (s.addons && s.addons.length > 0) {
        s.addons.forEach(addon => {
          const addonPriceNum = parseFloat(addon.price) || 0;
          subtotal += addonPriceNum;

          const addonTr = document.createElement('tr');
          addonTr.className = 'addon-item-row';
          addonTr.innerHTML = `
            <td></td>
            <td></td>
            <td colspan="2">↳ <i>Add-on: ${addon.name || 'Optional item'}</i></td>
            <td style="text-align: right;">+ ${addonPriceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          `;
          tableBody.appendChild(addonTr);
        });
      }
    });

    // Advance Payment / Deduction Calculation
    const advanceInput = parseFloat(document.getElementById('advancePayment').value) || 0;
    const finalBalance = Math.max(0, subtotal - advanceInput);

    document.getElementById('valSubtotalAmount').textContent = `MUR ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    const deductionRow = document.getElementById('deductionRow');
    const isPaid = statusVal === 'PAID';

    // If status is PAID, we hide deductions/advances since everything is fully settled
    if (advanceInput > 0 && !isPaid) {
      deductionRow.style.display = 'flex';
      document.getElementById('valDeductionAmount').textContent = `- MUR ${advanceInput.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      deductionRow.style.display = 'none';
    }

    // Adjust wording and final value based on whether it is fully paid
    if (isPaid) {
      document.getElementById('valBalanceLabel').textContent = 'Total Paid';
      // If paid, show the full subtotal (or subtotal minus advance if preferred, but usually full total when paid in full)
      document.getElementById('valTotalAmount').textContent = `MUR ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      document.getElementById('valBalanceLabel').textContent = isInvoice ? 'Total' : 'Total';
      document.getElementById('valTotalAmount').textContent = `MUR ${finalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  // Bind live listeners to all form controls including docType
  ['docType', 'clientName', 'clientContact', 'quoteNo', 'quoteDate', 'quoteStatus', 'quoteNote', 'advancePayment'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateQuotationPreview);
      el.addEventListener('change', updateQuotationPreview);
    }
  });

  document.getElementById('downloadPdfBtn').addEventListener('click', () => {
    window.print();
  });

  // Initial render on page load
  renderRows();
});
