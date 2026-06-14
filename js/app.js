/* ==========================================================================
   1. Audio & Sound System
   ========================================================================== */
const UI_Audio = (() => {
  let ctx = null;
  let isPlaying = false;
  let enabled = true;
  
  // The minimum time (in milliseconds) between sounds.
  // Increase this if you want it to trigger even less frequently.
  const cooldownMs = 120; 

  function init() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  }

  function play(startFreq = 800, endFreq = 100, duration = 0.02) {
    // If a sound is playing OR we are in the cooldown period, ignore the request
    if (isPlaying || !enabled) return;      
    init();
    
    isPlaying = true;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine'; 
    
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.start();
    osc.stop(ctx.currentTime + duration);

    // Instead of resetting immediately when the sound ends, 
    // we wait for the longer cooldown period.
    setTimeout(() => {
      isPlaying = false;
    }, cooldownMs); 
  }

  function toggle() {          
    enabled = !enabled;
    return enabled;
  }

  return { play, toggle };
})();

/* ==========================================================================
   2. Navigation & UI Logic
   ========================================================================== */
function navigateTo(pageId, sectionId = null) {
  // 1. Hide all pages and show the target page
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');

  // 2. Update direct nav items
  document.querySelectorAll('.nav-item[data-page], .nav-child[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });

  // 3. Activate and expand parent groups in the sidebar
  document.querySelectorAll('.nav-group-header, .nav-item[data-group]').forEach(parent => {
    const children = parent.nextElementSibling;
    if (children) {
      const hasActiveChild = children.querySelector('.nav-child.active');
      const isParentItselfActive = parent.dataset.page === pageId;
      parent.classList.toggle('active', !!hasActiveChild || isParentItselfActive);
      
      // Auto-expand the folder if a child inside it was selected
      if (hasActiveChild && !parent.classList.contains('open')) {
        parent.classList.add('open');
        children.classList.add('open');
      }
    }
  });

  closeMobileNav();

  // 4. Update the URL Hash (UPDATED FOR CLEAN HOME URL)
  if (pageId === 'work' && !sectionId) {
    // If we are going to the default landing page, remove the hash completely
    if (window.location.hash) {
      // window.location.pathname gets the base URL without the # part
      window.history.pushState(null, '', window.location.pathname); 
    }
  } else {
    // For all other pages, add the hash normally
    const newHash = sectionId ? `#${sectionId}` : `#${pageId}`;
    if (window.location.hash !== newHash) {
      window.history.pushState(null, '', newHash);
    }
  }

  // 5. Handle Scrolling
  if (sectionId) {
    setTimeout(() => {
      const sectionEl = document.getElementById(sectionId);
      if (sectionEl) sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function handleInitialRoute() {
  const hash = window.location.hash.substring(1); // Remove the '#'
  
  if (!hash) {
    handleInitialRoute(); // Default home page
    return;
  }

  // Check if the hash is a main page (like #member-kiet or #illustration)
  if (document.getElementById('page-' + hash)) {
    navigateTo(hash);
  } 
  // Check if it's a specific section (like #kiet-cv or #trang-portfolio)
  else if (document.getElementById(hash)) {
    let targetPage = '';
    if (hash.startsWith('kiet-')) targetPage = 'member-kiet';
    if (hash.startsWith('trang-')) targetPage = 'member-trang';
    
    if (targetPage) {
      navigateTo(targetPage, hash);
    } else {
      handleInitialRoute(); // Fallback if section doesn't match a page
    }
  } else {
    handleInitialRoute(); // Fallback if hash doesn't exist
  }
}

function toggleGroup(header) {
  const children = header.nextElementSibling;
  if (!children) return;
  
  const isOpen = header.classList.contains('open');
  header.classList.toggle('open', !isOpen);
  children.classList.toggle('open', !isOpen);
}

function closeMobileNav() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('open');
}

/* ==========================================================================
   3. Initialization & Event Listeners
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  
  // --- Routing & Menus ---
  document.querySelectorAll('.nav-item[data-page], .nav-child[data-page]').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.page));
  });

  document.querySelectorAll('.nav-item[data-group]').forEach(el => {
    el.addEventListener('click', () => toggleGroup(el));
  });

  const mobileToggle = document.getElementById('mobile-nav-toggle');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }

  // Load initial page
  handleInitialRoute();

  // --- Relaxing UI Sounds ---
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('mouseenter', () => UI_Audio.play(1200, 200, 0.015));
    el.addEventListener('click', () => UI_Audio.play(800, 100, 0.025));
  });

  document.querySelectorAll('.nav-child').forEach(el => {
    el.addEventListener('mouseenter', () => UI_Audio.play(1400, 200, 0.015));
    el.addEventListener('click', () => UI_Audio.play(600, 100, 0.025));
  });

  // --- Card Audio & Navigation Logic ---
  document.querySelectorAll('.member-card').forEach(card => {
    
    // 1. Add distinct sounds to the card hover and press
    card.addEventListener('mouseenter', () => {
      // Deeper frequency for card hover: 400 -> 200
      UI_Audio.play(400, 200, 0.02);
    });
    
    card.addEventListener('click', () => {
      // Heavier frequency for card click: 300 -> 100
      UI_Audio.play(300, 100, 0.035);
    });
  });

  // --- Sound Toggle Button ---
  const soundBtn = document.getElementById('sound-toggle');
  const soundIcon = document.getElementById('sound-icon');
  const soundLabel = document.getElementById('sound-label');

  if (soundBtn) {
    soundBtn.classList.add('sound-on'); // Default UI state
    soundBtn.addEventListener('click', () => {
      const on = UI_Audio.toggle();
      if (soundIcon) soundIcon.className = on ? 'fas fa-volume-up' : 'fas fa-volume-mute';
      if (soundLabel) soundLabel.textContent = on ? 'SOUND ON' : 'SOUND OFF';
      soundBtn.classList.toggle('sound-on', on);
    });

    soundBtn.addEventListener('mouseenter', () => UI_Audio.play(1400, 200, 0.015));
    soundBtn.addEventListener('click', () => UI_Audio.play(600, 100, 0.025));
  }

  // --- Dark Theme Toggle Button ---
  const themeBtn = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const themeLabel = document.getElementById('theme-label');

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark');
      if (themeIcon) themeIcon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
      if (themeLabel) themeLabel.textContent = isDark ? 'DARK' : 'LIGHT';
    });

    themeBtn.addEventListener('mouseenter', () => UI_Audio.play(1400, 200, 0.015));
    themeBtn.addEventListener('click', () => UI_Audio.play(600, 100, 0.025));
  }

  // --- Card Hover Effect ---
  document.querySelectorAll('.member-card').forEach(card => {
    
    // Read the tilt value from the HTML data attribute. 
    // If it's missing or invalid, it defaults to 15.
    const maxTilt = parseFloat(card.dataset.tilt) || 15;

    card.addEventListener('pointermove', (e) => {
      const rect = card.getBoundingClientRect();
      
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const xPct = (x / rect.width) * 100;
      const yPct = (y / rect.height) * 100;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Use the maxTilt variable instead of hardcoded numbers
      const rotateX = ((y - centerY) / centerY) * -maxTilt; 
      const rotateY = ((x - centerX) / centerX) * maxTilt;
      
      card.style.setProperty('--rotate-x', `${rotateX}deg`);
      card.style.setProperty('--rotate-y', `${rotateY}deg`);
      card.style.setProperty('--glare-x', `${xPct}%`);
      card.style.setProperty('--glare-y', `${yPct}%`);
    });
    
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rotate-x', '0deg');
      card.style.setProperty('--rotate-y', '0deg');
      card.style.setProperty('--glare-x', '50%');
      card.style.setProperty('--glare-y', '50%');
    });
  });

  // --- Card Action Buttons Logic ---
  document.querySelectorAll('.card-action-btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => UI_Audio.play(900, 450, 0.015));

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      UI_Audio.play(700, 150, 0.02);

      const targetPageId = btn.dataset.targetPage;
      const targetSection = btn.dataset.targetSection;
      
      // Combine prefix and section to create the full ID (e.g., 'kiet-cv')
      const prefix = targetPageId.replace('member-', '');
      const fullSectionId = `${prefix}-${targetSection}`;

      // This one line now handles the page change, sidebar expanding, URL updating, and scrolling!
      navigateTo(targetPageId, fullSectionId);
    });
  });

  window.addEventListener('popstate', handleInitialRoute);
});