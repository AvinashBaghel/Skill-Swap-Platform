// =====================================================================
//  SkillSwap — Profile Page Script
//  Supports:
//   - Full-page hero layout for other users' profiles
//   - Sidebar + requests panel for own profile
//   - Python/Flask backend with localStorage fallback
// =====================================================================

const API_BASE = 'http://localhost:5000/api';

// ── Static seed data (fallback when backend is offline) ──────────────
const userData = {
  jake:  { name:'Jake Morrison',   initials:'JM', title:'Professional Musician & Composer',     rating:'4.9', students:'34', location:'Austin, TX',   bio:"I've been playing guitar for 15 years and touring with bands for 5. I love breaking down complex theory into simple, practical chunks.", offered:['Guitar Playing','Music Theory','Songwriting'],        wanted:['Web Design','Video Editing'],         greeting:'Hey there! Ready to jam and share some web design tips?',                    availability:{days:['Mon','Wed','Fri'],from:'10:00',to:'17:00',timezone:'EST (UTC-5)'} },
  sara:  { name:'Sara Reyes',      initials:'SR', title:'Senior Frontend Developer',             rating:'4.8', students:'52', location:'Remote',        bio:'Passionate about React, CSS, and creating beautiful, accessible interfaces. Happy to help beginners land their first tech job!',       offered:['Web Development','CSS Animation','React'],            wanted:['Spanish','Cooking'],                  greeting:"Hi! Let's hook up some Spanish lessons for React debugging!",                availability:{days:['Mon','Tue','Wed','Thu','Fri'],from:'09:00',to:'18:00',timezone:'PST (UTC-8)'} },
  maria: { name:'Maria Cruz',      initials:'MC', title:'Native Spanish Speaker & Educator',    rating:'4.7', students:'20', location:'Madrid, ES',    bio:'I teach conversational Spanish with an emphasis on local idioms and culture. Looking to learn photography for my travel blog.',         offered:['Spanish Language','Literature'],                       wanted:['Photography','Photo Editing'],        greeting:'Hola! So excited to exchange languages and skills.',                         availability:{days:['Tue','Thu','Sat'],from:'14:00',to:'20:00',timezone:'CET (UTC+1)'} }
};

// ── Helpers ───────────────────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
    const currentUserId = localStorage.getItem('currentUser') || '';
    const { headers: extraHeaders, ...restOpts } = opts;
    const res = await fetch(API_BASE + path, {
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': currentUserId,
        ...(extraHeaders || {})
      },
      signal: controller.signal,
      ...restOpts
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch {
    return null;   // backend offline → callers fall back to localStorage
  }
}

function formatTime12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function getTimeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}

