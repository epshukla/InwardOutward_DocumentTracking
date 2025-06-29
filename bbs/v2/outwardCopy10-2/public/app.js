document.addEventListener('DOMContentLoaded', () => {
  console.log('app.js loaded');

  const form = document.getElementById('outward-form');
  const submitBtn = document.getElementById('submit-btn');
  const successMessage = document.getElementById('success-message');
  const errorMessage = document.getElementById('error-message');
  const inwardReferenceInput = document.getElementById('inward-reference');
  const outwardReferenceInput = document.getElementById('outward-reference');
  const inwardReferenceGroup = document.getElementById('inward-reference-group');
  const subjectInput = document.getElementById('subject');
  const languageInput = document.getElementById('language');
  const dateSentInput = document.getElementById('date-sent');
  const submissionTypeInput = document.getElementById('submission-type');
  const hardCopiesGroup = document.getElementById('hard-copies-group');
  const hardCopiesInput = document.getElementById('hard-copies');
  const documentInput = document.getElementById('document');
  const recipientInput = document.getElementById('recipient');
  const organizationInput = document.getElementById('organization');
  const pincodeInput = document.getElementById('pincode');
  const cityInput = document.getElementById('city');
  const stateSelect = document.getElementById('state');
  const regionInput = document.getElementById('region');
  const countryInput = document.getElementById('country');
  const addressedToInput = document.getElementById('addressedTo');
  const divisionInput = document.getElementById('division');
  const sectionInput = document.getElementById('section');
  const procedureSubjectInput = document.getElementById('procedure-subject');
  const procedureTopicToggle = document.getElementById('procedure-topic-toggle');
  const procedureTopicDropdown = document.getElementById('procedure-topic-dropdown');
  const procedureSubtopics = document.getElementById('procedure-subtopics');
  const procedureDisplay = document.getElementById('procedure-display');
  const procedureInput = document.getElementById('procedure');
  const senderInput = document.getElementById('sender');
  const addSectionForm = document.getElementById('add-section-form');
  const sectionAbbrInput = document.getElementById('section-abbr');
  const sectionNameInput = document.getElementById('section-name');
  const addSectionSubmit = document.getElementById('add-section-submit');
  const addSectionMessage = document.getElementById('add-section-message');
  const inwardDocumentsTable = document.getElementById('inward-documents-table');
  const isReplySelect = document.getElementById('is-reply');
  const inwardTableContainer = document.getElementById('inward-table-container');
  const inwardSearchInput = document.getElementById('inward-search');
  const inwardSearchContainer = document.getElementById('inward-search-container');
  const ccSelectAllCheckbox = document.getElementById('cc-select-all');
  const ccSearchInput = document.getElementById('cc-search');
  const ccTableContainer = document.getElementById('cc-table-container');
  const ccEmployeesTable = document.getElementById('cc-employees-table');

  let inwardDocuments = [];
  let ccEmployees = [];
  let isReplyChoices;
  let stateChoices;
  let senderChoices;
  let selectedProcedure = '';
  let selectedTopic = '';
  let selectedSubtopic = '';

  const indianStates = [
    'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
    'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala',
    'Ladakh', 'Lakshadweep', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ];

  const stateToRegion = {
    'Delhi': 'A',
    'Haryana': 'A',
    'Himachal Pradesh': 'A',
    'Rajasthan': 'A',
    'Uttarakhand': 'A',
    'Uttar Pradesh': 'A',
    'Andaman and Nicobar Islands': 'N/A',
    'Bihar': 'A',
    'Jharkhand': 'A',
    'Madhya Pradesh': 'A',
    'Chhattisgarh': 'A',
    'Punjab': 'B',
    'Chandigarh': 'B',
    'Dadra and Nagar Haveli and Daman and Diu': 'B',
    'Gujarat': 'B',
    'Maharashtra': 'B',
    'Arunachal Pradesh': 'C',
    'Jammu and Kashmir': 'C',
    'Ladakh': 'C',
    'Assam': 'C',
    'Manipur': 'C',
    'Meghalaya': 'C',
    'Mizoram': 'C',
    'Nagaland': 'C',
    'Odisha': 'C',
    'Sikkim': 'C',
    'Tripura': 'C',
    'West Bengal': 'C',
    'Goa': 'C',
    'Andhra Pradesh': 'C',
    'Karnataka': 'C',
    'Kerala': 'C',
    'Lakshadweep': 'C',
    'Puducherry': 'C',
    'Tamil Nadu': 'C',
    'Telangana': 'C'
  };

  // Initialize Choices.js for state dropdown
  try {
    console.log('Initializing Choices.js for state dropdown');
    stateChoices = new Choices(stateSelect, {
      searchEnabled: true,
      searchChoices: true,
      itemSelectText: '',
      placeholderValue: 'Select State',
      noResultsText: 'No states found',
      choices: indianStates.map(state => ({ value: state, label: state }))
    });
    console.log('Choices.js initialized successfully for state');
  } catch (error) {
    console.error('Failed to initialize Choices.js for state:', error);
  }

  // Initialize Choices.js for isReply dropdown
  try {
    console.log('Initializing Choices.js for isReply dropdown');
    isReplyChoices = new Choices(isReplySelect, {
      searchEnabled: false,
      itemSelectText: '',
      placeholderValue: 'Select Option',
      removeItems: true,
      removeItemButton: false,
      choices: [
        { value: 'no', label: 'No', selected: true },
        { value: 'yes', label: 'Yes' }
      ]
    });
    console.log('Choices.js initialized successfully for isReply');
  } catch (error) {
    console.error('Failed to initialize Choices.js for isReply:', error);
  }

  // Initialize Choices.js for sender search bar
  try {
    console.log('Initializing Choices.js for sender search bar');
    senderChoices = new Choices(senderInput, {
      searchEnabled: true,
      searchChoices: true,
      itemSelectText: '',
      placeholderValue: 'Search Sender',
      noResultsText: 'No employees found',
      removeItems: true,
      removeItemButton: true,
      choices: []
    });
    console.log('Choices.js initialized successfully for sender');
  } catch (error) {
    console.error('Failed to initialize Choices.js for sender:', error);
  }

  function updateRegion() {
    const selectedState = stateSelect.value;
    const selectedRegion = stateToRegion[selectedState] || 'N/A';
    regionInput.value = selectedRegion;
  }

  function toggleInwardTable() {
    const isReply = isReplySelect.value === 'yes';
    inwardReferenceGroup.style.display = isReply ? 'block' : 'none';
    inwardTableContainer.style.display = isReply ? 'block' : 'none';
    inwardSearchContainer.style.display = isReply ? 'block' : 'none';
    if (isReply) {
      inwardTableContainer.classList.remove('disabled-table');
      inwardDocumentsTable.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.disabled = false;
      });
    } else {
      inwardTableContainer.classList.add('disabled-table');
      inwardSearchInput.value = '';
      inwardDocumentsTable.querySelectorAll('input[name="inward-id"]').forEach(checkbox => {
        checkbox.disabled = true;
        checkbox.checked = false;
      });
      clearAutofilledFields();
    }
    filterInwardDocuments();
  }

  function clearAutofilledFields() {
    inwardReferenceInput.value = '';
    subjectInput.value = '';
    recipientInput.value = '';
    addressedToInput.value = '';
    organizationInput.value = '';
    pincodeInput.value = '';
    cityInput.value = '';
    if (stateChoices) stateChoices.setChoiceByValue('');
    regionInput.value = '';
    countryInput.value = '';
  }

  function handleCheckboxSelection() {
    inwardDocumentsTable.addEventListener('change', async (e) => {
      if (e.target.type === 'checkbox' && e.target.name === 'inward-id') {
        inwardDocumentsTable.querySelectorAll('input[name="inward-id"]').forEach(checkbox => {
          if (checkbox !== e.target) {
            checkbox.checked = false;
          }
        });
        if (e.target.checked) {
          const inwardId = e.target.value;
          await autofillFields(inwardId);
        } else {
          clearAutofilledFields();
        }
      }
    });
  }

  async function autofillFields(inwardId) {
    try {
      console.log(`Fetching inward document details for ID: ${inwardId}`);
      const response = await fetch(`/api/inward-documents/${inwardId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const doc = await response.json();
      console.log('Inward document details fetched:', doc);
      inwardReferenceInput.value = doc.reference_number || '';
      subjectInput.value = doc.subject || '';
      recipientInput.value = doc.sender_name || '';
      const senderTypeMap = {
        'CentralGovt': 'CentralGovt',
        'StateGovt': 'StateGovt',
        'PrivateOrg': 'PrivateOrg',
        'Individual': 'Citizen'
      };
      addressedToInput.value = senderTypeMap[doc.sender_type] || 'Other';
      organizationInput.value = '';
      pincodeInput.value = doc.pincode || '';
      cityInput.value = doc.city || '';
      if (doc.state && stateChoices) {
        stateChoices.setChoiceByValue(doc.state);
      }
      regionInput.value = doc.region || '';
      countryInput.value = doc.country || '';
    } catch (error) {
      console.error('Error fetching inward document details:', error);
      errorMessage.textContent = 'Failed to load inward document details';
      errorMessage.style.backgroundColor = '#f56565';
      errorMessage.style.display = 'block';
    }
  }

  async function loadDivisions() {
    try {
      console.log('Fetching divisions from /api/divisions');
      const response = await fetch('/api/divisions');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const divisions = await response.json();
      console.log('Divisions fetched:', divisions);
      divisionInput.innerHTML = '<option value="">Select Division</option>';
      divisions.forEach(div => {
        const option = document.createElement('option');
        option.value = div.abbreviation;
        option.textContent = `${div.name} (${div.abbreviation})`;
        divisionInput.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading divisions:', error);
      errorMessage.textContent = 'Failed to load divisions';
      errorMessage.style.backgroundColor = '#f56565';
      errorMessage.style.display = 'block';
    }
  }

  async function loadSections(divisionAbbr) {
    sectionInput.innerHTML = '<option value="">Select Section</option>';
    try {
      if (!divisionAbbr) return;
      const encodedDivision = encodeURIComponent(divisionAbbr);
      console.log(`Fetching sections for division=${encodedDivision}`);
      const response = await fetch(`/api/sections?division=${encodedDivision}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const sections = await response.json();
      console.log('Sections fetched:', sections);
      sections.forEach(sec => {
        const option = document.createElement('option');
        option.value = sec.abbreviation;
        option.textContent = `${sec.name} (${sec.abbreviation})`;
        sectionInput.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading sections:', error);
      errorMessage.textContent = 'Failed to load sections';
      errorMessage.style.backgroundColor = '#f56565';
      errorMessage.style.display = 'block';
    }
  }

  async function loadSenders() {
    try {
      console.log('Fetching all employees for sender from /api/search-employees');
      const response = await fetch('/api/search-employees');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const employees = await response.json();
      console.log('Sender employees fetched:', employees);
      if (!Array.isArray(employees)) {
        throw new Error('Invalid response format: Expected an array');
      }
      if (senderChoices) {
        senderChoices.clearChoices();
        senderChoices.setChoices(
          employees.map(emp => ({
            value: emp.EmpName,
            label: `${emp.EmpName} (${emp.EmpCode})`
          })),
          'value',
          'label',
          false
        );
      }
    } catch (error) {
      console.error('Error loading senders:', error);
      errorMessage.textContent = 'Failed to load senders';
      errorMessage.style.backgroundColor = '#f56565';
      errorMessage.style.display = 'block';
    }
  }

  async function handleSenderSelection() {
    senderInput.addEventListener('change', async () => {
      const senderName = senderInput.value;
      if (!senderName) {
        divisionInput.value = '';
        sectionInput.innerHTML = '<option value="">Select Section</option>';
        return;
      }
      try {
        console.log(`Fetching employee details for sender: ${senderName}`);
        const response = await fetch(`/api/employee-details?name=${encodeURIComponent(senderName)}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const employee = await response.json();
        console.log('Employee details fetched:', employee);
        if (employee && employee.Division && employee.Section) {
          divisionInput.value = employee.Division;
          await loadSections(employee.Division);
          sectionInput.value = employee.Section;
        } else {
          divisionInput.value = '';
          sectionInput.innerHTML = '<option value="">Select Section</option>';
          errorMessage.textContent = 'Employee division or section not found';
          errorMessage.style.backgroundColor = '#ecc94b';
          errorMessage.style.display = 'block';
        }
      } catch (error) {
        console.error('Error fetching employee details:', error);
        divisionInput.value = '';
        sectionInput.innerHTML = '<option value="">Select Section</option>';
        errorMessage.textContent = 'Failed to load employee details';
        errorMessage.style.backgroundColor = '#f56565';
        errorMessage.style.display = 'block';
      }
    });
  }

  async function loadProcedures() {
    try {
      console.log('Fetching procedures from /api/procedures');
      const response = await fetch('/api/procedures');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const procedures = await response.json();
      console.log('Procedures fetched:', procedures);
      procedureSubjectInput.innerHTML = '<option value="">Select Procedure</option>';
      procedures.forEach(proc => {
        const option = document.createElement('option');
        option.value = proc.abbreviation;
        option.textContent = `${proc.name} (${proc.abbreviation})`;
        procedureSubjectInput.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading procedures:', error);
      errorMessage.textContent = 'Failed to load procedures';
      errorMessage.style.backgroundColor = '#f56565';
      errorMessage.style.display = 'block';
    }
  }

  async function loadTopics(procedureAbbr) {
    procedureTopicDropdown.innerHTML = '';
    procedureSubtopics.innerHTML = '';
    procedureSubtopics.classList.remove('show');
    procedureTopicToggle.textContent = 'Select Topic';
    try {
      if (!procedureAbbr) return;
      const encodedProcedure = encodeURIComponent(procedureAbbr);
      console.log(`Fetching topics for procedure=${encodedProcedure}`);
      const response = await fetch(`/api/topics?procedure=${encodedProcedure}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const topics = await response.json();
      console.log('Topics fetched:', topics);
      topics.forEach(topic => {
        const div = document.createElement('div');
        div.classList.add('topic-item');
        div.textContent = `${topic.name} (${topic.abbreviation})`;
        div.dataset.abbreviation = topic.abbreviation;
        div.dataset.name = topic.name;
        procedureTopicDropdown.appendChild(div);
      });
    } catch (error) {
      console.error('Error loading topics:', error);
      errorMessage.textContent = 'Failed to load topics';
      errorMessage.style.backgroundColor = '#f56565';
      errorMessage.style.display = 'block';
    }
  }

  async function loadSubtopics(topicAbbr) {
    procedureSubtopics.innerHTML = '';
    try {
      if (!topicAbbr) return;
      const encodedTopic = encodeURIComponent(topicAbbr);
      console.log(`Fetching subtopics for topic=${encodedTopic}`);
      const response = await fetch(`/api/subtopics?topic=${encodedTopic}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const subtopics = await response.json();
      console.log('Subtopics fetched:', subtopics);
      subtopics.forEach(subtopic => {
        const div = document.createElement('div');
        div.classList.add('subtopic-item');
        div.textContent = `${subtopic.name} (${subtopic.abbreviation})`;
        div.dataset.abbreviation = subtopic.abbreviation;
        div.dataset.name = subtopic.name;
        procedureSubtopics.appendChild(div);
      });
      procedureSubtopics.classList.add('show');
    } catch (error) {
      console.error('Error loading subtopics:', error);
      errorMessage.textContent = 'Failed to load subtopics';
      errorMessage.style.backgroundColor = '#f56565';
      errorMessage.style.display = 'block';
    }
  }

  function setupProcedureDropdowns() {
    procedureTopicToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      procedureTopicDropdown.classList.toggle('show');
      procedureSubtopics.classList.remove('show');
    });

    procedureSubjectInput.addEventListener('change', () => {
      selectedProcedure = procedureSubjectInput.value;
      selectedTopic = '';
      selectedSubtopic = '';
      procedureTopicToggle.textContent = 'Select Topic';
      procedureDisplay.textContent = selectedProcedure ? `${procedureSubjectInput.options[procedureSubjectInput.selectedIndex].text}` : '';
      procedureInput.value = selectedProcedure;
      procedureTopicDropdown.classList.remove('show');
      procedureSubtopics.classList.remove('show');
      if (selectedProcedure) {
        loadTopics(selectedProcedure);
      } else {
        procedureTopicDropdown.innerHTML = '';
      }
    });

    procedureTopicDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target.classList.contains('topic-item')) {
        selectedTopic = e.target.dataset.abbreviation;
        procedureTopicToggle.textContent = e.target.textContent;
        procedureTopicDropdown.classList.remove('show');
        procedureDisplay.textContent = `${procedureSubjectInput.options[procedureSubjectInput.selectedIndex].text} > ${e.target.textContent}`;
        procedureInput.value = `${selectedProcedure} > ${selectedTopic}`;
        loadSubtopics(selectedTopic);
      }
    });

    procedureSubtopics.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target.classList.contains('subtopic-item')) {
        selectedSubtopic = e.target.dataset.abbreviation;
        procedureSubtopics.classList.remove('show');
        procedureDisplay.textContent = `${procedureSubjectInput.options[procedureSubjectInput.selectedIndex].text} > ${procedureTopicToggle.textContent} > ${e.target.textContent}`;
        procedureInput.value = `${selectedProcedure} > ${selectedTopic} > ${selectedSubtopic}`;
      }
    });

    document.addEventListener('click', () => {
      procedureTopicDropdown.classList.remove('show');
      procedureSubtopics.classList.remove('show');
    });
  }

  async function loadCCEmployees() {
    try {
      console.log('Fetching all employees for CC from /api/search-employees');
      const response = await fetch('/api/search-employees');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      console.log('CC employees fetched:', data);
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: Expected an array');
      }
      ccEmployees = data.filter(emp => emp && emp.EmpCode && emp.EmpName);
      if (ccEmployees.length === 0) {
        console.warn('No valid employees found in response');
        errorMessage.textContent = 'No CC recipients available';
        errorMessage.style.backgroundColor = '#ecc94b';
        errorMessage.style.display = 'block';
      }
      filterCCEmployees();
    } catch (error) {
      console.error('Error loading CC employees:', error);
      errorMessage.textContent = 'Failed to load CC recipients';
      errorMessage.style.backgroundColor = '#f56565';
      errorMessage.style.display = 'block';
      ccEmployeesTable.innerHTML = '<tr><td colspan="2" class="text-center">Failed to load employees</td></tr>';
      ccEmployees = [];
    }
  }

  function filterCCEmployees() {
    const searchTerm = ccSearchInput.value.toLowerCase();
    ccEmployeesTable.innerHTML = '';
    const filteredEmployees = ccEmployees.filter(emp => 
      emp && emp.EmpName && typeof emp.EmpName === 'string' && emp.EmpName.toLowerCase().includes(searchTerm)
    );
    if (filteredEmployees.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="2" class="text-center">No employees found</td>';
      ccEmployeesTable.appendChild(row);
      ccSelectAllCheckbox.checked = false;
      return;
    }
    filteredEmployees.forEach(emp => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="text-center">
          <input type="checkbox" name="cc-recipient" value="${emp.EmpCode}" class="cc-checkbox">
        </td>
        <td>${emp.EmpName}</td>
      `;
      ccEmployeesTable.appendChild(row);
    });
    ccSelectAllCheckbox.checked = filteredEmployees.every(emp => {
      const checkbox = ccEmployeesTable.querySelector(`input[value="${emp.EmpCode}"]`);
      return checkbox && checkbox.checked;
    });
  }

  function handleCCSelectAll() {
    ccSelectAllCheckbox.addEventListener('change', () => {
      const isChecked = ccSelectAllCheckbox.checked;
      ccEmployeesTable.querySelectorAll('input[name="cc-recipient"]').forEach(checkbox => {
        checkbox.checked = isChecked;
      });
    });
  }

  function handleCCCheckboxSelection() {
    ccEmployeesTable.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox' && e.target.name === 'cc-recipient') {
        const allCheckboxes = ccEmployeesTable.querySelectorAll('input[name="cc-recipient"]');
        ccSelectAllCheckbox.checked = Array.from(allCheckboxes).every(checkbox => checkbox.checked);
      }
    });
  }

  async function loadInwardDocuments() {
    try {
      console.log('Fetching inward documents from /api/inward-documents/pending-replies');
      const response = await fetch('/api/inward-documents/pending-replies');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      inwardDocuments = await response.json();
      console.log('Inward documents fetched:', inwardDocuments);
      filterInwardDocuments();
    } catch (error) {
      console.error('Error loading inward documents:', error);
      errorMessage.textContent = 'Failed to load inward documents';
      errorMessage.style.backgroundColor = '#f56565';
      errorMessage.style.display = 'block';
      inwardDocumentsTable.innerHTML = '<tr><td colspan="7" class="text-center">Failed to load documents</td></tr>';
    }
  }

  function filterInwardDocuments() {
    const searchTerm = inwardSearchInput.value.toLowerCase();
    inwardDocumentsTable.innerHTML = '';
    const filteredDocs = inwardDocuments.filter(doc => 
      (doc.inward_number || '').toLowerCase().includes(searchTerm)
    );
    if (filteredDocs.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="7" class="text-center">No pending replies found</td>';
      inwardDocumentsTable.appendChild(row);
      return;
    }
    filteredDocs.forEach(doc => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${doc.inward_number || 'N/A'}</td>
        <td>${doc.reference_number || 'N/A'}</td>
        <td>${doc.subject || 'N/A'}</td>
        <td>${doc.subtopic || 'N/A'}</td>
        <td>${doc.sender_name || 'N/A'}</td>
        <td>${doc.sender_type || 'N/A'}</td>
        <td class="text-center">
          <input type="checkbox" name="inward-id" value="${doc.id}" class="inward-checkbox" ${isReplySelect.value === 'yes' ? '' : 'disabled'}>
        </td>
      `;
      inwardDocumentsTable.appendChild(row);
    });
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  const debouncedFilterInwardDocuments = debounce(filterInwardDocuments, 300);
  const debouncedFilterCCEmployees = debounce(filterCCEmployees, 300);

  async function handlePincode() {
    const pincodeValue = pincodeInput.value;
    if (pincodeValue.length === 6 && /^\d{6}$/.test(pincodeValue)) {
      try {
        const response = await fetch(`/api/pincode?pincode=${pincodeValue}`);
        const data = await response.json();
        if (data.Status === 'Success' && data.PostOffice && data.PostOffice.length > 0) {
          const postOffice = data.PostOffice[0];
          cityInput.value = postOffice.District || '';
          const stateValue = postOffice.State || '';
          if (stateChoices) stateChoices.setChoiceByValue(stateValue);
          countryInput.value = postOffice.Country || '';
          updateRegion();
        } else {
          cityInput.value = '';
          if (stateChoices) stateChoices.setChoiceByValue('');
          regionInput.value = '';
          countryInput.value = '';
        }
      } catch (error) {
        console.error('Error fetching pincode data:', error);
        cityInput.value = '';
        if (stateChoices) stateChoices.setChoiceByValue('');
        regionInput.value = '';
        countryInput.value = '';
      }
    } else {
      cityInput.value = '';
      if (stateChoices) stateChoices.setChoiceByValue('');
      regionInput.value = '';
      countryInput.value = '';
    }
  }

  async function handleAddSection() {
    addSectionMessage.style.display = 'none';
    addSectionSubmit.disabled = true;

    const divisionValue = divisionInput.value;
    const abbrValue = sectionAbbrInput.value.trim().toUpperCase();
    const nameValue = sectionNameInput.value.trim();

    if (!divisionValue) {
      addSectionMessage.textContent = 'Please select a Division first.';
      addSectionMessage.style.backgroundColor = '#f56565';
      addSectionMessage.style.display = 'block';
      addSectionSubmit.disabled = false;
      return;
    }

    if (!abbrValue || !nameValue) {
      addSectionMessage.textContent = 'Abbreviation and Name are required.';
      addSectionMessage.style.backgroundColor = '#f56565';
      addSectionMessage.style.display = 'block';
      addSectionSubmit.disabled = false;
      return;
    }

    try {
      const response = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ division: divisionValue, abbreviation: abbrValue, name: nameValue })
      });
      const result = await response.json();
      if (response.ok) {
        addSectionMessage.textContent = `Section ${nameValue} (${abbrValue}) added successfully!`;
        addSectionMessage.style.backgroundColor = '#48bb78';
        addSectionMessage.style.display = 'block';
        sectionAbbrInput.value = '';
        sectionNameInput.value = '';
        addSectionForm.style.display = 'none';
        loadSections(divisionValue);
      } else {
        throw new Error(result.message || 'Failed to add section');
      }
    } catch (error) {
      addSectionMessage.textContent = error.message;
      addSectionMessage.style.backgroundColor = '#f56565';
      addSectionMessage.style.display = 'block';
    } finally {
      addSectionSubmit.disabled = false;
    }
  }

  isReplySelect.addEventListener('change', toggleInwardTable);
  handleCheckboxSelection();
  handleCCSelectAll();
  handleCCCheckboxSelection();
  setupProcedureDropdowns();
  handleSenderSelection();

  inwardSearchInput.addEventListener('input', debouncedFilterInwardDocuments);
  ccSearchInput.addEventListener('input', debouncedFilterCCEmployees);

  divisionInput.addEventListener('change', () => {
    if (divisionInput.value) {
      loadSections(divisionInput.value);
    }
  });

  submissionTypeInput.addEventListener('change', () => {
    hardCopiesGroup.style.display = submissionTypeInput.value === 'Hard Copy' ? 'block' : 'none';
    hardCopiesInput.required = submissionTypeInput.value === 'Hard Copy';
  });

  pincodeInput.addEventListener('input', handlePincode);
  stateSelect.addEventListener('change', updateRegion);
  addSectionSubmit.addEventListener('click', handleAddSection);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form submit event triggered');
    submitBtn.disabled = true;
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';

    const selectedInward = document.querySelector('input[name="inward-id"]:checked');
    const inwardId = isReplySelect.value === 'yes' && selectedInward ? selectedInward.value : '';
    const selectedCCRecipients = Array.from(document.querySelectorAll('input[name="cc-recipient"]:checked')).map(checkbox => checkbox.value);

    console.log('Selected inwardId:', inwardId);
    console.log('Selected CC recipients (EmpCodes):', selectedCCRecipients);

    const procedureName = procedureDisplay.textContent.trim();
    const procedureParts = procedureInput.value.split(' > ').map(part => {
      const match = part.match(/^(.*?)(?:\s*\((.*?)\))?$/);
      return match ? match[2] || match[1] : part;
    }).filter(part => part.trim());

    console.log('Procedure input value:', procedureInput.value);
    console.log('Procedure parts:', procedureParts);

    const formData = new FormData();
    formData.append('inwardId', inwardId || '');
    formData.append('reference_number', outwardReferenceInput.value || '');
    formData.append('subject', subjectInput.value || '');
    formData.append('procedure_name', procedureName || '');
    formData.append('language', languageInput.value || '');
    formData.append('recipient', recipientInput.value || '');
    formData.append('organization', organizationInput.value || '');
    formData.append('pincode', pincodeInput.value || '');
    formData.append('city', cityInput.value || '');
    formData.append('state', stateSelect.value || '');
    formData.append('region', regionInput.value || '');
    formData.append('country', countryInput.value || '');
    formData.append('addressed_to', addressedToInput.value || '');
    formData.append('sender', senderInput.value || '');
    formData.append('division', divisionInput.value || '');
    formData.append('section', sectionInput.value || '');
    formData.append('procedures', procedureParts[0] || '');
    formData.append('topic', procedureParts[1] || '');
    formData.append('subtopic', procedureParts[2] || '');
    formData.append('date_sent', dateSentInput.value || '');
    formData.append('submission_type', submissionTypeInput.value || '');
    formData.append('cc_recipients', selectedCCRecipients.join(',') || '');
    if (submissionTypeInput.value === 'Hard Copy' && hardCopiesInput.value) {
      formData.append('hard_copies', hardCopiesInput.value);
    }
    if (documentInput.files.length > 0) {
      formData.append('document', documentInput.files[0]);
    }

    // Log form data for debugging
    const formDataEntries = {};
    for (let [key, value] of formData.entries()) {
      formDataEntries[key] = value instanceof File ? value.name : value;
    }
    console.log('Form data being sent:', formDataEntries);

    try {
      console.log('Sending POST /api/outward');
      const response = await fetch('/api/outward', {
        method: 'POST',
        body: formData
      });
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        throw new Error(`Invalid response format: ${await response.text()}`);
      }
      if (response.ok) {
        console.log('Submission successful:', result);
        successMessage.textContent = `Document submitted successfully! Outward Number: ${result.outwardNumber}`;
        successMessage.style.backgroundColor = '#48bb78';
        successMessage.style.display = 'block';
        form.reset();
        hardCopiesGroup.style.display = 'none';
        if (stateChoices) {
          stateChoices.setChoiceByValue('');
        } else {
          console.warn('stateChoices not initialized');
          stateSelect.value = '';
        }
        regionInput.value = '';
        if (isReplyChoices) {
          isReplyChoices.setChoiceByValue('no');
        } else {
          console.warn('isReplyChoices not initialized');
          isReplySelect.value = 'no';
        }
        if (senderChoices) {
          senderChoices.clearChoices();
          senderChoices.setChoices([], 'value', 'label', false);
        }
        toggleInwardTable();
        procedureSubjectInput.value = '';
        procedureTopicToggle.textContent = 'Select Topic';
        procedureTopicDropdown.innerHTML = '';
        procedureSubtopics.innerHTML = '';
        procedureDisplay.textContent = '';
        procedureInput.value = '';
        selectedProcedure = '';
        selectedTopic = '';
        selectedSubtopic = '';
        inwardDocumentsTable.innerHTML = '';
        ccSearchInput.value = '';
        ccSelectAllCheckbox.checked = false;
        ccEmployeesTable.innerHTML = '';
        divisionInput.value = '';
        sectionInput.innerHTML = '<option value="">Select Section</option>';
        loadInwardDocuments();
        loadCCEmployees();
        loadSenders();
      } else {
        throw new Error(result.message || `Submission failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Submission error:', error);
      errorMessage.textContent = `Error: ${error.message}`;
      errorMessage.style.backgroundColor = '#f56565';
      errorMessage.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
    }
  });

  loadDivisions();
  loadProcedures();
  loadInwardDocuments();
  loadCCEmployees();
  loadSenders();
  toggleInwardTable();
});z