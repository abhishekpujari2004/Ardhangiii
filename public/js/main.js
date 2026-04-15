const API_BASE_URL = window.location.origin && window.location.origin !== 'null'
  ? `${window.location.origin}/api`
  : '/api';

function checkLogin() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

function logout() {
  localStorage.removeItem('user');
  window.location.href = '/';
}

function showAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;

  document.body.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.remove();
  }, 5000);
}

async function fetchAPI(endpoint, method = 'GET', data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const url = `${API_BASE_URL}${endpoint}`;
    console.log('API request:', url, method, data);
    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'An error occurred while communicating with the server.');
    }

    return result;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

function initMobileNav() {
  const nav = document.querySelector('.main-nav');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.querySelectorAll('.nav-links a');

  if (!navToggle || !nav) return;

  navToggle.addEventListener('click', () => {
    nav.classList.toggle('open');
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
    });
  });
}

async function handleSignup() {
  const signupForm = document.getElementById('signupForm');
  if (!signupForm) return;

  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = {
      name: document.getElementById('name').value.trim(),
      gender: document.getElementById('gender').value,
      birthdate: document.getElementById('birthdate').value,
      religion: document.getElementById('religion').value.trim(),
      community: document.getElementById('community').value.trim(),
      country: document.getElementById('country').value.trim(),
      city: document.getElementById('city').value.trim(),
      email: document.getElementById('email').value.trim(),
      mobile: document.getElementById('mobile').value.trim(),
      password: document.getElementById('password').value,
      confirmPassword: document.getElementById('confirmPassword').value
    };

    try {
      const result = await fetchAPI('/signup', 'POST', formData);
      showAlert('Signup successful! Redirecting to members...', 'success');

      const loggedUser = {
        id: result.userId,
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        gender: formData.gender,
        city: formData.city,
        religion: formData.religion,
        surveyCompleted: false
      };

      localStorage.setItem('user', JSON.stringify(loggedUser));
      setTimeout(() => {
        window.location.href = '/members';
      }, 1400);
    } catch (error) {
      showAlert(error.message, 'error');
    }
  });
}

async function handleLogin() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = {
      emailOrMobile: document.getElementById('emailOrMobile').value.trim(),
      password: document.getElementById('password').value
    };

    try {
      const response = await fetchAPI('/login', 'POST', formData);
      localStorage.setItem('user', JSON.stringify(response.user));
      showAlert('Login successful! Redirecting to members...', 'success');
      setTimeout(() => {
        window.location.href = '/members';
      }, 1500);
    } catch (error) {
      showAlert(error.message, 'error');
    }
  });
}

async function handleFeedback() {
  const feedbackForm = document.getElementById('feedbackForm');
  if (!feedbackForm) return;

  feedbackForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      message: document.getElementById('message').value.trim()
    };

    try {
      await fetchAPI('/feedback', 'POST', formData);
      showAlert('Feedback submitted successfully! Thank you.', 'success');
      feedbackForm.reset();
    } catch (error) {
      showAlert(error.message, 'error');
    }
  });
}

async function loadMembers() {
  const membersContainer = document.getElementById('membersContainer');
  const loadingContainer = document.getElementById('loadingContainer');
  if (!membersContainer) return;

  try {
    const response = await fetchAPI('/users', 'GET');
    if (loadingContainer) {
      loadingContainer.style.display = 'none';
    }

    if (!response.users || response.users.length === 0) {
      membersContainer.innerHTML = `
        <div class="empty-state">
          <h2>No members yet</h2>
          <p>Be the first one to join our community.</p>
        </div>
      `;
      return;
    }

    membersContainer.innerHTML = response.users.map((user) => `
      <div class="member-card">
        <div class="member-card-header">
          <h3>${user.name}</h3>
          <span>${user.gender}</span>
        </div>
        <div class="member-card-body">
          <div class="member-info"><strong>City</strong> <span>${user.city}</span></div>
          <div class="member-info"><strong>Country</strong> <span>${user.country}</span></div>
          <div class="member-info"><strong>Religion</strong> <span>${user.religion}</span></div>
          <div class="member-info"><strong>Community</strong> <span>${user.community}</span></div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    if (loadingContainer) {
      loadingContainer.style.display = 'none';
    }
    membersContainer.innerHTML = `
      <div class="alert alert-error">
        Unable to load members: ${error.message}
      </div>
    `;
  }
}

function updateNavbar() {
  const user = checkLogin();
  const navRight = document.querySelector('.nav-right');
  if (!navRight) return;

  if (user) {
    navRight.innerHTML = `
      <span class="nav-greeting">Welcome, ${user.name}</span>
      <button class="logout-btn" type="button">Logout</button>
    `;
    const logoutButton = navRight.querySelector('.logout-btn');
    logoutButton.addEventListener('click', logout);
  } else {
    navRight.innerHTML = `
      <a class="nav-link-secondary" href="/login">Login</a>
      <a class="btn btn-small" href="/signup">Sign Up</a>
    `;
  }
}

function protectMembersPage() {
  const currentPage = window.location.pathname;
  const user = checkLogin();

  if (currentPage === '/members' && !user) {
    showAlert('Please login to view members.', 'error');
    setTimeout(() => {
      window.location.href = '/login';
    }, 1800);
  }
}

function initFaqToggle() {
  const faqItems = document.querySelectorAll('.faq-item');
  if (!faqItems.length) return;

  faqItems.forEach((item) => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    question.addEventListener('click', () => {
      answer.classList.toggle('open');
      item.classList.toggle('expanded');
    });
  });
}

function initPage() {
  initMobileNav();
  updateNavbar();
  protectMembersPage();
  handleSignup();
  handleLogin();
  handleFeedback();
  loadMembers();
  initFaqToggle();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}

