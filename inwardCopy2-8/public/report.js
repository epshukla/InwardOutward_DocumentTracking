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
  const errorMessage = document.getElementById('error-message');

  let receiverChart, regionChart;

  
  async function loadSenders() {
    try {
      console.log('Fetching senders from /api/allemp');
      const response = await fetch('/api/allemp');
      if (!response.ok) {
        throw new Error(`Failed to fetch senders: ${response.status} ${response.statusText}`);
      }
      const senders = await response.json();
      console.log('Senders response:', senders);

      // Clear existing options except the default "All Senders"
      senderSelect.innerHTML = '<option value="">All Senders</option>';

      // Populate dropdown with EmpName
      senders.forEach(sender => {
        const option = document.createElement('option');
        option.value = sender.EmpName;
        option.text = sender.EmpName;
        senderSelect.appendChild(option);
      });

      console.log('Sender dropdown populated with', senders.length, 'senders');
    } catch (error) {
      console.error('Error loading senders:', error);
      showError('Failed to load senders. Please try again later.');
    }
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
      errorMessage.style.display = 'none';
    }, 5000); // Hide after 5 seconds
  }

  function populateDocumentsTable(tbody, documents) {
    tbody.innerHTML = '';
    documents.forEach(record => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${record.inward_number}</td>
        <td>${record.reference_number}</td>
        <td>${record.subject}</td>
        <td>${record.sender_name}</td>
        <td>${record.sender_type}</td>
        <td>${record.receiving_division}</td>
        <td>${record.receiving_section}</td>
        <td>${record.receiver}</td>
        <td>${record.date_as_per_document}</td>
        <td>${record.submission_type}</td>
        <td>${record.document_path ? `<a href="${record.document_path}" target="_blank">View</a>` : 'N/A'}</td>
      `;
      tbody.appendChild(row);
    });
  }

  async function generateGeneralReport() {
    generateReportBtn.disabled = true;
    reportSection.style.display = 'none';
    dateRangeTableBody.innerHTML = '';
    downloadPdfBtn.disabled = true;
    errorMessage.style.display = 'none';
  
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
  
    if (!startDate || !endDate) {
      showError('Please select both start and end dates');
      generateReportBtn.disabled = false;
      return;
    }
  
    let hasData = false;
  
    try {
      console.log('Fetching date range documents:', { startDate, endDate });
      const dateRangeResponse = await fetch(`/api/report/date-range?startDate=${startDate}&endDate=${endDate}`);
      console.log('Date range response status:', dateRangeResponse.status);
      if (!dateRangeResponse.ok) throw new Error(`Failed to fetch date range documents: ${dateRangeResponse.status} ${dateRangeResponse.statusText}`);
      const dateRangeDocs = await dateRangeResponse.json();
      console.log('Date range documents:', dateRangeDocs);
      populateDocumentsTable(dateRangeTableBody, dateRangeDocs);
      hasData = dateRangeDocs.length > 0;
  
      console.log('Fetching language stats:', { startDate, endDate });
      let languageStats = [];
      try {
        const languageStatsResponse = await fetch(`/api/report/language-stats?startDate=${startDate}&endDate=${endDate}`);
        console.log('Language stats response status:', languageStatsResponse.status);
        if (languageStatsResponse.ok) {
          languageStats = await languageStatsResponse.json();
          console.log('Language stats:', languageStats);
          renderLanguageTable(languageStats);
        } else {
          console.warn('Language stats fetch failed:', languageStatsResponse.status);
          showError('Language stats unavailable, displaying partial report');
        }
      } catch (langError) {
        console.warn('Error fetching language stats:', langError.message);
        showError('Language stats unavailable, displaying partial report');
      }
  
      console.log('Fetching receiver stats:', { startDate, endDate });
      const receiverStatsResponse = await fetch(`/api/report/receiver-stats?startDate=${startDate}&endDate=${endDate}`);
      console.log('Receiver stats response status:', receiverStatsResponse.status);
      if (!receiverStatsResponse.ok) throw new Error(`Failed to fetch receiver stats: ${receiverStatsResponse.status} ${receiverStatsResponse.statusText}`);
      const receiverStats = await receiverStatsResponse.json();
      console.log('Receiver stats:', receiverStats);
      renderReceiverChart(receiverStats.length ? receiverStats : [{ receiver: 'No Data', count: 0 }]);
      hasData = hasData || receiverStats.length > 0;
  
      console.log('Fetching region stats:', { startDate, endDate });
      const regionStatsResponse = await fetch(`/api/report/region-stats?startDate=${startDate}&endDate=${endDate}`);
      console.log('Region stats response status:', regionStatsResponse.status);
      if (!regionStatsResponse.ok) throw new Error(`Failed to fetch region stats: ${regionStatsResponse.status} ${regionStatsResponse.statusText}`);
      const regionStats = await regionStatsResponse.json();
      console.log('Region stats:', regionStats);
      renderRegionChart(regionStats.length ? regionStats : [{ region: 'No Data', count: 0 }]);
      hasData = hasData || regionStats.length > 0;
  
      if (hasData) {
        reportSection.style.display = 'block';
        downloadPdfBtn.disabled = false;
      } else {
        showError('No data available for the selected date range');
      }
    } catch (error) {
      console.error('Error generating general report:', error.message, error.stack);
      showError(error.message || 'Failed to generate report');
    } finally {
      generateReportBtn.disabled = false;
    }
  }

  async function loadSenderDocuments() {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const sender = senderSelect.value;
    console.log('Loading documents for sender:', sender, 'from', startDate, 'to', endDate);

    if (!startDate || !endDate || !sender) {
      senderDocumentsTableBody.innerHTML = '';
      senderDocumentsSection.style.display = 'none';
      return;
    }

    try {
      const senderDocsResponse = await fetch(`/api/report/sender-documents?startDate=${startDate}&endDate=${endDate}&sender=${encodeURIComponent(sender)}`);
      if (!senderDocsResponse.ok) throw new Error('Failed to fetch sender documents');
      const senderDocs = await senderDocsResponse.json();
      populateDocumentsTable(senderDocumentsTableBody, senderDocs);
      senderDocumentsSection.style.display = 'block';
    } catch (error) {
      console.error('Error loading sender documents:', error);
      showError(error.message || 'Failed to load sender documents');
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

  function renderReceiverChart(stats) {
    if (receiverChart) receiverChart.destroy();
    const labels = stats.map(s => s.receiver);
    const data = stats.map(s => s.count);
    receiverChart = new Chart(document.getElementById('receiver-chart'), {
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

    let yPos = 10;

    doc.setFontSize(16);
    doc.text('Inward Document Report', 105, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Period: ${startDateInput.value} to ${endDateInput.value}`, 105, yPos, { align: 'center' });
    yPos += 10;

    if (dateRangeTableBody.children.length > 0) {
      doc.setFontSize(14);
      doc.text('Documents Received Between Dates', 10, yPos);
      yPos += 10;
      doc.autoTable({
        html: '#date-range-table',
        startY: yPos,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [74, 144, 226] },
        margin: { left: 5, right: 5 }
      });
      yPos = doc.lastAutoTable.finalY + 10;
    }

    doc.setFontSize(14);
    doc.text('Language Usage by Designation (%)', 10, yPos);
    yPos += 10;
    doc.autoTable({
      html: '#language-stats-table',
      startY: yPos,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [74, 144, 226] },
      margin: { left: 10, right: 10 }
    });
    yPos = doc.lastAutoTable.finalY + 10;

    if (receiverChart) {
      doc.addPage();
      yPos = 10;
      doc.setFontSize(14);
      doc.text('Documents Received by Receiver', 10, yPos);
      yPos += 10;
      const imgData = receiverChart.canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 10, yPos, 180, 180 * (receiverChart.canvas.height / receiverChart.canvas.width));
      yPos += 180 * (receiverChart.canvas.height / receiverChart.canvas.width) + 10;
    }

    if (regionChart) {
      doc.addPage();
      yPos = 10;
      doc.setFontSize(14);
      doc.text('Documents Received by Region', 10, yPos);
      yPos += 10;
      const imgData = regionChart.canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 10, yPos, 180, 180 * (regionChart.canvas.height / regionChart.canvas.width));
      yPos += 180 * (regionChart.canvas.height / regionChart.canvas.width) + 10;
    }

    if (senderDocumentsSection.style.display !== 'none') {
      doc.addPage();
      yPos = 10;
      doc.setFontSize(14);
      doc.text(`Documents Sent by ${senderSelect.value}`, 10, yPos);
      yPos += 10;
      doc.autoTable({
        html: '#sender-documents-table',
        startY: yPos,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [74, 144, 226] },
        margin: { left: 5, right: 5 }
      });
    }

    const now = new Date();
    const timestamp = now.toISOString().split('T')[0];
    doc.save(`inward-report-${timestamp}.pdf`);
  }

  generateReportBtn.addEventListener('click', generateGeneralReport);
  downloadPdfBtn.addEventListener('click', downloadPDF);
  senderSelect.addEventListener('change', loadSenderDocuments);

  loadSenders();
});