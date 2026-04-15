// Chat Page JavaScript

let currentUser = null;
let userMatches = [];
let currentMatch = null;
let currentMessages = [];
let messageRefreshInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initMobileNav();

  const userStr = localStorage.getItem('user');
  if (!userStr) {
    window.location.href = '/login';
    return;
  }

  currentUser = JSON.parse(userStr);

  // Load user matches
  await loadUserMatches();

  // Set up auto-refresh for messages
  messageRefreshInterval = setInterval(() => {
    if (currentMatch) {
      loadMessages();
    }
  }, 3000);
});

// Load user matches
async function loadUserMatches() {
  try {
    const result = await fetchAPI(`/user-matches/${currentUser.id}`);
    userMatches = result.matches || [];

    renderMatchesList();

    if (userMatches.length > 0) {
      selectMatch(userMatches[0]);
    }
  } catch (error) {
    console.error('Error loading matches:', error);
    showAlert('Error loading matches', 'error');
  }
}

// Render matches list
function renderMatchesList() {
  const matchesList = document.getElementById('matchesList');

  if (userMatches.length === 0) {
    matchesList.innerHTML = `
      <div class="empty-state">
        <p>No matches yet</p>
        <a href="/members" class="btn">Find Matches</a>
      </div>
    `;
    return;
  }

  matchesList.innerHTML = userMatches.map(match => {
    const otherUser = match.user1._id === currentUser.id ? match.user2 : match.user1;
    const initials = otherUser.name.split(' ').map(n => n[0]).join('').toUpperCase();

    return `
      <div class="match-item ${currentMatch?._id === match._id ? 'active' : ''}" onclick="selectMatch({...match, otherUser: '${JSON.stringify(otherUser).replace(/"/g, '&quot;')}', _id: '${match._id}'})">
        <div class="match-avatar">${initials}</div>
        <div class="match-details">
          <div class="match-name">${otherUser.name}</div>
          <div class="match-preview">Tap to message</div>
        </div>
      </div>
    `;
  }).join('');
}

// Select a match
async function selectMatch(match) {
  // Parse otherUser if it's a string
  if (typeof match.otherUser === 'string') {
    match.otherUser = JSON.parse(match.otherUser);
  }

  currentMatch = match;
  
  // Update UI
  const matchId = match._id;
  document.querySelectorAll('.match-item').forEach(item => {
    item.classList.remove('active');
  });
  event.target.closest('.match-item').classList.add('active');

  // Show chat window
  document.getElementById('noChat').style.display = 'none';
  document.getElementById('chatActive').style.display = 'flex';

  // Update chat header
  document.getElementById('chatName').textContent = match.otherUser.name;
  document.getElementById('chatStatus').textContent = 'Online';

  // Load messages
  await loadMessages();

  // Focus input
  document.getElementById('messageInput').focus();
}

// Load messages
async function loadMessages() {
  if (!currentMatch) return;

  try {
    const result = await fetchAPI(`/messages/${currentMatch._id}`);
    currentMessages = result.messages || [];

    renderMessages();

    // Mark messages as read
    await fetchAPI('/messages-read', 'POST', {
      matchId: currentMatch._id,
      receiverId: currentUser.id
    });
  } catch (error) {
    console.error('Error loading messages:', error);
  }
}

// Render messages
function renderMessages() {
  const messagesArea = document.getElementById('messagesArea');
  
  if (currentMessages.length === 0) {
    messagesArea.innerHTML = `
      <div style="text-align: center; color: #999; padding: 2rem;">
        <p>No messages yet. Say hello! 👋</p>
      </div>
    `;
    return;
  }

  messagesArea.innerHTML = currentMessages.map(msg => {
    const isSent = msg.senderId._id === currentUser.id || msg.senderId === currentUser.id;
    const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="message ${isSent ? 'sent' : 'received'}">
        <div>
          <div class="message-content">${escapeHtml(msg.message)}</div>
          <div class="message-time">${time}</div>
        </div>
      </div>
    `;
  }).join('');

  // Scroll to bottom
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Send message
async function sendMessage() {
  if (!currentMatch) return;

  const input = document.getElementById('messageInput');
  const message = input.value.trim();

  if (!message) return;

  try {
    const result = await fetchAPI('/message', 'POST', {
      senderId: currentUser.id,
      receiverId: currentMatch.otherUser._id,
      matchId: currentMatch._id,
      message
    });

    // Clear input
    input.value = '';

    // Add message to current messages
    currentMessages.push(result.msg);
    renderMessages();

    showAlert('Message sent! ✓', 'success');
  } catch (error) {
    console.error('Error sending message:', error);
    showAlert('Error sending message', 'error');
  }
}

// Allow sending message with Enter key
document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && e.target.id === 'messageInput') {
    e.preventDefault();
    sendMessage();
  }
});

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Clean up interval on page unload
window.addEventListener('beforeunload', () => {
  if (messageRefreshInterval) {
    clearInterval(messageRefreshInterval);
  }
});
