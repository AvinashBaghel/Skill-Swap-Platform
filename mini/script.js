// ===== SkillSwap Main Script =====
// Wrapped entirely in DOMContentLoaded to prevent null-reference errors
// on pages that don't have every element (e.g. profile.html has no hamburger)

document.addEventListener('DOMContentLoaded', () => {

  // ─── Custom Dialog System (replaces native alert/confirm) ──────────────
  function showDialog({ title, message, type = 'alert', icon = '💬', onConfirm, onCancel }) {
    // Remove any existing dialog
    document.getElementById('custom-dialog-overlay')?.remove();

    const isConfirm = type === 'confirm';
    const overlay = document.createElement('div');
    overlay.id = 'custom-dialog-overlay';
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(10,10,10,0.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity .25s ease;`;

    overlay.innerHTML = `
      <div id="custom-dialog-box" style="
        background:#fff;border-radius:20px;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.2);overflow:hidden;
        transform:translateY(20px) scale(0.95);transition:transform .35s cubic-bezier(0.175,0.885,0.32,1.275);">
        <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f4c81 100%);padding:24px 28px 20px;text-align:center;">
          <div style="font-size:2.2rem;margin-bottom:8px;">${icon}</div>
          <h3 style="color:#fff;font-size:1.15rem;font-weight:700;margin:0;">${title || (isConfirm ? 'Are you sure?' : 'Notice')}</h3>
        </div>
        <div style="padding:24px 28px 28px;text-align:center;">
          <p style="color:#475569;font-size:.95rem;line-height:1.7;margin:0 0 24px;">${message}</p>
          <div style="display:flex;gap:10px;justify-content:center;">
            ${isConfirm ? `
              <button id="dialog-cancel-btn" style="
                flex:1;padding:11px 20px;border-radius:999px;border:2px solid #e2e8f0;background:#fff;
                color:#475569;font-weight:600;font-size:.9rem;cursor:pointer;transition:all .2s;font-family:inherit;">No, Cancel</button>
              <button id="dialog-confirm-btn" style="
                flex:1;padding:11px 20px;border-radius:999px;border:none;background:#ef4444;
                color:#fff;font-weight:600;font-size:.9rem;cursor:pointer;transition:all .2s;font-family:inherit;
                box-shadow:0 4px 14px rgba(239,68,68,0.3);">Yes, Delete</button>
            ` : `
              <button id="dialog-ok-btn" style="
                padding:11px 36px;border-radius:999px;border:none;background:var(--clr-orange,#0f766e);
                color:#fff;font-weight:600;font-size:.9rem;cursor:pointer;transition:all .2s;font-family:inherit;
                box-shadow:0 4px 14px rgba(15,118,110,0.3);">Got It</button>
            `}
          </div>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      overlay.querySelector('#custom-dialog-box').style.transform = 'translateY(0) scale(1)';
    });

    function closeDialog() {
      overlay.style.opacity = '0';
      overlay.querySelector('#custom-dialog-box').style.transform = 'translateY(20px) scale(0.95)';
      setTimeout(() => overlay.remove(), 250);
    }

    // Button hover effects
    overlay.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('mouseover', () => { btn.style.transform = 'translateY(-2px)'; btn.style.filter = 'brightness(1.1)'; });
      btn.addEventListener('mouseout',  () => { btn.style.transform = 'translateY(0)'; btn.style.filter = 'none'; });
    });

    if (isConfirm) {
      overlay.querySelector('#dialog-confirm-btn').addEventListener('click', () => { closeDialog(); if (onConfirm) onConfirm(); });
      overlay.querySelector('#dialog-cancel-btn').addEventListener('click',  () => { closeDialog(); if (onCancel) onCancel(); });
    } else {
      overlay.querySelector('#dialog-ok-btn').addEventListener('click', () => { closeDialog(); if (onConfirm) onConfirm(); });
    }

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { closeDialog(); if (onCancel) onCancel(); }
    });

    // Close on Escape
    function onEsc(e) { if (e.key === 'Escape') { closeDialog(); if (onCancel) onCancel(); document.removeEventListener('keydown', onEsc); } }
    document.addEventListener('keydown', onEsc);
  }

  // ─── FAQ Accordion ───────────────────────────────────────────────────────
  document.querySelectorAll('.faq-item__question').forEach(button => {
    button.addEventListener('click', () => {
      const item = button.parentElement;
      const isActive = item.classList.contains('active');

      // Close all open items
      document.querySelectorAll('.faq-item').forEach(faq => {
        faq.classList.remove('active');
        faq.querySelector('.faq-item__question')?.setAttribute('aria-expanded', 'false');
      });

      // Open the clicked one (unless it was already open)
      if (!isActive) {
        item.classList.add('active');
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ─── Mobile Hamburger Menu ────────────────────────────────────────────────
  const hamburger = document.getElementById('hamburger');
  const nav       = document.getElementById('nav');

  if (hamburger && nav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      nav.classList.toggle('open');
    });

    document.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        nav.classList.remove('open');
      });
    });

    document.addEventListener('click', (e) => {
      if (nav.classList.contains('open') &&
          !nav.contains(e.target) &&
          !hamburger.contains(e.target)) {
        hamburger.classList.remove('active');
        nav.classList.remove('open');
      }
    });
  }

  // ─── Active Nav Link on Scroll ────────────────────────────────────────────
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav__link');

  function setActiveNav() {
    const scrollY = window.scrollY + 120;
    sections.forEach(section => {
      const top    = section.offsetTop;
      const height = section.offsetHeight;
      const id     = section.getAttribute('id');
      if (scrollY >= top && scrollY < top + height) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === '#' + id) {
            link.classList.add('active');
          }
        });
      }
    });
  }
  window.addEventListener('scroll', setActiveNav);

  // ─── Header Shadow on Scroll ──────────────────────────────────────────────
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.style.boxShadow = window.scrollY > 10
        ? '0 2px 20px rgba(0,0,0,.08)'
        : 'none';
    });
  }

  // ─── Intersection Observer — fade-in animations ───────────────────────────
  const observerOptions = { threshold: 0.15, rootMargin: '0px 0px -50px 0px' };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll(
    '.animate-on-scroll, .section-header, .skill-card, .step, .testimonial-card, .blog-card, .faq-item, .page-header, .page-content > p, .page-content > h2, .contact-form'
  ).forEach(el => {
    if (!el.classList.contains('animate-on-scroll')) {
      el.classList.add('animate-on-scroll');
    }
    observer.observe(el);
  });

  // ─── Newsletter Form ───────────────────────────────────────────────────────
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('newsletter-email').value;
      if (email) {
        showDialog({ title: 'Subscribed!', message: "Thanks for subscribing! We'll send updates to " + email, icon: '📬' });
        newsletterForm.reset();
      }
    });
  }

  // ─── Skill Search (hero search bar → skills.html) ─────────────────────────
  const searchInput = document.getElementById('hero-search');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const term = e.target.value.trim();
        window.location.href = term
          ? `skills.html?search=${encodeURIComponent(term)}`
          : 'skills.html';
      }
    });
  }

  // ─── Skill Search Filter (skills.html page search) ────────────────────────
  const skillCards = document.querySelectorAll('.skill-card');
  const params     = new URLSearchParams(window.location.search);
  const searchQuery = params.get('search');

  if (searchQuery && skillCards.length > 0) {
    const term = searchQuery.toLowerCase().trim();
    skillCards.forEach(card => {
      const title      = card.querySelector('.skill-card__title')?.textContent.toLowerCase() || '';
      const badge      = card.querySelector('.skill-card__badge')?.textContent.toLowerCase() || '';
      const instructor = card.querySelector('.skill-card__instructor span')?.textContent.toLowerCase() || '';
      const visible    = title.includes(term) || badge.includes(term) || instructor.includes(term);
      card.style.display    = visible ? 'block' : 'none';
      card.style.opacity    = visible ? '1' : '';
      card.style.transform  = visible ? 'translateY(0)' : '';
    });
    const pageSearch = document.getElementById('page-search');
    if (pageSearch) pageSearch.value = searchQuery;
  }

  const pageSearchInput = document.getElementById('page-search');
  if (pageSearchInput) {
    pageSearchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      skillCards.forEach(card => {
        const title      = card.querySelector('.skill-card__title')?.textContent.toLowerCase() || '';
        const badge      = card.querySelector('.skill-card__badge')?.textContent.toLowerCase() || '';
        const instructor = card.querySelector('.skill-card__instructor span')?.textContent.toLowerCase() || '';
        const visible    = title.includes(term) || badge.includes(term) || instructor.includes(term);
        card.style.display   = visible ? 'block' : 'none';
        card.style.opacity   = visible ? '1' : '';
        card.style.transform = visible ? 'translateY(0)' : '';
      });
    });
  }

  // ─── Auth State & Dynamic Header ─────────────────────────────────────────
  const currentUser   = localStorage.getItem('currentUser');
  const headerActions = document.querySelector('.header__actions');

  if (currentUser && headerActions) {
    headerActions.innerHTML = `
      <a href="profile.html?user=${currentUser}" class="btn btn--outline" id="my-profile-btn"
         style="border-color:transparent;background:var(--clr-blue-light);color:var(--clr-blue);">My Profile</a>
      <a href="#" id="logout-btn" class="btn btn--primary" style="background:#ef4444;box-shadow:none;">Logout</a>
    `;
    document.getElementById('logout-btn').addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('currentUser');
      window.location.href = 'index.html';
    });
  }

  // ─── Local registered users no longer rendered on skills grid ──────────────
  // (Users are managed through the backend / database now)


  // ─── Testimonials Comment Form (one per user, with Edit & Delete) ──────
  const testimonialContainer = document.getElementById('testimonial-form-container');
  if (testimonialContainer) {
    if (currentUser) {
      // Load or initialize persisted comments
      const allComments = JSON.parse(localStorage.getItem('skillSwapTestimonials') || '{}');
      const myEntry     = allComments[currentUser];

      if (myEntry) {
        // Card is added to the grid by restorePersistedComments below;
        // just clear the form area so the form isn't shown
        testimonialContainer.innerHTML = '';
      } else {
        // No comment yet — show the submission form
        renderCommentForm(testimonialContainer, currentUser, allComments);
      }
    } else {
      testimonialContainer.innerHTML = `
        <div style="padding:24px;background:rgba(255,255,255,0.8);border:2px solid var(--clr-border);border-radius:var(--radius-lg);display:inline-block;">
          <p style="margin-bottom:16px;font-weight:500;color:var(--clr-text);">Want to share your experience with the community?</p>
          <a href="login.html" class="btn btn--primary">Log In to Comment</a>
        </div>`;
    }
  }

  function renderCommentForm(container, username, allComments) {
    container.innerHTML = `
      <div style="max-width:600px;margin:0 auto;padding:24px;background:var(--clr-bg-alt);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);text-align:left;">
        <h3 style="margin-bottom:8px;font-size:1.1rem;color:var(--clr-text);">Add Your Voice</h3>
        <p style="font-size:.82rem;color:var(--clr-text-light);margin-bottom:14px;">Share your experience — it will appear in the testimonials above.</p>

        <div style="margin-bottom:16px;">
          <p style="font-size:.85rem;font-weight:600;color:var(--clr-text);margin-bottom:8px;">Your Rating</p>
          <div id="star-picker" style="display:flex;gap:6px;" role="radiogroup" aria-label="Star rating">
            <span data-val="1" style="font-size:1.8rem;cursor:pointer;color:#d1d5db;transition:color .15s;" title="1 star">&#9733;</span>
            <span data-val="2" style="font-size:1.8rem;cursor:pointer;color:#d1d5db;transition:color .15s;" title="2 stars">&#9733;</span>
            <span data-val="3" style="font-size:1.8rem;cursor:pointer;color:#d1d5db;transition:color .15s;" title="3 stars">&#9733;</span>
            <span data-val="4" style="font-size:1.8rem;cursor:pointer;color:#d1d5db;transition:color .15s;" title="4 stars">&#9733;</span>
            <span data-val="5" style="font-size:1.8rem;cursor:pointer;color:#d1d5db;transition:color .15s;" title="5 stars">&#9733;</span>
          </div>
          <input type="hidden" id="star-value" value="0" />
        </div>

        <textarea id="new-testimonial-text" placeholder="Share your experience with SkillSwap..."
          style="width:100%;min-height:100px;padding:12px;border:2px solid var(--clr-border);border-radius:var(--radius-md);font-family:inherit;margin-bottom:16px;outline:none;box-sizing:border-box;resize:vertical;"></textarea>
        <button id="submit-testimonial-btn" class="btn btn--primary" style="width:100%;">Submit Review</button>
      </div>`;

    // ── Star picker interaction ──────────────────────────────────────────
    const stars   = container.querySelectorAll('#star-picker span');
    const starVal = container.querySelector('#star-value');
    const GOLD    = '#f59e0b';
    const GREY    = '#d1d5db';

    function highlightStars(n) {
      stars.forEach(s => {
        s.style.color = parseInt(s.dataset.val) <= n ? GOLD : GREY;
      });
    }

    stars.forEach(star => {
      star.addEventListener('mouseover', () => highlightStars(parseInt(star.dataset.val)));
      star.addEventListener('mouseout',  () => highlightStars(parseInt(starVal.value)));
      star.addEventListener('click', () => {
        starVal.value = star.dataset.val;
        highlightStars(parseInt(star.dataset.val));
      });
    });

    document.getElementById('submit-testimonial-btn').addEventListener('click', () => {
      const text   = document.getElementById('new-testimonial-text').value.trim();
      const rating = parseInt(document.getElementById('star-value').value) || 5;
      if (!text) { showDialog({ title: 'Missing Review', message: 'Please write something before submitting.', icon: '✏️' }); return; }
      if (!rating) { showDialog({ title: 'Missing Rating', message: 'Please select a star rating.', icon: '⭐' }); return; }

      allComments[username] = { text, rating };
      localStorage.setItem('skillSwapTestimonials', JSON.stringify(allComments));

      // Hide the form — user gets only one comment
      container.innerHTML = '';

      appendTestimonialCard(text, rating, username, true, container, allComments);
    });
  }

  // Notice removed — no longer needed after submit

  // ── Append card to the testimonials grid ─────────────────────────────
  function appendTestimonialCard(text, rating, username, isOwn, container, allComments) {
    const grid = document.querySelector('.testimonials__grid');
    if (!grid) return;
    document.getElementById(`testimonial-user-${username}`)?.remove();

    const initials  = username.substring(0, 2).toUpperCase();
    const starCount = Math.max(1, Math.min(5, parseInt(rating) || 5));
    const starsHtml = '★'.repeat(starCount) + '☆'.repeat(5 - starCount);
    const card = document.createElement('div');
    card.className = 'testimonial-card animate-on-scroll visible';
    card.id = `testimonial-user-${username}`;
    card.style.position = 'relative';

    // Build own-card controls if needed
    const ownControls = isOwn ? `
      <div id="card-actions-${username}" style="display:flex;gap:6px;margin-top:16px;padding-top:14px;border-top:1px solid var(--clr-border);">
        <button data-action="edit"
          style="flex:1;background:none;border:1px solid var(--clr-border);border-radius:7px;padding:5px 0;font-size:.78rem;cursor:pointer;color:var(--clr-text-light);transition:all .15s;"
          onmouseover="this.style.borderColor='var(--clr-blue,#0ea5e9)';this.style.color='var(--clr-blue,#0ea5e9)'"
          onmouseout="this.style.borderColor='var(--clr-border)';this.style.color='var(--clr-text-light)'">
          Edit
        </button>
        <button data-action="delete"
          style="flex:1;background:none;border:1px solid #fecaca;border-radius:7px;padding:5px 0;font-size:.78rem;cursor:pointer;color:#ef4444;transition:all .15s;"
          onmouseover="this.style.background='#fef2f2'"
          onmouseout="this.style.background='none'">
          Delete
        </button>
      </div>` : '';

    card.innerHTML = `
      <div class="testimonial-card__stars" style="color:#f59e0b;margin-bottom:16px;letter-spacing:2px;font-size:1.1rem;">${starsHtml}</div>
      <p class="testimonial-card__text" style="color:var(--clr-text-light);font-style:italic;margin-bottom:20px;">"${escapeHtml(text)}"</p>
      <div class="testimonial-card__author" style="display:flex;align-items:center;gap:12px;">
        <div class="avatar" style="width:44px;height:44px;border-radius:50%;background:var(--clr-orange-light);color:var(--clr-orange);display:flex;align-items:center;justify-content:center;font-weight:600;flex-shrink:0;">
          ${initials}
        </div>
        <div>
          <strong style="display:block;font-weight:600;">${escapeHtml(username)}</strong>
          <span style="font-size:0.8rem;color:var(--clr-text-light);">Community Member</span>
        </div>
      </div>
      ${ownControls}`;

    grid.appendChild(card);

    if (!isOwn) return;

    // ── Wire up Edit & Delete on the card ──────────────────────────────
    const textEl    = card.querySelector('.testimonial-card__text');
    const starsEl   = card.querySelector('.testimonial-card__stars');
    const actionsEl = card.querySelector(`#card-actions-${username}`);
    wireCardButtons(card, textEl, starsEl, actionsEl, username, container, allComments);
  }

  // ── Wire / re-wire Edit & Delete buttons on a card ───────────────────
  function wireCardButtons(card, textEl, starsEl, actionsEl, username, container, allComments) {

    function restoreButtons() {
      actionsEl.innerHTML = `
        <button data-action="edit"
          style="flex:1;background:none;border:1px solid var(--clr-border);border-radius:7px;padding:6px 0;font-size:.78rem;cursor:pointer;color:var(--clr-text-light);transition:all .15s;"
          onmouseover="this.style.borderColor='var(--clr-orange)';this.style.color='var(--clr-orange)'"
          onmouseout="this.style.borderColor='var(--clr-border)';this.style.color='var(--clr-text-light)'">
          &#9998; Edit
        </button>
        <button data-action="delete"
          style="flex:1;background:none;border:1px solid #fecaca;border-radius:7px;padding:6px 0;font-size:.78rem;cursor:pointer;color:#ef4444;transition:all .15s;"
          onmouseover="this.style.background='#fef2f2'"
          onmouseout="this.style.background='none'">
          &#128465; Delete
        </button>`;
      wireCardButtons(card, textEl, starsEl, actionsEl, username, container, allComments);
    }

    // Edit
    actionsEl.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
      const entry    = allComments[username] || {};
      const savedTxt = typeof entry === 'object' ? entry.text   : entry;

      // Make text editable
      textEl.contentEditable = 'true';
      textEl.style.cssText   = 'border:2px solid var(--clr-orange);border-radius:8px;padding:8px;background:#fff;outline:none;font-style:normal;color:var(--clr-text);';
      textEl.textContent     = savedTxt;
      textEl.focus();
      const r = document.createRange();
      r.selectNodeContents(textEl); r.collapse(false);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(r);

      // Swap buttons
      actionsEl.innerHTML = `
        <button id="card-save-${username}"
          style="flex:1;background:var(--clr-orange);color:#fff;border:none;border-radius:7px;padding:6px 0;font-size:.78rem;cursor:pointer;">
          &#10003; Save
        </button>
        <button id="card-cancel-${username}"
          style="flex:1;background:none;border:1px solid var(--clr-border);border-radius:7px;padding:6px 0;font-size:.78rem;cursor:pointer;color:var(--clr-text-light);">
          Cancel
        </button>`;

      document.getElementById(`card-save-${username}`).addEventListener('click', () => {
        const newText = textEl.textContent.trim();
        if (!newText) return;
        const curEntry = allComments[username] || {};
        const curRating = typeof curEntry === 'object' ? curEntry.rating : 5;
        allComments[username] = { text: newText, rating: curRating };
        localStorage.setItem('skillSwapTestimonials', JSON.stringify(allComments));
        textEl.contentEditable = 'false';
        textEl.style.cssText   = 'color:var(--clr-text-light);font-style:italic;margin-bottom:20px;';
        textEl.textContent     = `"${newText}"`;
        restoreButtons();
      });

      document.getElementById(`card-cancel-${username}`).addEventListener('click', () => {
        textEl.contentEditable = 'false';
        textEl.style.cssText   = 'color:var(--clr-text-light);font-style:italic;margin-bottom:20px;';
        textEl.textContent     = `"${savedTxt}"`;
        restoreButtons();
      });
    });

    // Delete
    actionsEl.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
      showDialog({
        title: 'Delete Review?',
        message: 'Are you sure you want to delete your review? This action cannot be undone.',
        type: 'confirm',
        icon: '🗑️',
        onConfirm: () => {
          delete allComments[username];
          localStorage.setItem('skillSwapTestimonials', JSON.stringify(allComments));
          card.remove();
          if (container) {
            container.innerHTML = `
              <div style="padding:20px;background:var(--clr-bg-alt);border-radius:var(--radius-lg);text-align:center;color:var(--clr-text-light);font-size:.9rem;">
                Your review has been deleted.
              </div>`;
          }
        }
      });
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Restore persisted comments on every page load ─────────────────────
  (function restorePersistedComments() {
    const allComments = JSON.parse(localStorage.getItem('skillSwapTestimonials') || '{}');
    const container   = document.getElementById('testimonial-form-container');
    Object.entries(allComments).forEach(([user, entry]) => {
      const isOwn    = user === currentUser;
      const text     = typeof entry === 'object' ? entry.text   : entry;
      const rating   = typeof entry === 'object' ? entry.rating : 5;
      appendTestimonialCard(text, rating, user, isOwn, container, allComments);
    });
  })();

}); // end DOMContentLoaded
