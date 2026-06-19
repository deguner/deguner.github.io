/*[cite: 8] */
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
   BGM System
   ========================================================================== */
const BGM_Audio = (() => {
  // Add your page IDs and specific songs here!
  const tracks = {
    'game-foodiemon': { src: 'assets/audio/Weevil - Camiidae.mp3', name: 'Weevil - Camiidae' },
    'game-bong-bang': { src: 'assets/audio/bongbang.mp3', name: 'キュートテクノポップ - マニーラさん' },
    'game-envicard': { src: 'assets/audio/envicard.mp3', name: 'かえるのピアノ - こおろぎ' },
    'game-make-me-laugh': { src: 'assets/audio/cutecute.mp3', name: 'cute cute - shimtoneさん' }
  };

  let isUserMuted = false;
  let targetVolume = 0.3;
  let fadeInterval = null;

  function init() {
    const toggleBtn = document.getElementById('bgm-toggle');
    const audioEl = document.getElementById('bgm-audio');
    const volSlider = document.getElementById('bgm-volume');
    
    if (!toggleBtn || !audioEl) return;

    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        targetVolume = parseFloat(e.target.value);
        if (!audioEl.paused) audioEl.volume = targetVolume;
      });
    }

    toggleBtn.addEventListener('click', () => {
      if (audioEl.paused) {
        isUserMuted = false;
        fadeInPlay(audioEl);
        updateIcon(true);
      } else {
        audioEl.pause();
        isUserMuted = true;
        updateIcon(false);
      }
    });
  }

  function fadeInPlay(audioEl) {
    clearInterval(fadeInterval);
    audioEl.volume = 0;
    
    audioEl.play().then(() => {
      fadeInterval = setInterval(() => {
        if (audioEl.volume < targetVolume - 0.02) {
          audioEl.volume += 0.02;
        } else {
          audioEl.volume = targetVolume;
          clearInterval(fadeInterval);
        }
      }, 100); 
    }).catch(() => {
      updateIcon(false);
    });
  }

  function updateIcon(isPlaying) {
    const icon = document.getElementById('bgm-icon');
    if (icon) icon.className = isPlaying ? 'fas fa-pause text-xs' : 'fas fa-play text-xs ml-0.5';
  }

  function playTrackForPage(pageId) {
    const widget = document.getElementById('bgm-widget');
    const audioEl = document.getElementById('bgm-audio');
    const nameEl = document.getElementById('bgm-name');
    const track = tracks[pageId];

    if (!widget || !audioEl) return;

    if (track) {
      widget.classList.remove('hidden');
      widget.classList.add('flex');
      
      if (audioEl.getAttribute('src') !== track.src) {
        audioEl.src = track.src;
        nameEl.textContent = track.name;
        
        if (!isUserMuted) {
          fadeInPlay(audioEl);
          updateIcon(true);
        }
      }
    } else {
      widget.classList.remove('flex');
      widget.classList.add('hidden');
      audioEl.pause();
      updateIcon(false);
    }
  }

  return { init, playTrackForPage };
})();

