document.addEventListener('DOMContentLoaded', () => {
  console.log('report.js loaded');

  const generateReportBtn = document.getElementById('generate-report-btn');
  const downloadPdfBtn = document.getElementById('download-pdf-btn');
  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');
  const senderSelect = document.getElementById('sender');
  const reportSection = document.getElementById('report-section');
  const dateRangeTableBody = document.getElementById('date-range-table-body');
  const senderDocumentsSection = document.getElementById('sender-documents-section');
  const senderDocumentsTableBody = document.getElementById('sender-documents-table-body');
  const senderReceiverRegionSection = document.getElementById('sender-receiver-region-stats-section');
  const senderReceiverRegionTableBody = document.getElementById('sender-receiver-region-table-body');
  const errorMessage = document.getElementById('error-message');

  let addressedToChart, regionChart;

  async function loadSenders() {
    try {
      const response = await fetch('/api/senders');
      if (!response.ok) throw new Error('Failed to fetch senders');
      const senders = await response.json();
      senders
        .filter(sender => sender && sender.trim() !== '')
        .forEach(sender => {
          const option = document.createElement('option');
          option.value = sender;
          option.text = sender;
          senderSelect.appendChild(option);
        });
    } catch (error) {
      console.error('Error loading senders:', error);
      showError('Failed to load senders');
    }
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
  }

  function populateDocumentsTable(tbody, documents) {
    tbody.innerHTML = '';
    documents.forEach(record => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${record.outward_number || 'N/A'}</td>
        <td>${record.reference || 'N/A'}</td>
        <td>${record.subject || 'N/A'}</td>
        <td>${record.recipient || 'N/A'}</td>
        <td>${record.organization || 'N/A'}</td>
        <td>${record.division || 'N/A'}</td>
        <td>${record.section || 'N/A'}</td>
        <td>${record.sender || 'Unknown'}</td>
        <td>${record.date_sent || 'N/A'}</td>
        <td>${record.submission_type || 'N/A'}</td>
        <td>${record.document_path ? `<a href="${record.document_path}" target="_blank">View</a>` : 'N/A'}</td>
      `;
      tbody.appendChild(row);
    });
  }

  function populateReceiverRegionTable(stats) {
    senderReceiverRegionTableBody.innerHTML = '';
    const receiverTypes = ['CentralGovt', 'StateGovt', 'PrivateOrg', 'Citizen', 'Other'];
    const regions = ['A', 'B', 'C', 'D'];

    const totals = {};
    receiverTypes.forEach(type => {
      const row = document.createElement('tr');
      let rowHtml = `<td>${type}</td>`;
      let rowTotal = 0;
      regions.forEach(region => {
        const stat = stats.find(s => s.addressedTo === type && s.region === region) || { count: 0 };
        rowHtml += `<td>${stat.count}</td>`;
        rowTotal += stat.count;
      });
      rowHtml += `<td>${rowTotal}</td>`;
      totals[type] = rowTotal;
      row.innerHTML = rowHtml;
      senderReceiverRegionTableBody.appendChild(row);
    });

    const totalRow = document.createElement('tr');
    let totalHtml = '<td><strong>Total</strong></td>';
    let grandTotal = 0;
    regions.forEach(region => {
      const regionTotal = receiverTypes.reduce((sum, type) => {
        const stat = stats.find(s => s.addressedTo === type && s.region === region) || { count: 0 };
        return sum + stat.count;
      }, 0);
      totalHtml += `<td><strong>${regionTotal}</strong></td>`;
      grandTotal += regionTotal;
    });
    totalHtml += `<td><strong>${grandTotal}</strong></td>`;
    totalRow.innerHTML = totalHtml;
    senderReceiverRegionTableBody.appendChild(totalRow);
  }

  async function generateGeneralReport() {
    generateReportBtn.disabled = true;
    reportSection.style.display = 'none';
    dateRangeTableBody.innerHTML = '';
    senderDocumentsTableBody.innerHTML = '';
    senderReceiverRegionTableBody.innerHTML = '';
    downloadPdfBtn.disabled = true;
    errorMessage.style.display = 'none';
    senderDocumentsSection.style.display = 'none';
    senderReceiverRegionSection.style.display = 'none';

    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
      showError('Please select both start and end dates');
      generateReportBtn.disabled = false;
      return;
    }

    try {
      const dateRangeResponse = await fetch(`/api/report/date-range?startDate=${startDate}&endDate=${endDate}`);
      if (!dateRangeResponse.ok) throw new Error('Failed to fetch date range documents');
      const dateRangeDocs = await dateRangeResponse.json();
      populateDocumentsTable(dateRangeTableBody, dateRangeDocs);

      const languageStatsResponse = await fetch(`/api/report/language-stats?startDate=${startDate}&endDate=${endDate}`);
      if (!languageStatsResponse.ok) throw new Error('Failed to fetch language stats');
      const languageStats = await languageStatsResponse.json();
      renderLanguageTable(languageStats);

      const addressedToStatsResponse = await fetch(`/api/report/addressed-to-stats?startDate=${startDate}&endDate=${endDate}`);
      if (!addressedToStatsResponse.ok) throw new Error('Failed to fetch addressedTo stats');
      const addressedToStats = await addressedToStatsResponse.json();
      renderAddressedToChart(addressedToStats);

      const regionStatsResponse = await fetch(`/api/report/region-stats?startDate=${startDate}&endDate=${endDate}`);
      if (!regionStatsResponse.ok) throw new Error('Failed to fetch region stats');
      const regionStats = await regionStatsResponse.json();
      renderRegionChart(regionStats);

      reportSection.style.display = 'block';
      downloadPdfBtn.disabled = false;

      await loadSenderDocuments();
    } catch (error) {
      console.error('Error generating general report:', error);
      showError(error.message || 'Failed to generate report');
    } finally {
      generateReportBtn.disabled = false;
    }
  }

  async function loadSenderDocuments() {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const sender = senderSelect.value;

    if (!startDate || !endDate || !sender) {
      senderDocumentsTableBody.innerHTML = '';
      senderReceiverRegionTableBody.innerHTML = '';
      senderDocumentsSection.style.display = 'none';
      senderReceiverRegionSection.style.display = 'none';
      return;
    }

    try {
      const senderDocsResponse = await fetch(`/api/report/sender-documents?startDate=${startDate}&endDate=${endDate}&sender=${encodeURIComponent(sender)}`);
      if (!senderDocsResponse.ok) throw new Error('Failed to fetch sender documents');
      const senderDocs = await senderDocsResponse.json();
      populateDocumentsTable(senderDocumentsTableBody, senderDocs);
      senderDocumentsSection.style.display = 'block';

      const receiverRegionStatsResponse = await fetch(`/api/report/sender-receiver-region-stats?startDate=${startDate}&endDate=${endDate}&sender=${encodeURIComponent(sender)}`);
      if (!receiverRegionStatsResponse.ok) throw new Error('Failed to fetch receiver-region stats');
      const receiverRegionStats = await receiverRegionStatsResponse.json();
      populateReceiverRegionTable(receiverRegionStats);
      senderReceiverRegionSection.style.display = 'block';
    } catch (error) {
      console.error('Error loading sender documents or receiver-region stats:', error);
      showError(error.message || 'Failed to load sender documents or stats');
    }
  }

  function renderLanguageTable(stats) {
    const languages = ['Hindi', 'English', 'Bilingual', 'Other'];
    const categories = ['>=SOH', '>=SOF <SOH', '<SOF'];
    const categoryPrefixes = ['soh', 'sof', 'below-sof'];

    categories.forEach((category, index) => {
      const prefix = categoryPrefixes[index];
      languages.forEach(lang => {
        const cell = document.getElementById(`${prefix}-${lang.toLowerCase()}`);
        cell.textContent = '0.00%';
      });
    });

    stats.forEach(stat => {
      let prefix;
      if (stat.designation_category === '>=SOH') {
        prefix = 'soh';
      } else if (stat.designation_category === '>=SOF <SOH') {
        prefix = 'sof';
      } else if (stat.designation_category === '<SOF') {
        prefix = 'below-sof';
      }

      const lang = stat.language.toLowerCase();
      const cell = document.getElementById(`${prefix}-${lang}`);
      if (cell) {
        cell.textContent = `${stat.percentage.toFixed(2)}%`;
      }
    });
  }

  function renderAddressedToChart(stats) {
    if (addressedToChart) addressedToChart.destroy();
    const labels = stats.map(s => s.addressedTo);
    const data = stats.map(s => s.count);
    addressedToChart = new Chart(document.getElementById('addressed-to-chart'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Number of Documents',
          data: data,
          backgroundColor: '#36A2EB'
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  function renderRegionChart(stats) {
    if (regionChart) regionChart.destroy();
    const labels = stats.map(s => s.region);
    const data = stats.map(s => s.count);
    regionChart = new Chart(document.getElementById('region-chart'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Number of Documents',
          data: data,
          backgroundColor: '#FFCE56'
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  async function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Ensure autoTable is available
    if (!doc.autoTable) {
      console.error('jsPDF autoTable plugin is not loaded');
      showError('Failed to generate PDF: autoTable plugin is missing');
      return;
    }

    let yPos = 10;

    doc.setFontSize(16);
    doc.text('Outward Document Report', 105, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Period: ${startDateInput.value} to ${endDateInput.value}`, 105, yPos, { align: 'center' });
    yPos += 10;

    if (dateRangeTableBody.children.length > 0) {
      doc.setFontSize(14);
      doc.text('Documents Sent Between Dates', 10, yPos);
      yPos += 10;
      doc.autoTable({
        html: '#date-range-table',
        startY: yPos,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [74, 144, 226], textColor: [255, 255, 255] },
        margin: { left: 5, right: 5 },
        columnStyles: {
          0: { cellWidth: 20 }, // Outward Number
          1: { cellWidth: 20 }, // Reference
          2: { cellWidth: 30 }, // Subject
          3: { cellWidth: 20 }, // Recipient
          4: { cellWidth: 20 }, // Organization
          5: { cellWidth: 15 }, // Division
          6: { cellWidth: 15 }, // Section
          7: { cellWidth: 20 }, // Sender
          8: { cellWidth: 15 }, // Date Sent
          9: { cellWidth: 15 }, // Submission Type
          10: { cellWidth: 15 } // Document
        }
      });
      yPos = doc.lastAutoTable.finalY + 10;
    }

    doc.setFontSize(14);
    doc.text('Language Usage by Designation (%)', 10, yPos);
    yPos += 10;
    doc.autoTable({
      html: '#language-stats-table',
      startY: yPos,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [74, 144, 226], textColor: [255, 255, 255] },
      margin: { left: 10, right: 10 }
    });
    yPos = doc.lastAutoTable.finalY + 10;

    if (addressedToChart) {
      doc.addPage();
      yPos = 10;
      doc.setFontSize(14);
      doc.text('Documents Sent by Receiver Type', 10, yPos);
      yPos += 10;
      const imgData = addressedToChart.canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 10, yPos, 180, 180 * (addressedToChart.canvas.height / addressedToChart.canvas.width));
      yPos += 180 * (addressedToChart.canvas.height / addressedToChart.canvas.width) + 10;
    }

    if (regionChart) {
      doc.addPage();
      yPos = 10;
      doc.setFontSize(14);
      doc.text('Documents Sent by Region', 10, yPos);
      yPos += 10;
      const imgData = regionChart.canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 10, yPos, 180, 180 * (regionChart.canvas.height / regionChart.canvas.width));
      yPos += 180 * (regionChart.canvas.height / regionChart.canvas.width) + 10;
    }

    if (senderDocumentsSection.style.display !== 'none') {
      doc.addPage();
      yPos = 10;
      doc.setFontSize(14);
      doc.text(`Documents Sent by ${senderSelect.value || 'Unknown'}`, 10, yPos);
      yPos += 10;
      doc.autoTable({
        html: '#sender-documents-table',
        startY: yPos,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [74, 144, 226], textColor: [255, 255, 255] },
        margin: { left: 5, right: 5 },
        columnStyles: {
          0: { cellWidth: 20 }, // Outward Number
          1: { cellWidth: 20 }, // Reference
          2: { cellWidth: 30 }, // Subject
          3: { cellWidth: 20 }, // Recipient
          4: { cellWidth: 20 }, // Organization
          5: { cellWidth: 15 }, // Division
          6: { cellWidth: 15 }, // Section
          7: { cellWidth: 20 }, // Sender
          8: { cellWidth: 15 }, // Date Sent
          9: { cellWidth: 15 }, // Submission Type
          10: { cellWidth: 15 } // Document
        }
      });
      yPos = doc.lastAutoTable.finalY + 10;

      if (senderReceiverRegionSection.style.display !== 'none') {
        doc.setFontSize(14);
        doc.text(`Documents by Receiver Type and Region for ${senderSelect.value || 'Unknown'}`, 10, yPos);
        yPos += 10;
        doc.autoTable({
          html: '#sender-receiver-region-table',
          startY: yPos,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [74, 144, 226], textColor: [255, 255, 255] },
          margin: { left: 10, right: 10 }
        });
      }
    }

    const now = new Date();
    const timestamp = now.toISOString().split('T')[0];
    doc.save(`outward-report-${timestamp}.pdf`);
  }

  generateReportBtn.addEventListener('click', generateGeneralReport);
  downloadPdfBtn.addEventListener('click', downloadPDF);
  senderSelect.addEventListener('change', loadSenderDocuments);

  loadSenders();
});