function showToast(msg = 'Saved!') {
  const t = document.createElement('div');
  t.className = 'save-toast';
  t.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><polyline points="20 6 9 17 4 12"></polyline></svg> ${msg}`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2500);
}

async function checkAcceptedSwap(userA, userB) {
  // Returns the active request object if found, or null
  // 1. Try backend active-session endpoint
  try {
    const session = await apiFetch(`/requests/active-session?userA=${userA}&userB=${userB}`);
    if (session && session.active) return session.request;
  } catch (_) { /* backend offline */ }

  // 2. Fallback: check all requests
  try {
    const dataA = await apiFetch(`/requests?userId=${userA}`);
    if (dataA) {
      const allReqs = [...(dataA.received || []), ...(dataA.sent || [])];
      const accepted = allReqs.find(r =>
        r.status === 'accepted' &&
        ((r.from === userA && r.to === userB) || (r.from === userB && r.to === userA))
      );
      if (accepted) return accepted;
    }
  } catch (_) { /* backend offline */ }

  // 3. Fallback: localStorage
  const localReqs = JSON.parse(localStorage.getItem('skillSwapRequests') || '[]');
  const local = localReqs.find(r =>
    r.status === 'accepted' &&
    ((r.from === userA && r.to === userB) || (r.from === userB && r.to === userA))
  );
  return local || null;
}

// ─────────────────────────────────────────────────────────────────────
//  MAIN — runs after DOM is ready
// ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const params      = new URLSearchParams(window.location.search);
  const userId      = params.get('user');
  const currentUser = localStorage.getItem('currentUser');

  // Auth-aware header
  const headerActions = document.querySelector('.header__actions');
  if (currentUser && headerActions) {
    headerActions.innerHTML = `
      <a href="profile.html?user=${currentUser}" class="btn btn--outline" id="my-profile-btn"
         style="border-color:transparent;background:var(--clr-blue-light);color:var(--clr-blue);">My Profile</a>
      <a href="#" id="logout-btn" class="btn btn--primary" style="background:#ef4444;box-shadow:none;">Logout</a>`;
    document.getElementById('logout-btn').addEventListener('click', e => {
      e.preventDefault();
      localStorage.removeItem('currentUser');
      window.location.href = 'index.html';
    });
  }

  // Try fetching user from backend, fall back to seed + localStorage
  let allUsers = { ...userData };
  const backendUsers = await apiFetch('/users');
  if (backendUsers) {
    backendUsers.forEach(u => { allUsers[u.id] = u; });
  }
  // Always merge localStorage users so newly signed-up users are found
  // even if the backend fetch failed (CORS, timeout, etc.)
  const localUsers = JSON.parse(localStorage.getItem('skillSwapUsers') || '{}');
  Object.keys(localUsers).forEach(uid => {
    if (!allUsers[uid]) allUsers[uid] = localUsers[uid];
  });

  if (!userId || !allUsers[userId]) {
    document.querySelector('.profile-hero')?.remove();
    document.body.innerHTML += `
      <div style="text-align:center;padding:160px 24px;">
        <div style="font-size:4rem;margin-bottom:16px;">🔍</div>
        <h2 style="font-size:1.8rem;margin-bottom:8px;">User Not Found</h2>
        <p style="color:var(--clr-text-light);margin-bottom:24px;">The profile you're looking for doesn't exist.</p>
        <a href="skills.html" class="btn btn--primary">Browse Skills</a>
      </div>`;
    return;
  }

  const user        = allUsers[userId];
  const isOwnProfile = userId === currentUser;

  // ================================================================
  //  UNIFIED FULL-PAGE PROFILE
  // ================================================================
  document.getElementById('view-other').style.display = 'block';
  await populateFullPageProfile(user, userId, currentUser, allUsers, isOwnProfile);

  if (isOwnProfile) {
    document.getElementById('requests-section').style.display = 'block';
    initRequests(userId, allUsers);
  }

  // ── Shared modal close handlers ──────────────────────────────────
  const editModal = document.getElementById('edit-modal');
  document.getElementById('edit-modal-close').addEventListener('click', () => editModal.classList.remove('active'));
  document.getElementById('edit-cancel-btn').addEventListener('click', () => editModal.classList.remove('active'));
  editModal.addEventListener('click', e => { if (e.target === editModal) editModal.classList.remove('active'); });

  const reqModal = document.getElementById('request-modal');
  document.getElementById('request-modal-close').addEventListener('click', () => reqModal.classList.remove('active'));
  document.getElementById('req-cancel-btn').addEventListener('click', () => reqModal.classList.remove('active'));
  reqModal.addEventListener('click', e => { if (e.target === reqModal) reqModal.classList.remove('active'); });

  // Feedback modal close handlers
  const fbModal = document.getElementById('feedback-modal');
  if (fbModal) {
    document.getElementById('feedback-modal-close').addEventListener('click', () => fbModal.classList.remove('active'));
    document.getElementById('feedback-cancel-btn').addEventListener('click', () => fbModal.classList.remove('active'));
    fbModal.addEventListener('click', e => { if (e.target === fbModal) fbModal.classList.remove('active'); });
  }
});

// ─────────────────────────────────────────────────────────────────────
//  UNIFIED FULL-PAGE PROFILE BUILDER
// ─────────────────────────────────────────────────────────────────────
async function populateFullPageProfile(user, userId, currentUser, allUsers, isOwnProfile) {
  // Hero
  document.getElementById('hero-avatar').textContent  = user.initials || '??';
  document.getElementById('hero-name').textContent    = user.name;
  document.getElementById('hero-title').textContent   = user.title;
  document.getElementById('hero-badges').innerHTML    =
    (user.offered || []).slice(0, 4).map(s => `<span class="profile-hero__badge">✦ ${s}</span>`).join('');

  // Stats
  document.getElementById('fp-rating').textContent    = user.rating    || '—';
  document.getElementById('fp-exchanges').textContent = user.students  || '0';
  document.getElementById('fp-location').textContent  = user.location  || '—';
  document.getElementById('fp-bio').textContent       = user.bio       || 'No bio yet.';

  // Skills offered
  const offeredEl = document.getElementById('fp-offered');
  offeredEl.innerHTML = (user.offered && user.offered.length)
    ? user.offered.map(s => `<span class="ptag ptag--offered">${s}</span>`).join('')
    : '<p style="font-size:.85rem;color:var(--clr-text-light);">None added yet</p>';

  // Skills wanted
  const wantedEl = document.getElementById('fp-wanted');
  wantedEl.innerHTML = (user.wanted && user.wanted.length)
    ? user.wanted.map(s => `<span class="ptag ptag--wanted">${s}</span>`).join('')
    : '<p style="font-size:.85rem;color:var(--clr-text-light);">None added yet</p>';

  // Availability
  renderAvailabilityFull(user, 'fp-availability');

  // Greeting & chat
  document.getElementById('fp-greeting').textContent    = user.greeting || `Hi! I'm ${user.name.split(' ')[0]}.`;
  document.getElementById('chat-header-name').textContent = user.name;
  document.getElementById('chat-toggle-name').textContent  = user.name.split(' ')[0];

  // Actions specific to Own Profile vs Visitor Profile
  const sendReqArea = document.getElementById('fp-send-request-area');
  const chatCard    = document.getElementById('fp-chat-card');

  // Clear previous buttons to avoid duplicates on re-render
  sendReqArea.innerHTML = '';

  if (isOwnProfile) {
    // Hide chat card, own profiles don't chat with themselves
    if (chatCard) chatCard.style.display = 'none';

    // Show Edit Profile button in left column
    const editBtn  = document.createElement('button');
    editBtn.className = 'btn btn--outline btn--full edit-profile-trigger';
    editBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right:6px"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Edit Profile`;
    editBtn.addEventListener('click', () => openEditModal(user, userId, allUsers));
    sendReqArea.appendChild(editBtn);

  } else if (currentUser) {
    // Visitor is logged in — check session state
    const activeReq = await checkAcceptedSwap(currentUser, userId);

    if (activeReq) {
      // ── ACTIVE SESSION — block new requests, show session badge ──
      sendReqArea.innerHTML = `
        <div style="padding:14px;background:linear-gradient(135deg,#fef3c7,#d1fae5);color:#92400e;border-radius:var(--radius-md);text-align:center;font-weight:600;font-size:0.9rem;border:1px solid #fbbf24;animation:fadeInScale .4s ease both;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="vertical-align:text-bottom;margin-right:4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          Active Session In Progress
          <p style="font-size:.78rem;font-weight:400;color:#78716c;margin:6px 0 0;">Complete this session & give feedback before starting a new one.</p>
        </div>`;

      // Chat toggle — unlocked for active session
      const chatToggleBtn = document.getElementById('chat-toggle-btn');
      if (chatToggleBtn) {
        chatToggleBtn.style.display = 'flex';
        initChatPopup(user, chatToggleBtn);
      }

    } else {
      // ── No active session — check for pending requests ──
      let alreadySent = false;
      try {
        const reqData = await apiFetch(`/requests?userId=${currentUser}`);
        if (reqData) {
          const allReqs = [...(reqData.sent || []), ...(reqData.received || [])];
          alreadySent = allReqs.some(r =>
            r.status === 'pending' &&
            ((r.from === currentUser && r.to === userId) || (r.from === userId && r.to === currentUser))
          );
        }
      } catch (_) {}
      // Fallback: localStorage
      if (!alreadySent) {
        const localReqs = JSON.parse(localStorage.getItem('skillSwapRequests') || '[]');
        alreadySent = localReqs.some(r => r.from === currentUser && r.to === userId && r.status === 'pending');
      }

      if (alreadySent) {
        sendReqArea.innerHTML = `
          <div class="request-status-badge request-status-badge--sent" style="padding:12px;background:#eff6ff;color:#2563eb;border-radius:var(--radius-md);text-align:center;font-weight:500;font-size:0.9rem;border:1px solid #bfdbfe;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:text-bottom;margin-right:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Request Already Sent
          </div>`;
      } else {
        const sendBtn = document.createElement('button');
        sendBtn.className = 'btn btn--primary btn--full send-request-btn';
        sendBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="margin-right:6px"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg> Send Skill Exchange Request`;
        sendBtn.addEventListener('click', () => openRequestModal(user, currentUser, userId, allUsers, sendBtn, sendReqArea));
        sendReqArea.appendChild(sendBtn);
      }

      // Chat toggle — locked (no active session)
      const chatToggleBtn = document.getElementById('chat-toggle-btn');
      if (chatToggleBtn) {
        chatToggleBtn.style.display = 'flex';
        chatToggleBtn.style.opacity = '0.6';
        chatToggleBtn.style.cursor  = 'not-allowed';
        chatToggleBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0110 0v4"></path>
          </svg>
          <span>Chat Locked</span>`;
        chatToggleBtn.addEventListener('click', (e) => {
          e.preventDefault();
          showToast('Accept a swap request to unlock chat');
        });
      }
    }
  }
}

