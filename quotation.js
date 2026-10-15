document.addEventListener('DOMContentLoaded', () => {

  const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxAEBF8TMG6Q-j1vMGjcwgYZnHO7y-b4IkkJh1VIS-rs_Qdf0YdqdYVnCEqk9o7Ne20/exec';

  const modeLoadBtn = document.getElementById('modeLoadBtn');
  const modeManualBtn = document.getElementById('modeManualBtn');
  const syncSection = document.getElementById('syncSection');
  const formContentSection = document.getElementById('formContentSection');
  const loadingOverlay = document.getElementById('loadingOverlay');

  // --- Mode Selection Switcher ---
  if (modeLoadBtn && modeManualBtn) {
    modeLoadBtn.addEventListener('click', () => {
      modeLoadBtn.classList.add('active');
      modeManualBtn.classList.remove('active');
      syncSection.style.display = 'block';
      formContentSection.style.display = 'none';
    });

    modeManualBtn.addEventListener('click', () => {
      modeManualBtn.classList.add('active');
      modeLoadBtn.classList.remove('active');
      syncSection.style.display = 'none';
      formContentSection.style.display = 'block';

      if (sampleShows.length === 0) {
        sampleShows.push({ date: '', venue: '', pkg: '', price: 0, addons: [] });
        renderRows();
      }
    });
  }

  // --- Google Sheets Sync Logic with Screen Lock & Loading ---
  const fetchBtn = document.getElementById('fetchSheetDataBtn');
  if (fetchBtn) {
    fetchBtn.addEventListener('click', async () => {
      const rowIdInput = document.getElementById('sheetRowId').value.trim();
      const selectedYear = document.getElementById('sheetYear').value;

      if (!rowIdInput) {
        showToast('Enter a valid Row Number');
        return;
      }

      loadingOverlay.classList.add('active');

      try {
        const response = await fetch(`${WEB_APP_URL}?year=${selectedYear}`);
        const result = await response.json();
        
        if (result.error) {
          showToast(result.error);
          return;
        }

        const matchedRow = result.find(r => r.rowId === rowIdInput);

        if (!matchedRow) {
          showToast(`Row ID ${rowIdInput} not found in the ${selectedYear} sheet.`);
          return;
        }

        if (matchedRow.client) {
          document.getElementById('clientName').value = matchedRow.client;
        }
        if (matchedRow.contact_number) {
          document.getElementById('clientContact').value = formatMauritianPhone(matchedRow.contact_number);
        }

        const recordId = matchedRow.id || matchedRow.rowId || '001';
        const docType = document.getElementById('docType').value;
        const prefix = docType === 'invoice' ? 'AIM-INV-' : 'AIM-Q-';
        document.getElementById('quoteNo').value = `${prefix}${recordId}`;

        const downpayment = parseFloat(matchedRow['amount_paid_/_downpayment']) || 0;
        document.getElementById('advancePayment').value = downpayment;

        let showDate = getMauritiusCurrentDate();
        if (matchedRow.date) {
          showDate = matchedRow.date.split('T')[0];
        }

        sampleShows.length = 0;
        sampleShows.push({
          date: showDate,
          venue: matchedRow.location || '—',
          pkg: `${matchedRow.event_type || 'Show'} (${matchedRow['no._of_dancers'] || 0} Dancers)`,
          price: parseFloat(matchedRow.amount) || 0,
          addons: matchedRow.notes ? [{ name: `Note: ${matchedRow.notes}`, price: 0 }] : []
        });

        renderRows();

        formContentSection.style.display = 'block';
        showToast('Data successfully retrieved');

      } catch (error) {
        console.error('Error fetching from Google Sheets:', error);
        showToast('Failed to connect to Google Sheets.');
      } finally {
        loadingOverlay.classList.remove('active');
      }
    });
  }

  // --- Top Toast Notification Helper ---
  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById('toastNotification');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.classList.remove('show');
      }, 3500);
    }
  }

  // --- Auto-fit A4 Preview Scaler for Mobile & Desktop Viewports ---
  function fitA4Preview() {
    const wrapper = document.querySelector('.invoice-wrapper');
    const sheet = document.getElementById('quotationDocument');
    if (!wrapper || !sheet) return;

    const naturalWidth = 794;
    const availableWidth = wrapper.clientWidth;

    if (availableWidth < naturalWidth) {
      const scale = availableWidth / naturalWidth;
      sheet.style.transform = `scale(${scale})`;
      wrapper.style.height = `${sheet.offsetHeight * scale}px`;
    } else {
      sheet.style.transform = 'scale(1)';
      wrapper.style.height = 'auto';
    }
  }

  window.addEventListener('resize', fitA4Preview);

  // Helper to get current date in Mauritius timezone (YYYY-MM-DD)
  function getMauritiusCurrentDate() {
    try {
      const options = { timeZone: 'Indian/Mauritius', year: 'numeric', month: '2-digit', day: '2-digit' };
      const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA gives YYYY-MM-DD format natively
      return formatter.format(new Date());
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  }

  const dateInput = document.getElementById('quoteDate');
  if (dateInput && !dateInput.value) {
    dateInput.value = getMauritiusCurrentDate();
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
    const cleaned = phone.toString().replace(/\D/g, '');
    
    if (cleaned.length === 8) {
      return `${cleaned.slice(0, 1)} ${cleaned.slice(1, 4)} ${cleaned.slice(4)}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith('230')) {
      return `+230 ${cleaned.slice(3, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
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
            <div>
              <label class="small-label">Add-on Item</label>
              <input type="text" class="a-name" placeholder="Add-on item (e.g. Extra rehearsal)" value="${addon.name}" required>
            </div>
            <div>
              <label class="small-label">Price (MUR)</label>
              <input type="number" class="a-price" placeholder="Price" value="${addon.price}" required>
            </div>
            <div>
              <button type="button" class="remove-row-btn remove-addon-btn" title="Remove add-on">✕</button>
            </div>
          </div>
        `;
      });

      showCard.innerHTML = `
        <div class="show-main-inputs">
          <div>
            <label class="small-label">Show Date</label>
            <input type="date" class="s-date" value="${show.date}" required>
          </div>
          <div>
            <label class="small-label">Location / Venue</label>
            <input type="text" class="s-venue" placeholder="Venue name" value="${show.venue}" required>
          </div>
          <div>
            <label class="small-label">Event Type / Package</label>
            <input type="text" class="s-pkg" placeholder="Package / Style" value="${show.pkg}" required>
          </div>
          <div>
            <label class="small-label">Price (MUR)</label>
            <input type="number" class="s-price" placeholder="Price" value="${show.price}" required>
          </div>
          <div>
            <button type="button" class="remove-row-btn remove-show-btn" title="Remove show">✕</button>
          </div>
        </div>
        <div class="addons-container">
          <div style="margin-bottom: 6px;"><button type="button" class="btn-sm-addon add-addon-btn">+ Add Optional Add-on</button></div>
          <div class="addon-list-inputs">${addonsHtml}</div>
        </div>
      `;
      
      showCard.querySelector('.remove-show-btn').addEventListener('click', () => {
        sampleShows.splice(showIndex, 1);
        renderRows();
        updateQuotationPreview();
      });

      showCard.querySelector('.add-addon-btn').addEventListener('click', () => {
        show.addons.push({ name: '', price: 0 });
        renderRows();
        updateQuotationPreview();
      });

      showCard.querySelectorAll('.remove-addon-btn').forEach((btn, addonIndex) => {
        btn.addEventListener('click', () => {
          show.addons.splice(addonIndex, 1);
          renderRows();
          updateQuotationPreview();
        });
      });

      showCard.querySelectorAll('.show-main-inputs input').forEach(input => {
        input.addEventListener('input', (e) => {
          const fieldType = e.target.className.replace('s-', '');
          show[fieldType] = e.target.value;
          updateQuotationPreview();
        });
      });

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

    document.getElementById('docNoLabel').textContent = isInvoice ? 'Invoice Number' : 'Quotation Number';
    document.getElementById('docDateLabel').textContent = isInvoice ? 'Invoice Date' : 'Quotation Date';
    document.getElementById('advanceLabel').textContent = isInvoice ? 'Advance Paid / Deposit Deducted (MUR)' : 'Advance Payment / Deduction (MUR)';
    document.getElementById('downloadPdfBtn').textContent = isInvoice ? 'Download' : 'Download';

    document.getElementById('valDocTitle').textContent = isInvoice ? 'Invoice' : 'Quotation';
    document.getElementById('valRefLabel').textContent = isInvoice ? 'Invoice No:' : 'Ref No:';
    document.getElementById('valDateLabel').textContent = isInvoice ? 'Invoice Date:' : 'Date:';
    document.getElementById('valPreparedForLabel').textContent = isInvoice ? 'Billed To:' : 'Prepared For:';
    document.getElementById('valDeductionLabel').textContent = isInvoice ? 'Less: Deposit / Advance Paid' : 'Less: Advance Payment';
    document.getElementById('valBalanceLabel').textContent = isInvoice ? 'Total' : 'Total';
    document.getElementById('valNotesTitle').textContent = isInvoice ? 'Payment Terms & Instructions' : 'Terms & Conditions';

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

    const quoteNoInput = document.getElementById('quoteNo');
    let currentVal = quoteNoInput.value.trim();
    
    let idMatch = currentVal.match(/(?:AIM-Q-|AIM-INV-)?(.+)/);
    let recordId = idMatch ? idMatch[1] : '001';
    
    if (isInvoice) {
      if (!currentVal.startsWith('AIM-INV-')) {
        quoteNoInput.value = `AIM-INV-${recordId.replace('AIM-Q-', '')}`;
      }
    } else {
      if (!currentVal.startsWith('AIM-Q-')) {
        quoteNoInput.value = `AIM-Q-${recordId.replace('AIM-INV-', '')}`;
      }
    }

    document.querySelector('.val-clientName').textContent = document.getElementById('clientName').value || '—';
    document.querySelector('.val-clientContact').textContent = document.getElementById('clientContact').value || '—';
    document.querySelector('.val-quoteNo').textContent = quoteNoInput.value || (isInvoice ? 'AIM-INV-001' : 'AIM-Q-001');
    
    const selectedDate = document.getElementById('quoteDate').value;
    document.querySelector('.val-quoteDate').textContent = formatDateToDDMMYYYY(selectedDate);
    
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

    const statusVal = document.getElementById('quoteStatus').value;
    const badgeEl = document.getElementById('valStatusBadge');
    badgeEl.textContent = statusVal;
    badgeEl.className = `status-pill ${statusVal.toLowerCase()}`;

    const tableBody = document.getElementById('invoiceTableBody');
    tableBody.innerHTML = '';
    
    let subtotal = 0;
    sampleShows.forEach((s, idx) => {
      const priceNum = parseFloat(s.price) || 0;
      subtotal += priceNum;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align: center;"><b>${idx + 1}</b></td>
        <td><b>${formatDateToDDMMYYYY(s.date)}</b></td>
        <td><b>${s.venue || '—'}</b></td>
        <td><b>${s.pkg || '—'}</b></td>
        <td style="text-align: right;"><b>${priceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td>
      `;
      tableBody.appendChild(tr);

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

    const advanceInput = parseFloat(document.getElementById('advancePayment').value) || 0;
    const finalBalance = Math.max(0, subtotal - advanceInput);

    document.getElementById('valSubtotalAmount').textContent = `MUR ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    const deductionRow = document.getElementById('deductionRow');
    const isPaid = statusVal === 'PAID';

    if (advanceInput > 0 && !isPaid) {
      deductionRow.style.display = 'flex';
      document.getElementById('valDeductionAmount').textContent = `- MUR ${advanceInput.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      deductionRow.style.display = 'none';
    }

    if (isPaid) {
      document.getElementById('valBalanceLabel').textContent = 'Total Paid';
      document.getElementById('valTotalAmount').textContent = `MUR ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      document.getElementById('valBalanceLabel').textContent = isInvoice ? 'Total' : 'Total';
      document.getElementById('valTotalAmount').textContent = `MUR ${finalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    setTimeout(fitA4Preview, 50);
  }

  ['docType', 'clientName', 'clientContact', 'quoteNo', 'quoteDate', 'quoteStatus', 'quoteNote', 'advancePayment'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateQuotationPreview);
      el.addEventListener('change', updateQuotationPreview);
    }
  });

  // --- Automated Direct PDF Download ---
  document.getElementById('downloadPdfBtn').addEventListener('click', () => {
    const element = document.getElementById('quotationDocument');
    const docType = document.getElementById('docType').value;
    const refNo = document.getElementById('quoteNo').value.trim() || (docType === 'invoice' ? 'AIM-INV-001' : 'AIM-Q-001');
    const filename = `${refNo}.pdf`;

    element.classList.add('is-exporting');

    const opt = {
      margin:       0,
      filename:     filename,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, letterRendering: true, scrollX: 0, scrollY: 0 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css'] }
    };

    html2pdf().from(element).set(opt).save().then(() => {
      element.classList.remove('is-exporting');
      fitA4Preview();
      showToast('PDF downloaded successfully');
    }).catch(err => {
      console.error('PDF Export Error:', err);
      element.classList.remove('is-exporting');
      fitA4Preview();
      showToast('Failed to generate PDF. Please try again.');
    });
  });

  fitA4Preview();
});
