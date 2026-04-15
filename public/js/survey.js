// Survey Form Handler
function initSurveyForm() {
  const surveyForm = document.getElementById('surveyForm');
  if (!surveyForm) return;

  // Get user ID from localStorage
  let newUserId = localStorage.getItem('newUserId');
  if (!newUserId) {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        newUserId = user?.id;
      } catch (err) {
        newUserId = null;
      }
    }
  }

  if (!newUserId) {
    window.location.href = '/signup';
    return;
  }

  // Track form progress
  function updateProgress() {
    const inputs = surveyForm.querySelectorAll('input, select, textarea');
    let filledCount = 0;

    inputs.forEach(input => {
      if (input.type === 'checkbox' || input.type === 'radio') {
        // For checkboxes and radios, count if any in group is checked
        const group = surveyForm.querySelectorAll(`[name="${input.name}"]`);
        if (Array.from(group).some(el => el.checked)) {
          filledCount++;
        }
      } else if (input.value.trim()) {
        filledCount++;
      }
    });

    const progress = Math.round((filledCount / inputs.length) * 100);
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('progressText').textContent = progress + '%';
  }

  // Update progress on input change
  surveyForm.addEventListener('change', updateProgress);
  surveyForm.addEventListener('input', updateProgress);

  // Handle form submission
  surveyForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Collect form data
    const dietCheckboxes = Array.from(surveyForm.querySelectorAll('input[name="diet"]:checked')).map(cb => cb.value);
    const interestsCheckboxes = Array.from(surveyForm.querySelectorAll('input[name="interests"]:checked')).map(cb => cb.value);
    const religionPrefCheckboxes = Array.from(surveyForm.querySelectorAll('input[name="religionPref"]:checked')).map(cb => cb.value);

    // Parse hobbies
    const hobbiesInput = document.getElementById('hobbies').value;
    const hobbiesArray = hobbiesInput ? hobbiesInput.split(',').map(h => h.trim()) : [];

    // Parse location preferences
    const locationInput = document.getElementById('locationPref').value;
    const locationArray = locationInput ? locationInput.split(',').map(l => l.trim()) : [];

    const surveyData = {
      userId: newUserId,
      height: document.getElementById('height').value,
      diet: dietCheckboxes,
      qualification: document.getElementById('qualification').value,
      collegeName: document.getElementById('collegeName').value,
      income: document.getElementById('income').value,
      hobbies: hobbiesArray,
      profession: document.getElementById('profession').value,
      workDetails: {
        sector: document.getElementById('workSector').value,
        type: document.getElementById('workSector').value
      },
      agePreference: {
        min: parseInt(document.getElementById('ageMin').value),
        max: parseInt(document.getElementById('ageMax').value)
      },
      religionPreference: religionPrefCheckboxes,
      locationPreference: locationArray,
      interests: interestsCheckboxes,
      lifestyle: {
        smoking: document.querySelector('input[name="smoking"]:checked')?.value || '',
        drinking: document.querySelector('input[name="drinking"]:checked')?.value || '',
        caste: ''
      }
    };

    try {
      // Validate required fields
      if (!surveyData.height || !surveyData.qualification || !surveyData.profession || !surveyData.income) {
        showAlert('Please fill all required fields', 'error');
        return;
      }

      if (surveyData.diet.length === 0) {
        showAlert('Please select at least one diet preference', 'error');
        return;
      }

      if (surveyData.interests.length === 0) {
        showAlert('Please select at least one interest', 'error');
        return;
      }

      if (!surveyData.lifestyle.smoking || !surveyData.lifestyle.drinking) {
        showAlert('Please answer all lifestyle questions', 'error');
        return;
      }

      // Submit survey
      await fetchAPI('/survey', 'POST', surveyData);
      
      showAlert('Profile completed successfully! Redirecting to matches...', 'success');
      
      // Clear temporary storage
      const userInfo = JSON.parse(localStorage.getItem('tempUser') || '{}');
      localStorage.removeItem('newUserId');
      localStorage.removeItem('tempUser');
      
      // Preserve existing logged-in user data if present
      const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({
        id: newUserId,
        name: userInfo.name || existingUser.name || '',
        email: userInfo.email || existingUser.email || '',
        mobile: existingUser.mobile || userInfo.mobile || '',
        gender: existingUser.gender || userInfo.gender || '',
        city: existingUser.city || userInfo.city || '',
        religion: existingUser.religion || userInfo.religion || '',
        surveyCompleted: true
      }));

      setTimeout(() => {
        window.location.href = '/members';
      }, 1800);
    } catch (error) {
      showAlert(error.message, 'error');
    }
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initSurveyForm();
});