function renderAvailabilityFull(user, elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!user.availability || !user.availability.days || !user.availability.days.length) {
    el.innerHTML = '<p style="font-size:.85rem;color:var(--clr-text-light);">Not set yet</p>';
    return;
  }
  const allDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const chips   = allDays.map(d => {
    const on = user.availability.days.includes(d);
    return `<span class="avail-chip ${on ? 'avail-chip--on' : ''}">${d}</span>`;
  }).join('');
  const from = formatTime12(user.availability.from);
  const to   = formatTime12(user.availability.to);
  const tz   = user.availability.timezone || '';
  el.innerHTML = `
    <div class="avail-chips">${chips}</div>
    <div class="avail-time-row">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <span>${from} – ${to}</span>
      <span style="color:var(--clr-text-light);font-size:.75rem;">${tz}</span>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────
//  CHAT POPUP — Powered by Supabase Real-Time
// ─────────────────────────────────────────────────────────────────────
function initChatPopup(user, toggleBtn) {
  const chatSection   = document.getElementById('chat-section');
  const chatMessages  = document.getElementById('chat-messages');
  const chatForm      = document.getElementById('chat-form');
  const chatInput     = document.getElementById('chat-input');
  const closeBtn      = document.getElementById('close-chat-btn');
  const currentUser   = localStorage.getItem('currentUser');
  const otherUserId   = user.id || new URLSearchParams(window.location.search).get('user');

  // Track rendered message IDs to avoid duplicates
  const renderedIds = new Set();
  let pollTimer = null;   // polling interval reference

  // ── Poll for new messages every 3 seconds ─────────────────────────
  function startPolling() {
    if (pollTimer) return; // already polling
    pollTimer = setInterval(async () => {
      try {
        const msgs = await fetchMessages(currentUser, otherUserId);
        msgs.forEach(msg => {
          if (renderedIds.has(msg.id)) return;
          const type = msg.sender_id === currentUser ? 'sent' : 'received';
          appendMsg(msg.message, type, msg.id, msg.created_at);
        });
      } catch (err) {
        console.warn('[Chat] Polling error:', err);
      }
    }, 3000);
    console.log('[Chat] Polling started');
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
      console.log('[Chat] Polling stopped');
    }
  }

  // ── Open chat: load history + subscribe + poll ────────────────────
  async function openChat() {
    chatSection.style.transform = 'translateY(0) scale(1)';
    chatSection.style.opacity   = '1';

    if (!chatSection.hasAttribute('data-init')) {
      chatSection.setAttribute('data-init', '1');
      chatMessages.innerHTML = `
        <div class="loading-overlay">
          <div class="spinner spinner--dark spinner--lg"></div>
          <span class="loading-overlay__text">Loading messages<span class="dots-anim"></span></span>
        </div>`;

      // 1. Fetch message history
      const history = await fetchMessages(currentUser, otherUserId);

      chatMessages.innerHTML = '';

      if (history.length === 0) {
        // Show empty state — no pre-filled messages
        chatMessages.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;color:var(--clr-text-light,#94a3b8);text-align:center;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36" style="margin-bottom:12px;opacity:0.5;">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"></path>
            </svg>
            <p style="font-size:0.85rem;margin:0;">No messages yet. Say hello!</p>
          </div>`;
      } else {
        // Render all past messages
        history.forEach(msg => {
          const type = msg.sender_id === currentUser ? 'sent' : 'received';
          appendMsg(msg.message, type, msg.id, msg.created_at);
        });
      }

      // 2. Subscribe to real-time new messages (Supabase)
      subscribeToChat(currentUser, otherUserId, (newMsg) => {
        // Don't render if we already showed this message
        if (renderedIds.has(newMsg.id)) return;

        const type = newMsg.sender_id === currentUser ? 'sent' : 'received';
        appendMsg(newMsg.message, type, newMsg.id, newMsg.created_at);
      });
    }

    // 3. Start polling for new messages (works as fallback for real-time)
    startPolling();
  }

  // ── Close chat ─────────────────────────────────────────────────────
  function closeChat() {
    chatSection.style.transform = 'translateY(120%) scale(0.95)';
    chatSection.style.opacity   = '0';
    stopPolling();
  }

  // ── Toggle open / close ────────────────────────────────────────────
  toggleBtn.addEventListener('click', () => {
    const open = chatSection.style.opacity === '1';
    open ? closeChat() : openChat();
  });

  closeBtn.addEventListener('click', closeChat);

  // ── Send message via Supabase ──────────────────────────────────────
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value    = '';
    chatInput.disabled = true;

    // Optimistically show the message right away
    const tempId = 'temp-' + Date.now();
    appendMsg(text, 'sent', tempId);

    // Send to Supabase
    const result = await sendMessage(currentUser, otherUserId, text);

    if (result) {
      // Mark the real ID as rendered (real-time will ignore it)
      renderedIds.add(result.id);
    } else {
      // If send failed, mark the bubble as failed
      const tempBubble = chatMessages.querySelector(`[data-msg-id="${tempId}"]`);
      if (tempBubble) {
        tempBubble.querySelector('.chat-message__bubble').style.borderColor = '#ef4444';
        tempBubble.querySelector('.chat-message__bubble').insertAdjacentHTML(
          'beforeend',
          '<span style="display:block;font-size:.7rem;color:#ef4444;margin-top:4px;">Failed to send</span>'
        );
      }
    }

    chatInput.disabled = false;
    chatInput.focus();
  });

  // ── Append a message bubble to the chat ────────────────────────────
  function appendMsg(text, type, msgId, timestamp) {
    if (msgId && renderedIds.has(msgId)) return;
    if (msgId) renderedIds.add(msgId);

    // Remove the "No messages yet. Say hello!" empty-state placeholder
    // if it's still visible (any child that isn't a chat-message bubble)
    [...chatMessages.children].forEach(child => {
      if (!child.classList.contains('chat-message')) child.remove();
    });

    const bubble = document.createElement('div');
    bubble.className = `chat-message chat-message--${type}`;
    if (msgId) bubble.setAttribute('data-msg-id', msgId);
    bubble.style.cssText = `opacity:0;transform:${type === 'sent' ? 'translateX(20px)' : 'translateX(-20px)'}`;

    const timeHtml = timestamp
      ? `<span style="display:block;font-size:.65rem;color:var(--clr-text-light,#94a3b8);margin-top:4px;">${formatChatTime(timestamp)}</span>`
      : '';

    bubble.innerHTML = `<div class="chat-message__bubble">${escapeHtml(text)}${timeHtml}</div>`;
    chatMessages.appendChild(bubble);

    // Animate in
    bubble.offsetHeight;
    bubble.style.transition = 'all 0.4s cubic-bezier(0.175,0.885,0.32,1.275)';
    bubble.style.opacity    = '1';
    bubble.style.transform  = 'translate(0)';

    // Auto-scroll to bottom
    setTimeout(() => { chatMessages.scrollTop = chatMessages.scrollHeight; }, 50);
  }

  // ── Escape HTML to prevent XSS ─────────────────────────────────────
  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
}