function navigateTo(pageId, sectionId = null) {
  const targetPage = document.getElementById('page-' + pageId);
  const isAlreadyOnPage = targetPage && targetPage.classList.contains('active');

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  if (targetPage) targetPage.classList.add('active');

  document.querySelectorAll('.nav-item[data-page], .nav-child[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });

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

  BGM_Audio.playTrackForPage(pageId);
  closeMobileNav();

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

  if (sectionId) {
    if (isAlreadyOnPage) {
      const sectionEl = document.getElementById(sectionId);
      if (sectionEl) {
        const yPosition = sectionEl.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: yPosition - 64, behavior: 'smooth' });
      }
    } else {
      window.scrollTo(0, 0); 
      setTimeout(() => {
        const sectionEl = document.getElementById(sectionId);
        if (sectionEl) {
          const yPosition = sectionEl.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: yPosition - 96, behavior: 'smooth' });
        }
      }, 350); 
    }
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function handleInitialRoute() {
  const hash = window.location.hash.substring(1); 
  
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
      navigateTo('work');
    }
  } else {
    navigateTo('work');
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

document.addEventListener('DOMContentLoaded', () => {

  BGM_Audio.init();
  
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

  const siteTitle = document.getElementById('site-title');
  if (siteTitle) {
    siteTitle.addEventListener('click', () => navigateTo('work'));
  }

  handleInitialRoute();

  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('mouseenter', () => UI_Audio.play(1200, 200, 0.015));
    el.addEventListener('click', () => UI_Audio.play(800, 100, 0.025));
  });

  document.querySelectorAll('.nav-child').forEach(el => {
    el.addEventListener('mouseenter', () => UI_Audio.play(1400, 200, 0.015));
    el.addEventListener('click', () => UI_Audio.play(600, 100, 0.025));
  });

  document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('mouseenter', () => UI_Audio.play(400, 200, 0.02));
    card.addEventListener('click', () => UI_Audio.play(300, 100, 0.035));
  });

  document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => UI_Audio.play(1400, 200, 0.015));
    btn.addEventListener('click', () => UI_Audio.play(600, 100, 0.025));
  });

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

    card.addEventListener('mouseenter', () => UI_Audio.play(400, 200, 0.02));
    card.addEventListener('click', () => UI_Audio.play(300, 100, 0.035));
  });

  document.querySelectorAll('.card-action-btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => UI_Audio.play(900, 450, 0.015));

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation(); 
      UI_Audio.play(700, 150, 0.02);

      const targetPageId = btn.getAttribute('data-target-page') || btn.closest('.member-card').getAttribute('onclick').match(/'([^']+)'/)[1];
      const targetSection = btn.getAttribute('data-target-section');
      
      navigateTo(targetPageId, targetSection);
    });
  });

  window.addEventListener('popstate', handleInitialRoute);

  document.addEventListener('contextmenu', function(e) {
    if (e.target.nodeName === 'IMG' || e.target.nodeName === 'VIDEO') {
      e.preventDefault();
    }
  });

  const lightbox = document.getElementById('global-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxVid = document.getElementById('lightbox-vid');
  let currentGalleryImages = [];
  let currentImageIndex = 0;
  let activeGalleryElement = null; 
  let autoSlideTimers = {};

  const videoProgress = {};

  const galleryData = {
    'meowknight': [
      'assets/video/meowknight-title.mp4',
      'assets/video/meowknight-1.mp4',
      'assets/video/meowknight-2.mp4',
      'assets/meowknight-p1.webp',
      'assets/meowknight-p2.webp',
      'assets/meowknight-p3.webp',
    ],
    'poppit': [
      'assets/video/poppitarena.mp4',
      'assets/poppit-p1.webp',
      'assets/poppit-p2.webp',
      'assets/poppit-p3.webp',
      'assets/poppit-p4.webp',
    ],
    'prototypes': [
      'assets/video/minions.mp4',
      'assets/video/tale.mp4',
      'assets/video/date.mp4',
      'assets/video/portal.mp4',
      'assets/video/characters.mp4',
      'assets/video/ball.mp4',
      'assets/video/wizard.mp4',
      'assets/video/light.mp4',
      'assets/light-p.webp',
    ],
    'fable': [
      'assets/fable/0.webp',
      'assets/fable/1.webp',
      'assets/fable/2.webp',
      'assets/fable/3.webp',
      'assets/fable/4.webp',
      'assets/fable/5.webp',
      'assets/fable/6.webp',
      'assets/fable/7.webp',
    ],
    'province': [
      'assets/province/WKF_NAM_DONGBANGSONGCUULONG_14.9-06.webp',
      'assets/province/WKF_NAM_DONGBANGSONGCUULONG_14.9-07.webp',
      'assets/province/WKF_NAM_DONGBANGSONGCUULONG_14.9-08.webp',
      'assets/province/WKF_NAM_DONGBANGSONGCUULONG_14.9-10.webp',
      'assets/province/WKF_NAM_DONGBANGSONGCUULONG_14.9-11.webp',
      'assets/province/WKF_NAM_DONGBANGSONGCUULONG_14.9-12.webp',
      'assets/province/WKF_NAM_DONGBANGSONGCUULONG_14.9-13.webp',
      'assets/province/WKF_TRUNG_TAYNGUYEN_8.9-01.webp',
      'assets/province/WKF_TRUNG_TAYNGUYEN_8.9-02.webp',
      'assets/province/WKF_TRUNG_TAYNGUYEN_8.9-03.webp',
      'assets/province/WKF_TRUNG_TAYNGUYEN_8.9-04.webp',
      'assets/province/WKF_TRUNG_TAYNGUYEN_8.9-05.webp',
    ],
  };

  const isVideo = (src) => {
    if (!src) return false;
    return src.toLowerCase().endsWith('.mp4') || src.toLowerCase().endsWith('.webm');
  };

  function updateGallery(gallery, newIndex, skipScroll = false) {
    const thumbs = gallery.querySelectorAll('.gallery-thumb');
    const mainImg = gallery.querySelector('img[id$="-main-img"]');
    const mainVid = gallery.querySelector('video[id$="-main-vid"]');
    if (!thumbs.length) return;
    
    if (newIndex >= thumbs.length) newIndex = 0;
    if (newIndex < 0) newIndex = thumbs.length - 1;
    
    const targetThumb = thumbs[newIndex];
    const src = targetThumb.getAttribute('data-full');
    
    const oldIndex = parseInt(gallery.getAttribute('data-current-index') || 0);
    const oldSrc = thumbs[oldIndex] ? thumbs[oldIndex].getAttribute('data-full') : null;
    
    if (oldSrc && isVideo(oldSrc) && !skipScroll) {
        videoProgress[oldSrc] = mainVid.currentTime;
    }

    gallery.setAttribute('data-current-index', newIndex); 
    
    if (isVideo(src)) {
        mainImg.classList.add('hidden');
        mainVid.classList.remove('hidden');
        
        if (mainVid.getAttribute('src') !== src) {
            mainVid.setAttribute('src', src);
            mainVid.load();
            mainVid.onloadedmetadata = () => {
                if (videoProgress[src]) mainVid.currentTime = videoProgress[src];
                mainVid.play().catch(() => {});
            };
        } else {
            if (videoProgress[src]) mainVid.currentTime = videoProgress[src];
            mainVid.play().catch(() => {});
        }
    } else {
        mainVid.classList.add('hidden');
        mainVid.pause();
        mainImg.classList.remove('hidden');
        mainImg.src = src;
    }

    thumbs.forEach(t => {
      t.classList.remove('border-accent', 'opacity-100');
      t.classList.add('border-transparent', 'opacity-60');
    });
    targetThumb.classList.remove('border-transparent', 'opacity-60');
    targetThumb.classList.add('border-accent', 'opacity-100');
    
    if (!skipScroll) {
        const thumbWrap = targetThumb.parentElement; 
        const thumbContainer = thumbWrap.parentElement;
        const scrollPos = thumbWrap.offsetLeft - (thumbContainer.clientWidth / 2) + (thumbWrap.clientWidth / 2);
        thumbContainer.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }

    startAutoSlide(gallery);
  }

  function startAutoSlide(gallery) {
    const galleryId = gallery.getAttribute('data-gallery-id');
    clearInterval(autoSlideTimers[galleryId]);
    
    // autoSlideTimers[galleryId] = setInterval(() => {
    //   if (activeGalleryElement === gallery && !lightbox.classList.contains('hidden')) return;
      
    //   const currentIndex = parseInt(gallery.getAttribute('data-current-index') || 0);
    //   const images = galleryData[galleryId];
      
    //   if (images && isVideo(images[currentIndex])) return;

    //   updateGallery(gallery, currentIndex + 1);
    // }, 4000); 
  }

  document.querySelectorAll('.project-gallery').forEach(gallery => {
    const galleryId = gallery.getAttribute('data-gallery-id');
    const images = galleryData[galleryId];

    if (images && images.length > 0) {
      let thumbsHtml = '';
      
      images.forEach((src, index) => {
        const isActive = index === 0 ? 'border-accent opacity-100' : 'border-transparent opacity-60 hover:opacity-100';
        
        if (isVideo(src)) {
            thumbsHtml += `
            <div class="relative flex-shrink-0 snap-start w-28 h-20 cursor-pointer">
              <video draggable="false" oncontextmenu="return false;" oncopy="return false;" disablePictureInPicture controlsList="nodownload" src="${src}#t=0.1" data-full="${src}" class="gallery-thumb select-none w-full h-full object-cover rounded-lg shadow-sm border-[3px] ${isActive} transition-opacity pointer-events-none" muted playsinline></video>
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <i class="fas fa-play-circle text-white/90 text-3xl drop-shadow-md"></i>
              </div>
            </div>`;
        } else {
            thumbsHtml += `
            <div class="relative flex-shrink-0 snap-start w-28 h-20 cursor-pointer">
              <img src="${src}" alt="Documents Not Found" onerror="this.onerror=null; this.src='assets/notfound.webp';" draggable="false" oncontextmenu="return false;" oncopy="return false;" data-full="${src}" class="gallery-thumb select-none w-full h-full object-cover rounded-lg shadow-sm border-[3px] ${isActive} transition-opacity pointer-events-none" />
            </div>`;
        }
      });

      gallery.innerHTML = `
        <div class="main-preview-container w-full h-[300px] sm:h-[450px] rounded-xl overflow-hidden shadow-md border-[1.5px] border-gray-200 dark:border-[#242220] mb-4 bg-gray-100 dark:bg-[#1a1917] relative group flex items-center justify-center cursor-zoom-in">
          <img id="${galleryId}-main-img" alt="Documents Not Found" onerror="this.onerror=null; this.src='assets/notfound.webp';" draggable="false" oncontextmenu="return false;" oncopy="return false;" src="" class="select-none w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02] hidden" />
          <video id="${galleryId}-main-vid" draggable="false" oncontextmenu="return false;" oncopy="return false;" disablePictureInPicture controlsList="nodownload" src="" class="w-full h-full object-contain hidden pointer-events-none" muted loop playsinline></video>
          <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-black/20">
            <i class="fas fa-expand text-white text-4xl drop-shadow-lg"></i>
          </div>
          <button class="gallery-nav-btn absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-accent text-white w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10" data-dir="-1"><i class="fas fa-chevron-left"></i></button>
          <button class="gallery-nav-btn absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-accent text-white w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10" data-dir="1"><i class="fas fa-chevron-right"></i></button>
        </div>
        <div class="flex gap-3 overflow-x-auto pb-2 snap-x" style="scrollbar-width: none;">
          ${thumbsHtml}
        </div>
      `;
    }

    gallery.querySelectorAll('.gallery-thumb').forEach((thumb, index) => {
      thumb.parentElement.addEventListener('click', () => updateGallery(gallery, index));
    });

    const mainContainer = gallery.querySelector('.main-preview-container');
    if (mainContainer) {
      mainContainer.addEventListener('click', (e) => {
        if (e.target.closest('.gallery-nav-btn')) {
            const dir = parseInt(e.target.closest('.gallery-nav-btn').getAttribute('data-dir'));
            const currentIndex = parseInt(gallery.getAttribute('data-current-index') || 0);
            updateGallery(gallery, currentIndex + dir);
            return;
        }

        if (!lightbox) return;
        activeGalleryElement = gallery; 
        
        const thumbs = gallery.querySelectorAll('.gallery-thumb');
        currentGalleryImages = Array.from(thumbs).map(t => t.getAttribute('data-full'));
        currentImageIndex = parseInt(gallery.getAttribute('data-current-index') || 0);
        
        const currentSrc = currentGalleryImages[currentImageIndex];
        if (isVideo(currentSrc)) {
            const mainVid = gallery.querySelector('video[id$="-main-vid"]');
            videoProgress[currentSrc] = mainVid.currentTime;
            mainVid.pause();
        }

        loadLightboxMedia(currentImageIndex);
        
        lightbox.classList.remove('hidden');
        setTimeout(() => lightbox.classList.remove('opacity-0'), 10);
        document.body.style.overflow = 'hidden'; 
      });
    }

    if (images && images.length > 0) {
        updateGallery(gallery, 0, true);
    }
  });

  function loadLightboxMedia(index) {
    const src = currentGalleryImages[index];
    if (isVideo(src)) {
        lightboxImg.classList.add('hidden');
        lightboxVid.classList.remove('hidden');

        if (lightboxVid.getAttribute('src') !== src) {
            lightboxVid.setAttribute('src', src);
            lightboxVid.load();
            lightboxVid.onloadedmetadata = () => {
                if (videoProgress[src]) lightboxVid.currentTime = videoProgress[src];
                lightboxVid.play().catch(()=>{});
            };
        } else {
            if (videoProgress[src]) lightboxVid.currentTime = videoProgress[src];
            lightboxVid.play().catch(()=>{});
        }
    } else {
        lightboxVid.classList.add('hidden');
        lightboxVid.pause();
        lightboxImg.classList.remove('hidden');
        lightboxImg.src = src;
    }
  }

  function slideLightbox(direction) {
    if (currentGalleryImages.length === 0) return;
    
    const oldSrc = currentGalleryImages[currentImageIndex];
    if (isVideo(oldSrc)) {
        videoProgress[oldSrc] = lightboxVid.currentTime;
        lightboxVid.pause();
    }

    currentImageIndex = (currentImageIndex + direction + currentGalleryImages.length) % currentGalleryImages.length;
    loadLightboxMedia(currentImageIndex);
  }

  function closeLightbox() {
    if (currentGalleryImages && currentGalleryImages.length > 0) {
      const currentSrc = currentGalleryImages[currentImageIndex];
      if (currentSrc && isVideo(currentSrc)) {
          videoProgress[currentSrc] = lightboxVid.currentTime;
          lightboxVid.pause();
      }
    }

    if (activeGalleryElement) {
      updateGallery(activeGalleryElement, currentImageIndex, true); 
      activeGalleryElement = null; 
    }

    const lbModel = document.getElementById('lightbox-model');
    const pBtn = document.getElementById('lightbox-prev');
    const nBtn = document.getElementById('lightbox-next');
    const animBox = document.getElementById('model-animation-container');

    if (lbModel && !lbModel.classList.contains('hidden')) {
      lbModel.classList.add('hidden');
      lbModel.removeAttribute('src'); 
    }
    if (pBtn) pBtn.style.display = '';
    if (nBtn) nBtn.style.display = '';
    if (animBox) {
      animBox.classList.add('hidden');
      animBox.classList.remove('flex');
    }

    lightbox.classList.add('opacity-0');
    setTimeout(() => {
      lightbox.classList.add('hidden');
      document.body.style.overflow = ''; 
    }, 300);

    if (animBox) {
      animBox.style.display = 'none';
    }
  }

  document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);
  document.getElementById('lightbox-next')?.addEventListener('click', () => slideLightbox(1));
  document.getElementById('lightbox-prev')?.addEventListener('click', () => slideLightbox(-1));

  document.addEventListener('keydown', (e) => {
    if (!lightbox || lightbox.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') slideLightbox(1);
    if (e.key === 'ArrowLeft') slideLightbox(-1);
  });

  /* ==========================================================================
     Dynamic Art Mosaic Generator & Lightbox (Key-Value Dictionary)
     ========================================================================== */
  
  const showcaseList = {
    'chardes': [
      'assets/chardes/1.webp',
      'assets/chardes/2.webp',
      'assets/chardes/3.webp',
      'assets/chardes/4.webp',
      'assets/chardes/5.webp',
      'assets/chardes/6.webp',
      'assets/chardes/7.webp',
      'assets/chardes/8.webp'
    ],
    'illustration': [
      'assets/illustration/4.webp',
      'assets/illustration/5.webp',
      'assets/illustration/6.webp',
      'assets/illustration/1.webp',
      'assets/illustration/2.webp',
      'assets/illustration/3.webp',
      'assets/illustration/7.webp',
      'assets/illustration/8.webp',
      'assets/illustration/9.webp',
      'assets/illustration/10.webp',
      'assets/illustration/11.webp',
      'assets/illustration/12.webp',
      'assets/illustration/13.webp',
    ]
  };

  function buildLeftToRightGalleries() {
    const wrappers = document.querySelectorAll('.art-gallery-wrapper');
    if (wrappers.length === 0) return;

    // 1. Locked to exactly 3 columns
    const cols = 3; 

    wrappers.forEach(wrapper => {
      const collectionTitle = wrapper.getAttribute('data-showcase');
      const images = showcaseList[collectionTitle]; // Assuming showcaseList is defined elsewhere
      
      if (images) {
        // Create 3 empty arrays
        const columnsHtml = Array.from({ length: cols }, () => '');
        
        // Deal images left-to-right (Round-Robin)
        images.forEach((src, index) => {
          const colIndex = index % cols; 
          
          columnsHtml[colIndex] += `
            <div class="mb-4 rounded-xl overflow-hidden shadow-md border-[1.5px] border-gray-200 dark:border-[#242220] group cursor-zoom-in relative art-item" data-collection="${collectionTitle}" data-index="${index}">
              <img src="${src}" data-full="${src}" class="w-full h-auto block transition-transform duration-500 group-hover:scale-105" alt="${collectionTitle}" draggable="false" oncontextmenu="return false;" oncopy="return false;">
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center pointer-events-none">
                <i class="fas fa-expand text-white text-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-md"></i>
              </div>
            </div>
          `;
        });
        
        // Apply Flex CSS 
        wrapper.className = 'art-gallery-wrapper flex flex-row gap-4 w-full';
        
        // IMPORTANT: Ensure wrapper.style is cleared of old grid properties if they were applied elsewhere
        wrapper.style.gridTemplateColumns = ''; 
        wrapper.style.display = ''; 
        
        // Wrap each column's HTML in a flex-col div, and use 'flex-1' so they equally share the 3-column width
        wrapper.innerHTML = columnsHtml.map(col => `<div class="flex flex-col flex-1 w-full">${col}</div>`).join('');
      }
    });

    if (typeof attachLightboxListeners === 'function') {
      attachLightboxListeners();
    }
}

  function attachLightboxListeners() {
    document.querySelectorAll('.art-gallery-wrapper .art-item').forEach((item) => {
      item.addEventListener('click', () => {
        const collectionName = item.getAttribute('data-collection');
        const clickedIndex = parseInt(item.getAttribute('data-index'));
        
        currentGalleryImages = showcaseList[collectionName];
        currentImageIndex = clickedIndex;
        activeGalleryElement = null; 
        
        const prevBtn = document.getElementById('lightbox-prev');
        const nextBtn = document.getElementById('lightbox-next');
        const animContainer = document.getElementById('model-animation-container');
        const lightboxModel = document.getElementById('lightbox-model');
        
        if (lightboxModel) { lightboxModel.classList.add('hidden'); lightboxModel.src = ""; }
        if (animContainer) animContainer.style.display = 'none';
        if (prevBtn) prevBtn.style.display = ''; 
        if (nextBtn) nextBtn.style.display = '';

        loadLightboxMedia(currentImageIndex);
        
        const lightbox = document.getElementById('global-lightbox');
        if (lightbox) {
          lightbox.classList.remove('hidden');
          setTimeout(() => lightbox.classList.remove('opacity-0'), 10);
          document.body.style.overflow = 'hidden'; 
        }
      });
    });
  }

  // Build the gallery immediately on load
  buildLeftToRightGalleries();

  /* ==========================================================================
     Standalone Media Lightbox Trigger (Video & GIF)
     ========================================================================== */
  window.openStandaloneMedia = function(element) {
    // 1. Automatically find the video or image source inside the clicked card
    let src = element.getAttribute('data-src');
    if (!src) {
      const vid = element.querySelector('video');
      const img = element.querySelector('img');
      // Remove any #t= metadata from video src so it plays from the beginning
      if (vid) src = (vid.getAttribute('src') || vid.currentSrc).split('#')[0];
      else if (img) src = img.getAttribute('data-full') || img.getAttribute('src');
    }

    if (!src) return;

    // 2. Hide 3D Model UI
    const lbModel = document.getElementById('lightbox-model');
    const animContainer = document.getElementById('model-animation-container');
    if (lbModel) { lbModel.classList.add('hidden'); lbModel.src = ""; }
    if (animContainer) animContainer.style.display = 'none';

    // 3. Hide navigation arrows (since this is a single, standalone item)
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';

    // 4. Hook into your global gallery system
    currentGalleryImages = [src];
    currentImageIndex = 0;
    activeGalleryElement = null;

    // 5. Load it using your existing robust media function!
    loadLightboxMedia(0);

    // 6. Unmute the lightbox video (since autoplaying previews are usually muted)
    if (lightboxVid) lightboxVid.muted = false;

    // 7. Reveal the Lightbox
    if (lightbox) {
      lightbox.classList.remove('hidden');
      setTimeout(() => lightbox.classList.remove('opacity-0'), 10);
      document.body.style.overflow = 'hidden'; 
    }
  };
});


