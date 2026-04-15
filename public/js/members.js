// Tinder-Style Members Page JavaScript

let currentUser = null;
let matches = [];
let currentCardIndex = 0;
let profilesReviewed = 0;
let likesSent = 0;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initMobileNav();
  
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    window.location.href = '/login';
    return;
  }

  currentUser = JSON.parse(userStr);

  // Load registered members and matches
  await loadRegisteredMembers();
  await loadMatches();
});

// Load registered members list
async function loadRegisteredMembers() {
  const container = document.getElementById('registeredMembers');
  if (!container) return;

  try {
    const response = await fetchAPI('/users', 'GET');
    const users = (response.users || []).filter(user => user._id !== currentUser.id);

    if (users.length === 0) {
      container.innerHTML = `<div class="no-profiles"><p>No other registered users yet.</p></div>`;
      return;
    }

    container.innerHTML = users.map(user => `
      <div class="member-tile">
        <div>
          <strong>${user.name}</strong>
          <span>${user.gender}</span>
        </div>
        <div>${user.city}, ${user.country}</div>
        <div>${user.religion} · ${user.community}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading registered members:', error);
    container.innerHTML = `<div class="alert alert-error">Unable to load registered users.</div>`;
  }
}

// Load matched profiles
async function loadMatches() {
  try {
    document.getElementById('loadingState').style.display = 'flex';
    
    const result = await fetchAPI(`/matches/${currentUser.id}`);
    matches = result.matches || [];

    if (matches.length === 0) {
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('noMoreProfiles').style.display = 'flex';
      return;
    }

    renderCards();
    document.getElementById('loadingState').style.display = 'none';
  } catch (error) {
    console.error('Error loading matches:', error);
    showAlert('Error loading profiles', 'error');
    document.getElementById('loadingState').style.display = 'none';
  }
}

// Render card stack
function renderCards() {
  const cardsStack = document.getElementById('cardsStack');
  cardsStack.innerHTML = '';

  // Show top 5 cards
  const cardsToShow = matches.slice(currentCardIndex, currentCardIndex + 5);

  cardsToShow.forEach((match, index) => {
    const card = createCard(match, index);
    cardsStack.appendChild(card);

    if (index === 0) {
      makeCardDraggable(card);
    }
  });

  updateStats();
}

// Create card element
function createCard(match, index) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.zIndex = 100 - index;

  const user = match.user;
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
  
  // Randomize background color
  const colors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
  ];
  const bgColor = colors[index % colors.length];

  const age = user.birthdate ? new Date().getFullYear() - new Date(user.birthdate).getFullYear() : '';
  
  card.innerHTML = `
    <div class="card-content" style="background: ${bgColor};">
      <div class="card-image">${initials}</div>
      <div class="card-info">
        <div class="card-header">
          <div class="card-title">${user.name}, ${age}</div>
          <div class="card-subtitle">📍 ${user.city}, ${user.country}</div>
          ${match.compatibility ? `<span class="card-compatibility">💯 ${match.compatibility}% Match</span>` : ''}
        </div>
        <div class="card-details">
          <strong>Religion:</strong> ${user.religion} (${user.community})<br>
          <strong>Profession:</strong> ${user.gender === 'Male' ? user.name : user.name}<br>
        </div>
        ${match.user?.interests?.length > 0 ? `
          <div class="card-interests">
            ${match.user.interests.slice(0, 3).map(interest => `
              <span class="interest-tag">${interest}</span>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;

  return card;
}

// Make card draggable
function makeCardDraggable(card) {
  let startX = 0;
  let currentX = 0;
  let isDragging = false;

  // Mouse events
  card.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    currentX = e.clientX - startX;
    updateCardPosition(card, currentX);
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    handleCardSwipe(currentX);
    currentX = 0;
  });

  // Touch events
  card.addEventListener('touchstart', (e) => {
    isDragging = true;
    startX = e.touches[0].clientX;
  });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentX = e.touches[0].clientX - startX;
    updateCardPosition(card, currentX);
  });

  document.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    handleCardSwipe(currentX);
    currentX = 0;
  });
}

// Update card visual position during drag
function updateCardPosition(card, offsetX) {
  const rotation = (offsetX / window.innerWidth) * 25;
  card.style.transform = `translateX(${offsetX}px) rotate(${rotation}deg)`;
  card.style.opacity = 1 - Math.abs(offsetX) / (window.innerWidth * 0.6);
}

// Handle card swipe
function handleCardSwipe(offsetX) {
  const card = document.querySelector('.card');
  if (!card) return;

  const threshold = window.innerWidth * 0.3;

  if (offsetX > threshold) {
    // Swiped right - like
    likeCurrentProfile();
  } else if (offsetX < -threshold) {
    // Swiped left - skip
    skipCurrentProfile();
  } else {
    // Not swiped far enough - reset
    card.style.transform = 'translateX(0) rotate(0deg)';
    card.style.opacity = '1';
  }
}

// Skip profile
async function skipProfile() {
  const card = document.querySelector('.card');
  if (!card) return;

  card.classList.add('swiping-left');
  setTimeout(() => {
    currentCardIndex++;
    profilesReviewed++;
    
    if (currentCardIndex >= matches.length) {
      document.getElementById('noMoreProfiles').style.display = 'flex';
      document.getElementById('cardsStack').style.display = 'none';
    } else {
      renderCards();
    }
  }, 500);
}

// Skip from button
function skipProfile() {
  skipCurrentProfile();
}

function skipCurrentProfile() {
  const card = document.querySelector('.card');
  if (!card) return;

  card.classList.add('swiping-left');
  setTimeout(() => {
    currentCardIndex++;
    profilesReviewed++;
    
    if (currentCardIndex >= matches.length) {
      document.getElementById('noMoreProfiles').style.display = 'flex';
      document.getElementById('cardsStack').style.display = 'none';
    } else {
      renderCards();
    }
  }, 500);
}

// Like profile
async function likeProfile() {
  const currentMatch = matches[currentCardIndex];
  if (!currentMatch) return;

  try {
    const card = document.querySelector('.card');
    card.classList.add('swiping-right');

    const result = await fetchAPI('/like', 'POST', {
      likerId: currentUser.id,
      likedId: currentMatch.user._id
    });

    if (result.matched) {
      showAlert('🎉 You matched! You can now chat', 'success');
    } else {
      showAlert('❤️ Like sent!', 'success');
    }

    setTimeout(() => {
      currentCardIndex++;
      likesSent++;
      profilesReviewed++;
      
      if (currentCardIndex >= matches.length) {
        document.getElementById('noMoreProfiles').style.display = 'flex';
        document.getElementById('cardsStack').style.display = 'none';
      } else {
        renderCards();
      }
    }, 500);
  } catch (error) {
    console.error('Error liking profile:', error);
    showAlert('Error sending like', 'error');
  }
}

// Super like profile
async function superlikeProfile() {
  // Same as likeProfile but with special effect
  likeProfile(); // For now, treat as regular like
}

// Update statistics
function updateStats() {
  document.getElementById('profilesReviewed').textContent = profilesReviewed;
  document.getElementById('likesSent').textContent = likesSent;
}
