/* ==========================================================================
   1. Audio & Sound System
   ========================================================================== */
const UI_Audio = (() => {
  let ctx = null;
  let isPlaying = false;
  let enabled = true;
  
  const cooldownMs = 120; 

  function init() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  }

  function play(startFreq = 800, endFreq = 100, duration = 0.02) {
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
      
      if (hasActiveChild && !parent.classList.contains('open')) {
        parent.classList.add('open');
        children.classList.add('open');
      }
    }
  });

  closeMobileNav();

  // 4. Update the URL Hash
  if (pageId === 'work' && !sectionId) {
    if (window.location.hash) {
      window.history.pushState(null, '', window.location.pathname); 
    }
  } else {
    const newHash = sectionId ? `#${sectionId}` : `#${pageId}`;
    if (window.location.hash !== newHash) {
      window.history.pushState(null, '', newHash);
    }
  }

  // 5. Handle Scrolling (Bulletproof Method)
  if (sectionId) {
    window.scrollTo(0, 0); // Snap to top to calculate math cleanly
    
    setTimeout(() => {
      const sectionEl = document.getElementById(sectionId);
      if (sectionEl) {
        const yPosition = sectionEl.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: yPosition - 96, behavior: 'smooth' });
      } else {
        console.warn("Could not find section:", sectionId);
      }
    }, 350); // Wait for page fade-in animation to finish
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function handleInitialRoute() {
  const hash = window.location.hash.substring(1); 
  
  // FIX: Navigate directly to the 'work' page instead of calling itself in an infinite loop!
  if (!hash) {
    navigateTo('work'); 
    return;
  }

  if (document.getElementById('page-' + hash)) {
    navigateTo(hash);
  } else if (document.getElementById(hash)) {
    let targetPage = '';
    if (hash.startsWith('kiet-')) targetPage = 'member-kiet';
    if (hash.startsWith('trang-')) targetPage = 'member-trang';
    
    if (targetPage) {
      navigateTo(targetPage, hash);
    } else {
      navigateTo('work'); // Fallback to home if the link is broken
    }
  } else {
    navigateTo('work'); // Fallback to home if the link is broken
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

  // DEGUNER title → home
  const siteTitle = document.getElementById('site-title');
  if (siteTitle) {
    siteTitle.addEventListener('click', () => {
      navigateTo('work');
    });
  }

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

  // --- Game Cards Audio ---
  document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('mouseenter', () => UI_Audio.play(400, 200, 0.02));
    card.addEventListener('click', () => UI_Audio.play(300, 100, 0.035));
  });

  // --- Social Buttons Audio ---
  document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => UI_Audio.play(1400, 200, 0.015));
    btn.addEventListener('click', () => UI_Audio.play(600, 100, 0.025));
  });

  // --- Toggles ---
  const soundBtn = document.getElementById('sound-toggle');
  const soundIcon = document.getElementById('sound-icon');
  const soundLabel = document.getElementById('sound-label');

  if (soundBtn) {
    soundBtn.classList.add('sound-on'); 
    soundBtn.addEventListener('click', () => {
      const on = UI_Audio.toggle();
      if (soundIcon) soundIcon.className = on ? 'fas fa-volume-up' : 'fas fa-volume-mute';
      if (soundLabel) soundLabel.textContent = on ? 'SOUND ON' : 'SOUND OFF';
      soundBtn.classList.toggle('sound-on', on);
    });

    soundBtn.addEventListener('mouseenter', () => UI_Audio.play(1400, 200, 0.015));
    soundBtn.addEventListener('click', () => UI_Audio.play(600, 100, 0.025));
  }

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

  // --- Card Hover, Tilt & Shine Effect ---
  document.querySelectorAll('.member-card').forEach(card => {
    const MAX_TILT = parseFloat(card.dataset.tilt) || 10;
    const avatar   = card.querySelector('.member-avatar');

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = (e.clientX - cx) / (rect.width  / 2);
      const dy   = (e.clientY - cy) / (rect.height / 2);

      card.style.setProperty('--rotate-x', `${-dy * MAX_TILT}deg`);
      card.style.setProperty('--rotate-y', `${ dx * MAX_TILT}deg`);

      const shinePos = ((dx + 1) / 2) * 0.6 + ((dy + 1) / 2) * 0.4;
      if (avatar) avatar.style.setProperty('--shine-pos', shinePos);
    });

    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--rotate-x', '0deg');
      card.style.setProperty('--rotate-y', '0deg');
      if (avatar) avatar.style.setProperty('--shine-pos', '-1');
    });

    // Card Audio
    card.addEventListener('mouseenter', () => UI_Audio.play(400, 200, 0.02));
    card.addEventListener('click', () => UI_Audio.play(300, 100, 0.035));
  });

  // --- Card Action Buttons Logic ---
  document.querySelectorAll('.card-action-btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => UI_Audio.play(900, 450, 0.015));

    btn.addEventListener('click', (e) => {
      // Prevent the card click audio/action from firing
      e.preventDefault();
      e.stopPropagation(); 
      UI_Audio.play(700, 150, 0.02);

      const targetPageId = btn.getAttribute('data-target-page');
      const targetSection = btn.getAttribute('data-target-section');
      
      // Directly navigate to exactly what is written in the HTML!
      navigateTo(targetPageId, targetSection);
    });
  });

  window.addEventListener('popstate', handleInitialRoute);

  // Disable right-click on all images to deter downloading
  document.addEventListener('contextmenu', function(e) {
    if (e.target.nodeName === 'IMG') {
      e.preventDefault();
    }
  });

  // --- Gallery & Lightbox System ---
  const lightbox = document.getElementById('global-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  let currentGalleryImages = [];
  let currentImageIndex = 0;
  let activeGalleryElement = null; // Tracks which gallery opened the lightbox
  let autoSlideTimers = {}; // Tracks auto-slide intervals

  // Helper function to thoroughly update a gallery's visual state
  function updateGallery(gallery, newIndex) {
    const thumbs = gallery.querySelectorAll('.gallery-thumb');
    const mainImg = gallery.querySelector('img[id^="main-img-"]');
    
    // Wrap around logic
    if (newIndex >= thumbs.length) newIndex = 0;
    if (newIndex < 0) newIndex = thumbs.length - 1;
    
    const targetThumb = thumbs[newIndex];
    
    // Update main preview image
    mainImg.src = targetThumb.getAttribute('data-full');
    mainImg.setAttribute('data-index', newIndex);

    // Update thumbnail styles
    thumbs.forEach(t => {
      t.classList.remove('border-accent', 'opacity-100');
      t.classList.add('border-transparent', 'opacity-60');
    });
    targetThumb.classList.remove('border-transparent', 'opacity-60');
    targetThumb.classList.add('border-accent', 'opacity-100');
    
    // FIX: Strictly scroll ONLY the thumbnail container horizontally (prevents vertical page jumping)
    const thumbContainer = targetThumb.parentElement;
    const scrollPos = targetThumb.offsetLeft - (thumbContainer.clientWidth / 2) + (targetThumb.clientWidth / 2);
    thumbContainer.scrollTo({ left: scrollPos, behavior: 'smooth' });

    // Reset the auto-slide timer
    startAutoSlide(gallery);
  }

  // Helper function to handle the 4-second Auto-Slide Carousel
  function startAutoSlide(gallery) {
    const galleryId = gallery.getAttribute('data-gallery-id');
    clearInterval(autoSlideTimers[galleryId]);
    
    autoSlideTimers[galleryId] = setInterval(() => {
      // Pause the carousel if the user is currently viewing this gallery in Fullscreen
      if (activeGalleryElement === gallery && !lightbox.classList.contains('hidden')) return;
      
      const mainImg = gallery.querySelector('img[id^="main-img-"]');
      const currentIndex = parseInt(mainImg.getAttribute('data-index') || 0);
      updateGallery(gallery, currentIndex + 1);
    }, 4000); // 4000ms = 4 seconds!
  }

  // 1. Initialize all galleries on the page
  document.querySelectorAll('.project-gallery').forEach(gallery => {
    startAutoSlide(gallery);

    // Thumbnail Clicks
    gallery.querySelectorAll('.gallery-thumb').forEach((thumb, index) => {
      thumb.addEventListener('click', () => updateGallery(gallery, index));
    });

    // Inline Prev/Next Button Clicks
    gallery.querySelectorAll('.gallery-nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Crucial: Stop the click from opening the fullscreen lightbox!
        const dir = parseInt(btn.getAttribute('data-dir'));
        const mainImg = gallery.querySelector('img[id^="main-img-"]');
        const currentIndex = parseInt(mainImg.getAttribute('data-index') || 0);
        updateGallery(gallery, currentIndex + dir);
      });
    });

    // Click main image to open Fullscreen Lightbox
    const mainPreview = gallery.querySelector('img[id^="main-img-"]');
    mainPreview.addEventListener('click', () => {
      if (!lightbox) return;
      activeGalleryElement = gallery; // Remember exactly which gallery we are looking at
      
      const thumbs = gallery.querySelectorAll('.gallery-thumb');
      currentGalleryImages = Array.from(thumbs).map(t => t.getAttribute('data-full'));
      currentImageIndex = parseInt(mainPreview.getAttribute('data-index'));

      lightboxImg.src = currentGalleryImages[currentImageIndex];
      
      lightbox.classList.remove('hidden');
      setTimeout(() => lightbox.classList.remove('opacity-0'), 10);
      document.body.style.overflow = 'hidden'; // Stop background page scrolling
    });
  });

  // 2. Lightbox Navigation (Buttons & Keyboard)
  function closeLightbox() {
    // FIX: Sync the main gallery IMMEDIATELY while the screen is still black!
    if (activeGalleryElement) {
      updateGallery(activeGalleryElement, currentImageIndex);
      activeGalleryElement = null; // Clear it out
    }

    lightbox.classList.add('opacity-0');
    setTimeout(() => {
      lightbox.classList.add('hidden');
      document.body.style.overflow = ''; // Restore background scrolling
    }, 300);
  }

  function slideLightbox(direction) {
    if (currentGalleryImages.length === 0) return;
    currentImageIndex = (currentImageIndex + direction + currentGalleryImages.length) % currentGalleryImages.length;
    lightboxImg.src = currentGalleryImages[currentImageIndex];
  }

  document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);
  document.getElementById('lightbox-next')?.addEventListener('click', () => slideLightbox(1));
  document.getElementById('lightbox-prev')?.addEventListener('click', () => slideLightbox(-1));

  lightbox?.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox(); 
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox || lightbox.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') slideLightbox(1);
    if (e.key === 'ArrowLeft') slideLightbox(-1);
  });
});