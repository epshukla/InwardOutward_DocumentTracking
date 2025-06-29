form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const senderWithinAerbValue = formData.get('senderWithinAerb') === 'true';
    const inwardTypeValue = formData.get('inwardType');
  //gvfdjn gvednhyf thus i would like to 
    // Clean up form data
    formData.delete('senderName');
    formData.delete('senderEmail');
    formData.delete('senderDivision');
    formData.delete('senderSection');
    formData.delete('senderType');
    formData.delete('pincode');
    formData.delete('city');
    formData.delete('state');
    formData.delete('region');
    formData.delete('country');
  
    if (senderWithinAerbValue) {
      formData.set('senderName', senderNameAerb.value);
      formData.set('senderEmail', senderEmailAerb.value);
      formData.set('senderDivision', senderDivision.value);
      formData.set('senderSection', senderSection.value);
      formData.set('senderType', 'CentralGovt');
      formData.set('pincode', '400094');
      formData.set('city', 'Mumbai');
      formData.set('state', 'Maharashtra');
      formData.set('region', 'B');
      formData.set('country', 'India');
    } else {
      formData.set('senderName', document.getElementById('sender-name-external').value);
      formData.set('senderEmail', document.getElementById('sender-email-external').value);
      formData.set('senderType', formData.get('senderType'));
      formData.set('pincode', formData.get('pincode') || '');
      formData.set('city', formData.get('city') || '');
      formData.set('state', formData.get('state') || '');
      formData.set('region', formData.get('region') || '');
      formData.set('country', formData.get('country') || '');
    }
  
    // Remove ackNumber from formData; backend handles it
    formData.delete('ackNumber');
  
    try {
      console.log('Submitting form data:', Object.fromEntries(formData));
      const response = await fetch('http://localhost:4000/api/inward-documents', {
        method: 'POST',
        body: formData,
      });
  
      let result;
      try {
        result = await response.json();
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        throw new Error('Invalid server response');
      }
  
      if (response.ok) {
        console.log('Form submission successful:', result);
        showSuccess(`${result.message} (Inward Number: ${result.inwardNumber}${result.ackNumber ? `, ACK: ${result.ackNumber}` : ''})`);
        form.reset();
        if (senderAerbSection) senderAerbSection.style.display = 'none';
        if (senderExternalSection) senderExternalSection.style.display = 'none';
        if (ackNumberGroup) {
          ackNumberGroup.style.display = 'none';
        } else {
          console.warn('ackNumberGroup element not found');
        }
        senderDivision.innerHTML = '<option value="">Select Division</option>';
        senderSection.innerHTML = '<option value="">Select Division First</option>';
        senderNameAerb.innerHTML = '<option value="">Select Division and Section First</option>';
        senderNameAerb.disabled = true;
        senderEmailAerb.value = '';
        receivingDivision.innerHTML = '<option value="">Select Division</option>';
        receivingSection.innerHTML = '<option value="">Select Division First</option>';
        receiverSelect.innerHTML = '<option value="">Select Division and Section First</option>';
        receiverSelect.disabled = true;
        nextActionBySelect.innerHTML = '<option value="">Select Employee</option>';
        nextActionBySelect.disabled = false;
        processSelect.innerHTML = '<option value="">Select Site First</option>';
        processSelect.disabled = true;
        siteSelect.innerHTML = '<option value="">Select Section First</option>';
        siteSelect.disabled = true;
        stateSelect.innerHTML = '<option value="">Select State</option>';
        loadStatesRegions();
        loadDivisions(senderDivision);
        loadDivisions(receivingDivision);
        loadAllEmployees(nextActionBySelect);
        senderWithinAerb.value = 'true';
        toggleSenderSections();
        loadAckNumber();
      } else {
        console.error('Form submission failed:', result);
        showError(result.message || `Server error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Network error during form submission:', error.message, error.stack);
      showError(`Failed to submit form: ${error.message}`);
    }
  });