window.openModelLightbox = function(btn) {
  const src = btn.getAttribute('data-src');
  if (!src) return;

  const lightbox = document.getElementById('global-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxVid = document.getElementById('lightbox-vid');
  const lightboxModel = document.getElementById('lightbox-model');
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');
  
  const animContainer = document.getElementById('model-animation-container');
  const animSelect = document.getElementById('animation-select');

  if (lightboxImg) lightboxImg.classList.add('hidden');
  if (lightboxVid) {
      lightboxVid.classList.add('hidden');
      lightboxVid.pause();
  }
  if (prevBtn) prevBtn.style.display = 'none';
  if (nextBtn) nextBtn.style.display = 'none';

  if (animContainer) animContainer.style.display = 'none';
  if (animSelect) animSelect.innerHTML = '<option value="">Loading...</option>';

  if (lightboxModel) {
    lightboxModel.classList.remove('hidden');
    lightboxModel.src = src;
    
    let attempts = 0;
    const checkAnimations = setInterval(() => {
      attempts++;
      const animations = lightboxModel.availableAnimations;
      
      if (animations && animations.length > 0) {
        clearInterval(checkAnimations); 
        
        if (animSelect && animContainer) {
          animSelect.innerHTML = ''; 
          animations.forEach(anim => {
            const opt = document.createElement('option');
            opt.value = anim;
            opt.textContent = anim;
            opt.className = "bg-white text-gray-900 dark:bg-[#111110] dark:text-white"; 
            animSelect.appendChild(opt);
          });
          
          animContainer.style.display = 'flex';
          lightboxModel.animationName = animations[0];
          lightboxModel.play();
        }
      } else if (attempts > 20) {
        clearInterval(checkAnimations); 
      }
    }, 100);

    if (animSelect) {
      animSelect.onchange = (e) => {
        lightboxModel.animationName = e.target.value;
        lightboxModel.play();
      };
    }
  }

  if (lightbox) {
    lightbox.classList.remove('hidden');
    setTimeout(() => lightbox.classList.remove('opacity-0'), 10);
    document.body.style.overflow = 'hidden'; 
  }
};