// ─────────────────────────────────────────────────────────────────────
//  EDIT MODAL
// ─────────────────────────────────────────────────────────────────────
function openEditModal(user, userId) {
  const modal = document.getElementById('edit-modal');

  document.getElementById('edit-name').value     = user.name     || '';
  document.getElementById('edit-title').value    = user.title    || '';
  document.getElementById('edit-bio').value      = user.bio      || '';
  document.getElementById('edit-location').value = user.location || '';
  document.getElementById('edit-offered').value  = (user.offered || []).join(', ');
  document.getElementById('edit-wanted').value   = (user.wanted  || []).join(', ');

  document.querySelectorAll('.avail-day-chip input').forEach(cb => {
    cb.checked = user.availability?.days?.includes(cb.value) || false;
  });
  document.getElementById('edit-time-from').value = user.availability?.from || '09:00';
  document.getElementById('edit-time-to').value   = user.availability?.to   || '18:00';
  const tzSelect = document.getElementById('edit-timezone');
  if (user.availability?.timezone) tzSelect.value = user.availability.timezone;

  modal.classList.add('active');

  // Swap form to remove old listeners
  const form    = document.getElementById('edit-profile-form');
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);
  newForm.querySelector('#edit-cancel-btn')?.addEventListener('click', () => modal.classList.remove('active'));

  newForm.addEventListener('submit', async e => {
    e.preventDefault();

    // ── Show loading state on Save button ────────────────────────────
    const saveBtn = newForm.querySelector('button[type="submit"]');
    const originalBtnHTML = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;margin-right:8px;"></span>Saving<span class="dots-anim"></span>';
    saveBtn.style.pointerEvents = 'none';
    saveBtn.style.opacity = '0.75';

    const newName     = document.getElementById('edit-name').value.trim();
    const newTitle    = document.getElementById('edit-title').value.trim();
    const newBio      = document.getElementById('edit-bio').value.trim();
    const newLocation = document.getElementById('edit-location').value.trim();
    const newOffered  = document.getElementById('edit-offered').value.split(',').map(s => s.trim()).filter(Boolean);
    const newWanted   = document.getElementById('edit-wanted').value.split(',').map(s => s.trim()).filter(Boolean);

    const selectedDays = [];
    newForm.querySelectorAll('.avail-day-chip input:checked').forEach(cb => selectedDays.push(cb.value));
    const timeFrom  = document.getElementById('edit-time-from').value;
    const timeTo    = document.getElementById('edit-time-to').value;
    const timezone  = document.getElementById('edit-timezone').value;

    const parts    = newName.split(' ').filter(Boolean);
    const initials = parts.length >= 2 ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase() : newName.substring(0,2).toUpperCase();

    // Update object
    user.name       = newName;
    user.initials   = initials;
    user.title      = newTitle;
    user.bio        = newBio;
    user.location   = newLocation;
    user.offered    = newOffered;
    user.wanted     = newWanted;
    user.availability = { days: selectedDays, from: timeFrom, to: timeTo, timezone };

    // Save to backend (Supabase)
    const saved = await apiFetch(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(user)
    });

    // Always persist to localStorage as backup
    const localMap = JSON.parse(localStorage.getItem('skillSwapUsers') || '{}');
    localMap[userId] = user;
    localStorage.setItem('skillSwapUsers', JSON.stringify(localMap));

    if (saved) {
      console.log('[Profile] Saved to Supabase successfully');
    } else {
      console.warn('[Profile] Backend save failed — saved to localStorage only');
    }

    // ── Restore button & close ────────────────────────────────────────
    saveBtn.innerHTML = originalBtnHTML;
    saveBtn.style.pointerEvents = '';
    saveBtn.style.opacity = '';

    populateFullPageProfile(user, userId, localStorage.getItem('currentUser'), {}, true);
    modal.classList.remove('active');
    showToast('Profile updated successfully!');
  });
}

// ─────────────────────────────────────────────────────────────────────
//  REQUEST MODAL
// ─────────────────────────────────────────────────────────────────────
function openRequestModal(targetUser, currentUserId, targetUserId, allUsers, sendBtn, sendReqArea) {
  const modal        = document.getElementById('request-modal');
  const currentUserData = allUsers[currentUserId] || {};

  document.getElementById('req-target-avatar').textContent = targetUser.initials;
  document.getElementById('req-target-name').textContent   = targetUser.name;
  document.getElementById('req-target-title').textContent  = targetUser.title;

  const learnChips = document.getElementById('req-learn-chips');
  learnChips.innerHTML = '';
  (targetUser.offered || []).forEach(skill => {
    const lbl = document.createElement('label');
    lbl.className = 'req-chip';
    lbl.innerHTML = `<input type="checkbox" value="${skill}" checked /><span>${skill}</span>`;
    learnChips.appendChild(lbl);
  });
  if (!targetUser.offered?.length) learnChips.innerHTML = '<p style="font-size:.85rem;color:var(--clr-text-light);font-style:italic;">No skills listed</p>';

  const teachChips = document.getElementById('req-teach-chips');
  teachChips.innerHTML = '';
  (targetUser.wanted || []).forEach(skill => {
    const iOffer = (currentUserData.offered || []).some(s => s.toLowerCase() === skill.toLowerCase());
    const lbl = document.createElement('label');
    lbl.className = 'req-chip';
    lbl.innerHTML = `<input type="checkbox" value="${skill}" ${iOffer ? 'checked' : ''} /><span>${skill}</span>`;
    teachChips.appendChild(lbl);
  });
  if (!targetUser.wanted?.length) teachChips.innerHTML = '<p style="font-size:.85rem;color:var(--clr-text-light);font-style:italic;">No skills listed</p>';

  document.getElementById('req-message').value = `Hi ${targetUser.name.split(' ')[0]}! I'd love to exchange skills with you.`;

  modal.classList.add('active');

  const reqSendBtn    = document.getElementById('req-send-btn');
  const newReqSendBtn = reqSendBtn.cloneNode(true);
  reqSendBtn.parentNode.replaceChild(newReqSendBtn, reqSendBtn);

  newReqSendBtn.addEventListener('click', async () => {
    const wantToLearn = [...learnChips.querySelectorAll('input:checked')].map(cb => cb.value);
    const canTeach    = [...teachChips.querySelectorAll('input:checked')].map(cb => cb.value);
    const message     = document.getElementById('req-message').value.trim() || "I'd love to exchange skills!";

    // ── Validation: must select at least 1 skill to learn AND 1 to teach ──
    let validationError = '';
    if (wantToLearn.length === 0 && canTeach.length === 0) {
      validationError = 'You must select at least one skill to learn AND one skill to offer in return.';
    } else if (wantToLearn.length === 0) {
      validationError = 'Please select at least one skill you want to learn from them.';
    } else if (canTeach.length === 0) {
      validationError = 'Please select at least one skill you can teach them in return. A swap must be mutual!';
    }

    if (validationError) {
      // Remove any previous error
      const prev = modal.querySelector('.req-validation-error');
      if (prev) prev.remove();

      const errEl = document.createElement('div');
      errEl.className = 'req-validation-error';
      errEl.style.cssText = 'background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:10px;padding:10px 14px;font-size:0.85rem;margin-bottom:12px;display:flex;align-items:center;gap:8px;animation:fadeInScale .3s ease both;';
      errEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>${validationError}`;
      newReqSendBtn.parentElement.insertBefore(errEl, newReqSendBtn.parentElement.firstChild);

      // Shake the button
      newReqSendBtn.style.animation = 'none';
      newReqSendBtn.offsetHeight;
      newReqSendBtn.style.animation = 'shake .4s ease';
      return;
    }

    // Remove error if it existed
    const prevErr = modal.querySelector('.req-validation-error');
    if (prevErr) prevErr.remove();

    // Show loading state on the button
    const origBtnHtml = newReqSendBtn.innerHTML;
    newReqSendBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;margin-right:8px;border-color:rgba(255,255,255,0.3);border-top-color:#fff;"></span>Sending Request<span class="dots-anim"></span>';
    newReqSendBtn.style.pointerEvents = 'none';
    newReqSendBtn.style.opacity = '0.8';

    // Try backend
    const body = { from: currentUserId, to: targetUserId, wantToLearn, canTeach, message };
    const backendRes = await apiFetch('/requests', { method: 'POST', body: JSON.stringify(body) });

    // Fallback localStorage
    if (!backendRes) {
      const requests = JSON.parse(localStorage.getItem('skillSwapRequests') || '[]');
      requests.push({
        id: Date.now().toString(),
        from: currentUserId, to: targetUserId,
        fromName: allUsers[currentUserId]?.name || currentUserId,
        fromInitials: allUsers[currentUserId]?.initials || '??',
        fromSkills: canTeach,
        toName: targetUser.name, toInitials: targetUser.initials,
        toSkills: wantToLearn, wantToLearn, canTeach, message,
        status: 'pending', timestamp: new Date().toISOString()
      });
      localStorage.setItem('skillSwapRequests', JSON.stringify(requests));
    }

    // Brief pause for UX feel
    await new Promise(r => setTimeout(r, 400));

    modal.classList.remove('active');
    sendBtn.remove();

    // ── Animated success badge with confetti burst ──
    sendReqArea.innerHTML = `
      <div class="request-sent-success" style="
        padding:20px;
        background:linear-gradient(135deg,#ecfdf5,#eff6ff);
        border:2px solid #86efac;
        border-radius:16px;
        text-align:center;
        animation:fadeInScale .5s cubic-bezier(0.175,0.885,0.32,1.275) both;
        position:relative;
        overflow:hidden;
      ">
        <div class="confetti-burst" style="position:absolute;inset:0;pointer-events:none;overflow:hidden;"></div>
        <div style="
          width:52px;height:52px;
          background:linear-gradient(135deg,#22c55e,#10b981);
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          margin:0 auto 12px;
          animation:bounceIn .6s cubic-bezier(0.175,0.885,0.32,1.275) .2s both;
          box-shadow:0 4px 14px rgba(34,197,94,0.3);
        ">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" width="26" height="26">
            <polyline points="20 6 9 17 4 12" style="
              stroke-dasharray:30;
              stroke-dashoffset:30;
              animation:drawCheck .5s ease .5s forwards;
            "></polyline>
          </svg>
        </div>
        <p style="font-weight:700;font-size:1rem;color:#065f46;margin:0 0 4px;">Request Sent!</p>
        <p style="font-size:.82rem;color:#6b7280;margin:0;">Waiting for ${targetUser.name.split(' ')[0]} to accept your exchange</p>
      </div>`;

    // Create confetti particles
    const confettiContainer = sendReqArea.querySelector('.confetti-burst');
    if (confettiContainer) {
      const colors = ['#22c55e','#3b82f6','#f59e0b','#ec4899','#8b5cf6','#06b6d4'];
      for (let i = 0; i < 24; i++) {
        const particle = document.createElement('div');
        const color = colors[i % colors.length];
        const size = 4 + Math.random() * 5;
        const angle = (i / 24) * 360;
        const distance = 60 + Math.random() * 80;
        const dx = Math.cos(angle * Math.PI / 180) * distance;
        const dy = Math.sin(angle * Math.PI / 180) * distance;
        particle.style.cssText = `
          position:absolute;
          left:50%;top:50%;
          width:${size}px;height:${size}px;
          background:${color};
          border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
          transform:translate(-50%,-50%) scale(0);
          animation:confettiPop .8s cubic-bezier(0.175,0.885,0.32,1.275) ${0.1 + i * 0.02}s forwards;
          --dx:${dx}px;--dy:${dy}px;
          opacity:0.9;
        `;
        confettiContainer.appendChild(particle);
      }
    }

    showToast('🎉 Request sent successfully!');
  });
}

// ─────────────────────────────────────────────────────────────────────
//  REQUESTS PANEL (own profile)
// ─────────────────────────────────────────────────────────────────────
async function initRequests(currentUserId, allUsers) {
  // Try backend first
  const backendData = await apiFetch(`/requests?userId=${currentUserId}`);
  let received, sent;

  if (backendData) {
    received = backendData.received || [];
    sent     = backendData.sent     || [];
  } else {
    const requests = JSON.parse(localStorage.getItem('skillSwapRequests') || '[]');
    received = requests.filter(r => r.to   === currentUserId);
    sent     = requests.filter(r => r.from === currentUserId);
  }

  const pendingReceived = received.filter(r => r.status === 'pending').length;
  const badgeReceived   = document.getElementById('badge-received');
  const badgeSent       = document.getElementById('badge-sent');

  badgeReceived.textContent = pendingReceived;
  badgeSent.textContent     = sent.length;
  if (pendingReceived > 0) badgeReceived.classList.add('has-items');
  if (sent.length > 0)     badgeSent.classList.add('has-items');

  renderReceivedRequests(received, currentUserId);
  renderSentRequests(sent);

  // Ensure initial panel visibility matches the active tab
  const contentReceived = document.getElementById('content-received');
  const contentSent     = document.getElementById('content-sent');
  if (contentReceived) contentReceived.style.display = 'block';
  if (contentSent)     contentSent.style.display     = 'none';

  document.querySelectorAll('.requests-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.requests-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.requests-panel__content').forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
      });
      tab.classList.add('active');
      const target = document.getElementById(`content-${tab.dataset.tab}`);
      target.classList.add('active');
      target.style.display = 'block';
    });
  });
}

function renderReceivedRequests(received, currentUserId) {
  const listEl  = document.getElementById('list-received');
  const emptyEl = document.getElementById('empty-received');
  if (!received.length) { emptyEl.style.display = 'flex'; listEl.style.display = 'none'; return; }
  emptyEl.style.display = 'none'; listEl.style.display = 'flex'; listEl.innerHTML = '';

  received.forEach((req, i) => {
    const card = document.createElement('div');
    card.className = 'request-card';
    card.style.animationDelay = `${i * 0.08}s`;
    const sc    = req.status === 'pending' ? 'pending' : req.status === 'accepted' ? 'accepted' : req.status === 'completed' ? 'accepted' : 'declined';
    const label = req.status === 'completed' ? 'Completed ✓' : req.status.charAt(0).toUpperCase() + req.status.slice(1);

    // Build action buttons based on status
    let actionsHtml = '';
    if (req.status === 'pending') {
      actionsHtml = `
        <div class="request-card__actions">
          <button class="btn btn--accept"  data-id="${req.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg> Accept</button>
          <button class="btn btn--decline" data-id="${req.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Decline</button>
        </div>`;
    } else if (req.status === 'accepted') {
      actionsHtml = `
        <div class="request-card__actions" style="flex-wrap:wrap;">
          <a href="profile.html?user=${req.from}" class="btn btn--outline" style="flex:1;text-align:center;text-decoration:none;font-size:.82rem;padding:8px 12px;border-radius:10px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-right:4px;vertical-align:text-bottom;"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>View Profile
          </a>
          <a href="profile.html?user=${req.from}" class="btn btn--primary" style="flex:1;text-align:center;text-decoration:none;font-size:.82rem;padding:8px 12px;border-radius:10px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-right:4px;vertical-align:text-bottom;"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"></path></svg>Open Chat
          </a>
          <button class="btn btn--feedback" data-id="${req.id}" data-other="${req.from}" data-other-name="${req.fromName}" data-other-initials="${req.fromInitials}" style="flex-basis:100%;margin-top:4px;background:linear-gradient(135deg,#f59e0b,#10b981);color:#fff;border:none;font-size:.82rem;padding:8px 12px;border-radius:10px;cursor:pointer;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-right:4px;vertical-align:text-bottom;"><polyline points="20 6 9 17 4 12"></polyline></svg>End Session & Feedback
          </button>
        </div>`;
    }

    card.innerHTML = `
      <div class="request-card__header">
        <div class="request-card__user">
          <div class="avatar avatar--sm">${req.fromInitials}</div>
          <div class="request-card__user-info"><strong>${req.fromName}</strong><span class="request-card__time">${getTimeAgo(req.timestamp)}</span></div>
        </div>
        <span class="request-card__status request-card__status--${sc}">${label}</span>
      </div>
      <p class="request-card__message">${req.message}</p>
      ${(req.wantToLearn?.length) ? `<div class="request-card__skills"><span class="request-card__skill-label">They want to learn:</span>${req.wantToLearn.map(s=>`<span class="request-card__skill">${s}</span>`).join('')}</div>` : ''}
      ${(req.canTeach?.length)    ? `<div class="request-card__skills"><span class="request-card__skill-label">They can teach:</span>${req.canTeach.map(s=>`<span class="request-card__skill request-card__skill--teach">${s}</span>`).join('')}</div>` : ''}
      ${actionsHtml}`;
    listEl.appendChild(card);
  });

  listEl.querySelectorAll('.btn--accept').forEach(btn =>
    btn.addEventListener('click', () => updateRequestStatus(btn.dataset.id, 'accepted', currentUserId)));
  listEl.querySelectorAll('.btn--decline').forEach(btn =>
    btn.addEventListener('click', () => updateRequestStatus(btn.dataset.id, 'declined', currentUserId)));
  listEl.querySelectorAll('.btn--feedback').forEach(btn =>
    btn.addEventListener('click', () => openFeedbackModal(btn.dataset.id, btn.dataset.other, btn.dataset.otherName, btn.dataset.otherInitials, currentUserId)));
}

function renderSentRequests(sent) {
  const listEl  = document.getElementById('list-sent');
  const emptyEl = document.getElementById('empty-sent');
  if (!sent.length) { emptyEl.style.display = 'flex'; listEl.style.display = 'none'; return; }
  emptyEl.style.display = 'none'; listEl.style.display = 'flex'; listEl.innerHTML = '';

  const currentUserId = localStorage.getItem('currentUser');

  sent.forEach((req, i) => {
    const card = document.createElement('div');
    card.className = 'request-card request-card--sent';
    card.style.animationDelay = `${i * 0.08}s`;
    const sc    = req.status === 'pending' ? 'pending' : req.status === 'accepted' ? 'accepted' : req.status === 'completed' ? 'accepted' : 'declined';
    const label = req.status === 'completed' ? 'Completed ✓' : req.status.charAt(0).toUpperCase() + req.status.slice(1);

    let actionsHtml = '';
    if (req.status === 'pending') {
      actionsHtml = `
        <div class="request-card__actions">
          <button class="btn btn--cancel" data-id="${req.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Cancel</button>
        </div>`;
    } else if (req.status === 'accepted') {
      actionsHtml = `
        <div class="request-card__actions" style="flex-wrap:wrap;">
          <a href="profile.html?user=${req.to}" class="btn btn--outline" style="flex:1;text-align:center;text-decoration:none;font-size:.82rem;padding:8px 12px;border-radius:10px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-right:4px;vertical-align:text-bottom;"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>View Profile
          </a>
          <a href="profile.html?user=${req.to}" class="btn btn--primary" style="flex:1;text-align:center;text-decoration:none;font-size:.82rem;padding:8px 12px;border-radius:10px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-right:4px;vertical-align:text-bottom;"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"></path></svg>Open Chat
          </a>
          <button class="btn btn--feedback" data-id="${req.id}" data-other="${req.to}" data-other-name="${req.toName}" data-other-initials="${req.toInitials}" style="flex-basis:100%;margin-top:4px;background:linear-gradient(135deg,#f59e0b,#10b981);color:#fff;border:none;font-size:.82rem;padding:8px 12px;border-radius:10px;cursor:pointer;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-right:4px;vertical-align:text-bottom;"><polyline points="20 6 9 17 4 12"></polyline></svg>End Session & Feedback
          </button>
        </div>`;
    }

    card.innerHTML = `
      <div class="request-card__header">
        <div class="request-card__user">
          <div class="avatar avatar--sm">${req.toInitials}</div>
          <div class="request-card__user-info"><strong>To: ${req.toName}</strong><span class="request-card__time">${getTimeAgo(req.timestamp)}</span></div>
        </div>
        <span class="request-card__status request-card__status--${sc}">${label}</span>
      </div>
      <p class="request-card__message">${req.message}</p>
      ${(req.wantToLearn?.length) ? `<div class="request-card__skills"><span class="request-card__skill-label">I want to learn:</span>${req.wantToLearn.map(s=>`<span class="request-card__skill">${s}</span>`).join('')}</div>` : ''}
      ${(req.canTeach?.length)    ? `<div class="request-card__skills"><span class="request-card__skill-label">I can teach:</span>${req.canTeach.map(s=>`<span class="request-card__skill request-card__skill--teach">${s}</span>`).join('')}</div>` : ''}
      ${actionsHtml}`;
    listEl.appendChild(card);
  });

  listEl.querySelectorAll('.btn--cancel').forEach(btn =>
    btn.addEventListener('click', () => cancelRequest(btn.dataset.id)));
  listEl.querySelectorAll('.btn--feedback').forEach(btn =>
    btn.addEventListener('click', () => openFeedbackModal(btn.dataset.id, btn.dataset.other, btn.dataset.otherName, btn.dataset.otherInitials, currentUserId)));
}

async function updateRequestStatus(reqId, newStatus, currentUserId) {
  // Try backend
  const ok = await apiFetch(`/requests/${reqId}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
  if (!ok) {
    const reqs = JSON.parse(localStorage.getItem('skillSwapRequests') || '[]');
    const idx  = reqs.findIndex(r => r.id === reqId);
    if (idx !== -1) { reqs[idx].status = newStatus; localStorage.setItem('skillSwapRequests', JSON.stringify(reqs)); }
  }

  // Re-fetch from backend to get fresh data
  const backendData = await apiFetch(`/requests?userId=${currentUserId}`);
  let received;
  if (backendData) {
    received = backendData.received || [];
  } else {
    const requests = JSON.parse(localStorage.getItem('skillSwapRequests') || '[]');
    received = requests.filter(r => r.to === currentUserId);
  }

  const pending = received.filter(r => r.status === 'pending').length;
  const badge   = document.getElementById('badge-received');
  badge.textContent = pending;
  pending > 0 ? badge.classList.add('has-items') : badge.classList.remove('has-items');
  renderReceivedRequests(received, currentUserId);

  if (newStatus === 'accepted') {
    showToast('Request accepted! Chat is now unlocked.');
  } else if (newStatus === 'declined') {
    showToast('Request declined.');
  }
}


async function cancelRequest(reqId) {
  await apiFetch(`/requests/${reqId}`, { method: 'DELETE' });
  let reqs = JSON.parse(localStorage.getItem('skillSwapRequests') || '[]');
  reqs = reqs.filter(r => r.id !== reqId);
  localStorage.setItem('skillSwapRequests', JSON.stringify(reqs));
  const currentUser = localStorage.getItem('currentUser');
  const sent = reqs.filter(r => r.from === currentUser);
  const badge = document.getElementById('badge-sent');
  badge.textContent = sent.length;
  sent.length > 0 ? badge.classList.add('has-items') : badge.classList.remove('has-items');
  renderSentRequests(sent);
}

// ─────────────────────────────────────────────────────────────────────
//  FEEDBACK / END SESSION MODAL
// ─────────────────────────────────────────────────────────────────────
function openFeedbackModal(reqId, otherUserId, otherName, otherInitials, currentUserId) {
  const modal = document.getElementById('feedback-modal');
  if (!modal) return;

  // Populate target info
  document.getElementById('feedback-target-avatar').textContent = otherInitials || '??';
  document.getElementById('feedback-target-name').textContent   = otherName || otherUserId;
  document.getElementById('feedback-target-title').textContent  = 'Skill Swap Partner';

  // Reset star picker
  const starPicker = document.getElementById('feedback-star-picker');
  const starVal = document.getElementById('feedback-star-value');
  starVal.value = '0';
  const GOLD = '#f59e0b', GREY = '#d1d5db';

  // Re-create the star elements fresh each time to avoid stale listeners
  starPicker.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const span = document.createElement('span');
    span.dataset.val = i;
    span.style.cssText = 'font-size:2rem;cursor:pointer;color:#d1d5db;transition:color .15s;';
    span.title = i + (i === 1 ? ' star' : ' stars');
    span.textContent = '★';
    starPicker.appendChild(span);
  }

  function highlightStars(n) {
    starPicker.querySelectorAll('span').forEach(s => {
      s.style.color = parseInt(s.dataset.val) <= n ? GOLD : GREY;
    });
  }
  highlightStars(0);

  starPicker.querySelectorAll('span').forEach(star => {
    star.addEventListener('mouseover', () => highlightStars(parseInt(star.dataset.val)));
    star.addEventListener('mouseout',  () => highlightStars(parseInt(starVal.value)));
    star.addEventListener('click', () => {
      starVal.value = star.dataset.val;
      highlightStars(parseInt(star.dataset.val));
    });
  });

  // Reset text
  document.getElementById('feedback-text').value = '';

  modal.classList.add('active');

  // Wire submit button (clone to remove old listeners)
  const submitBtn    = document.getElementById('feedback-submit-btn');
  const newSubmitBtn = submitBtn.cloneNode(true);
  submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);

  newSubmitBtn.addEventListener('click', async () => {
    const rating = parseInt(starVal.value) || 5;
    const text   = document.getElementById('feedback-text').value.trim();

    if (!parseInt(starVal.value)) {
      showToast('Please select a star rating');
      return;
    }

    // Show loading
    const origHtml = newSubmitBtn.innerHTML;
    newSubmitBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;margin-right:8px;"></span>Submitting...';
    newSubmitBtn.style.pointerEvents = 'none';

    // Submit to backend
    const result = await apiFetch(`/requests/${reqId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ userId: currentUserId, rating, text })
    });

    // Also store locally
    const feedbackKey = `feedback_${reqId}_${currentUserId}`;
    localStorage.setItem(feedbackKey, JSON.stringify({ rating, text, timestamp: new Date().toISOString() }));

    newSubmitBtn.innerHTML = origHtml;
    newSubmitBtn.style.pointerEvents = '';
    modal.classList.remove('active');

    if (result && result.status === 'completed') {
      showToast('Session completed! Both users gave feedback. You can now send new requests.');

      // Reset chat state so it reinitializes for the next session
      const chatSection = document.getElementById('chat-section');
      if (chatSection) chatSection.removeAttribute('data-init');

      // Re-render the full profile view to show "Send Request" again
      const params      = new URLSearchParams(window.location.search);
      const viewUserId  = params.get('user');
      let allUsers = {};
      const backendUsers = await apiFetch('/users');
      if (backendUsers) backendUsers.forEach(u => { allUsers[u.id] = u; });
      const localUsers = JSON.parse(localStorage.getItem('skillSwapUsers') || '{}');
      Object.keys(localUsers).forEach(uid => { if (!allUsers[uid]) allUsers[uid] = localUsers[uid]; });
      if (viewUserId && allUsers[viewUserId]) {
        await populateFullPageProfile(allUsers[viewUserId], viewUserId, currentUserId, allUsers, viewUserId === currentUserId);
      }
    } else {
      showToast('Feedback submitted! Waiting for the other user to end their session too.');
    }

    // Refresh the requests panel
    initRequests(currentUserId, {});
  });
}
