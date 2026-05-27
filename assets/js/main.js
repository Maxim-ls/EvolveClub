// --- Конфигурация и состояние ---
const header = document.querySelector('[data-header]');
const snapSections = Array.from(document.querySelectorAll('main > section'));

if (header && !header.querySelector('.header-phone')) {
  const headerAction = header.querySelector('.header-action');
  const headerContactGroup = document.createElement('div');
  const headerPhone = document.createElement('a');
  headerContactGroup.className = 'header-contact-group';
  headerPhone.className = 'header-phone';
  headerPhone.href = 'tel:+79251415010';
  headerPhone.textContent = '+7 (925) 141-50-10';
  headerPhone.setAttribute('aria-label', 'Позвонить +7 (925) 141-50-10');

  if (headerAction) {
    headerAction.before(headerContactGroup);
    headerContactGroup.append(headerPhone, headerAction);
  }
}

const setHeaderState = () => {
  if (!header) return;
  header.classList.toggle('is-scrolled', window.scrollY > 24);
};

setHeaderState();
window.addEventListener('scroll', setHeaderState, { passive: true });

// --- Снэп-скролл секций (Vertical Snapping) ---
let snapLocked = false;
const shouldUseSectionSnap = () => (
  window.matchMedia('(min-width: 1061px) and (hover: hover) and (pointer: fine)').matches
  && navigator.maxTouchPoints === 0
  && !document.body.classList.contains('country-page')
);

// Расчет позиции для скролла к секции с учетом шапки
const getSnapTop = (section) => {
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;
  const sectionTop = section.getBoundingClientRect().top + scrollY;
  return section.classList.contains('hero') ? 0 : sectionTop;
};

const getAnchorTop = (section) => {
  const offset = window.innerWidth <= 760 ? 18 : 0;
  return Math.max(0, getSnapTop(section) - offset);
};

const getCurrentSectionIndex = () => {
  const y = window.pageYOffset || document.documentElement.scrollTop;
  return snapSections.reduce((closestIndex, section, index) => {
    const closestDistance = Math.abs(y - getSnapTop(snapSections[closestIndex]));
    const sectionDistance = Math.abs(y - getSnapTop(section));
    return sectionDistance < closestDistance ? index : closestIndex;
  }, 0);
};

const restoreSectionAfterCountry = () => {
  let targetId = null;

  try {
    targetId = sessionStorage.getItem('return-section');
  } catch (error) {}

  if (!targetId || document.body.classList.contains('country-page')) {
    document.documentElement.style.visibility = '';
    return;
  }

  const target = document.getElementById(targetId);
  try {
    sessionStorage.removeItem('return-section');
  } catch (error) {}

  if (!target) {
    document.documentElement.style.visibility = '';
    return;
  }

  const previousScrollBehavior = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = 'auto';
  window.scrollTo({ top: getSnapTop(target), behavior: 'auto' });
  requestAnimationFrame(() => {
    document.documentElement.style.visibility = '';
    document.documentElement.style.scrollBehavior = previousScrollBehavior;
    scheduleDirectionUpdate();
  });
};

document.querySelectorAll('[data-return-section]').forEach((link) => {
  link.addEventListener('click', () => {
    try {
      sessionStorage.setItem('return-section', link.dataset.returnSection);
    } catch (error) {}
  });
});

document.querySelectorAll('[data-history-back]').forEach((link) => {
  link.addEventListener('click', (event) => {
    let hasSameOriginReferrer = false;

    try {
      hasSameOriginReferrer = document.referrer
        && new URL(document.referrer).origin === window.location.origin;
    } catch (error) {}

    if (window.history.length <= 1 || !hasSameOriginReferrer) return;
    event.preventDefault();
    window.history.back();
  });
});

restoreSectionAfterCountry();

if (snapSections.length) {
  window.addEventListener('wheel', (event) => {
    if (!shouldUseSectionSnap()) return;
    if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

    if (snapLocked) {
      event.preventDefault();
      return;
    }

    if (Math.abs(event.deltaY) < 15) return;

    const currentIndex = getCurrentSectionIndex();
    const direction = event.deltaY > 0 ? 1 : -1;
    const nextIndex = Math.max(0, Math.min(currentIndex + direction, snapSections.length - 1));
    if (nextIndex === currentIndex) return;

    event.preventDefault();
    performSnap(nextIndex);
  }, { passive: false });
}

function performSnap(index) {
  if (snapLocked) return;
  snapLocked = true;
  window.scrollTo({ top: getSnapTop(snapSections[index]), behavior: 'smooth' });
  setTimeout(() => { snapLocked = false; }, 200);
}

// --- Логика Каруселей (Card Carousels) ---
const cardCarousels = new Map();

const initCarousels = () => {
  document.querySelectorAll('[data-card-carousel]').forEach((container) => {
    const cards = Array.from(container.querySelectorAll('[data-carousel-card]'));
    if (!cards.length) return;

    const parent = container.closest('[data-direction-section], [data-overview-section]');
    const counter = parent?.querySelector('[data-carousel-current]');
    let activeIndex = Math.max(0, cards.findIndex(c => c.classList.contains('is-active')));
    let scrollFrame = null;
    let scrollSyncFrame = 0;
    let isProgrammaticScroll = false;

    const centerActiveCard = (card, smooth) => {
      if (scrollFrame) cancelAnimationFrame(scrollFrame);

      scrollFrame = requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const targetLeft = container.scrollLeft
          + (cardRect.left - containerRect.left)
          - (containerRect.width - cardRect.width) / 2;

        container.scrollTo({
          left: Math.max(0, targetLeft),
          behavior: smooth ? 'smooth' : 'auto'
        });
        scrollFrame = null;
      });
    };

    const update = (index, smooth = true, shouldCenter = true) => {
      activeIndex = (index + cards.length) % cards.length;
      const activeCard = cards[activeIndex];

      // Состояние классов
      cards.forEach((card, i) => {
        const isCurrent = i === activeIndex;
        card.classList.toggle('is-active', isCurrent);
        card.setAttribute('aria-current', isCurrent);
      });

      // Текст счетчика
      if (counter) counter.textContent = String(activeIndex + 1).padStart(2, '0');

      // Фон секции
      if (!shouldCenter) return;

      if (smooth) {
        isProgrammaticScroll = true;
        centerActiveCard(activeCard, true);
        setTimeout(() => { isProgrammaticScroll = false; }, 420);
      } else {
        isProgrammaticScroll = true;
        centerActiveCard(activeCard, false);
        requestAnimationFrame(() => { isProgrammaticScroll = false; });
      }
    };

    const openCardLink = (card) => {
      const link = card.querySelector('.country-card-link');
      const href = link?.getAttribute('href');
      if (!href) return;

      if (href.startsWith('#')) {
        const target = document.querySelector(href);
        if (target) window.scrollTo({ top: getAnchorTop(target), behavior: 'smooth' });
        return;
      }

      window.location.href = href;
    };

    const setActiveFromScroll = () => {
      scrollSyncFrame = 0;
      if (isProgrammaticScroll || window.innerWidth > 760) return;

      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + (containerRect.width / 2);
      const closestIndex = cards.reduce((closest, card, index) => {
        const rect = card.getBoundingClientRect();
        const center = rect.left + (rect.width / 2);
        const distance = Math.abs(center - containerCenter);
        return distance < closest.distance ? { index, distance } : closest;
      }, { index: activeIndex, distance: Infinity }).index;

      if (closestIndex !== activeIndex) update(closestIndex, false, false);
    };

    // Делегирование клика
    container.addEventListener('click', (e) => {
      const card = e.target.closest('[data-carousel-card]');
      if (card && !e.target.closest('a')) {
        const cardIndex = cards.indexOf(card);
        if (cardIndex === activeIndex) {
          openCardLink(card);
        } else {
          update(cardIndex);
        }
      }
    });

    container.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('[data-carousel-card]');
      if (!card) return;

      e.preventDefault();
      const cardIndex = cards.indexOf(card);
      if (cardIndex === activeIndex) {
        openCardLink(card);
      } else {
        update(cardIndex);
      }
    });

    container.addEventListener('scroll', () => {
      if (scrollSyncFrame) return;
      scrollSyncFrame = requestAnimationFrame(setActiveFromScroll);
    }, { passive: true });

    // Регистрация в глобальном реестре для кнопок-стрелок
    if (container.id) {
      cardCarousels.set(container.id, {
        move: (dir) => update(activeIndex + dir)
      });
    }

    // Начальная установка
    update(activeIndex, false);
  });
};

initCarousels();

// --- Кнопки управления каруселями ---
document.querySelectorAll('[data-scroll-next], [data-scroll-prev]').forEach((button) => {
  button.addEventListener('click', () => {
    const targetId = button.dataset.scrollNext || button.dataset.scrollPrev;
    const direction = button.dataset.scrollNext ? 1 : -1;
    const carousel = cardCarousels.get(targetId);

    if (carousel) {
      carousel.move(direction);
      return;
    }

    // Запасной вариант для обычного скролла
    const target = document.getElementById(targetId);
    if (!target) return;
    target.scrollBy({
      left: direction * Math.min(420, target.clientWidth * .8),
      behavior: 'smooth'
    });
  });
});

// --- Форма запроса ---
document.querySelectorAll('[data-request-form]').forEach((form) => {
  const statusText = form.querySelector('[data-form-status]');
  if (!statusText) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    statusText.textContent = 'Запрос подготовлен. На следующем этапе подключим отправку в Telegram, WhatsApp или CRM.';
    form.reset();
  });
});

// --- Индикаторы направлений (Direction Dots) ---
const directionSections = document.querySelectorAll('[data-direction-section]');
const directionNavButtons = document.querySelectorAll('[data-direction-nav]');
const directionMap = document.querySelector('[data-direction-map]');
let directionUpdateFrame = 0;

const updateDirectionLine = (count) => {
  const activeButton = count.querySelector('[data-direction-nav].is-active') || count.querySelector('.direction-dot.is-active');
  if (!activeButton) return;
  const buttons = Array.from(count.querySelectorAll('[data-direction-nav]'));
  const activeIndex = buttons.indexOf(activeButton);

  const countRect = count.getBoundingClientRect();
  const buttonRect = activeButton.getBoundingClientRect();
  const isHorizontal = window.innerWidth <= 1060;

  const countSize = isHorizontal ? countRect.width : countRect.height;
  const lineSize = isHorizontal
    ? (window.innerWidth <= 760 ? countRect.width : Math.min(280, window.innerWidth * .66))
    : Math.min(window.innerHeight * .52, 420);
  if (!lineSize) return; // Защита от деления на ноль, если секция скрыта
  const lineOffset = Math.max(0, (countSize - lineSize) / 2);
  const activeCenter = isHorizontal
    ? buttonRect.left - countRect.left + (buttonRect.width / 2) - lineOffset
    : buttonRect.top - countRect.top + (buttonRect.height / 2) - lineOffset;

  const center = Math.max(0, Math.min(100, (activeCenter / lineSize) * 100));
  const segmentSize = isHorizontal && window.innerWidth <= 760 ? 12 : (isHorizontal ? buttonRect.width : buttonRect.height);
  const segment = (segmentSize / lineSize) * 100;
  const start = Math.max(0, center - (segment / 2));
  const end = Math.min(100, center + (segment / 2));

  count.style.setProperty('--active-line-start', `${start}%`);
  count.style.setProperty('--active-line-end', `${end}%`);
  count.style.setProperty('--active-line-center', `${center}%`);
  count.style.setProperty('--line-before-active', activeIndex === 0 ? 'rgba(0, 191, 208, .25)' : 'var(--line)');
  count.style.setProperty('--line-after-active', activeIndex === buttons.length - 1 ? 'rgba(0, 191, 208, .25)' : 'var(--line)');
};

const updateDirectionLines = () => {
  document.querySelectorAll('.direction-count').forEach(updateDirectionLine);
};

const updateDirectionMapVisibility = () => {
  if (!directionMap || !directionSections.length) return;

  const viewportAnchor = window.innerHeight * .5;
  const isDirectionVisible = Array.from(directionSections).some((section) => {
    const rect = section.getBoundingClientRect();
    return rect.top <= viewportAnchor && rect.bottom >= viewportAnchor;
  });

  directionMap.classList.toggle('is-visible', isDirectionVisible);
};

const getCurrentDirectionSection = () => {
  if (!directionSections.length) return null;

  const viewportAnchor = window.innerHeight * .5;
  return Array.from(directionSections).find((section) => {
    const rect = section.getBoundingClientRect();
    return rect.top <= viewportAnchor && rect.bottom >= viewportAnchor;
  });
};

const setActiveDirectionNav = (sectionId) => {
  directionNavButtons.forEach((button) => {
    const isActive = button.dataset.directionNav === sectionId;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
  updateDirectionLines();
};

const updateActiveDirectionFromViewport = () => {
  const currentSection = getCurrentDirectionSection();
  if (currentSection) setActiveDirectionNav(currentSection.id);
  updateDirectionMapVisibility();
};

const scheduleDirectionUpdate = () => {
  if (directionUpdateFrame) return;
  directionUpdateFrame = requestAnimationFrame(() => {
    directionUpdateFrame = 0;
    updateActiveDirectionFromViewport();
  });
};

directionNavButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const section = document.getElementById(button.dataset.directionNav);
    if (section) window.scrollTo({ top: getAnchorTop(section), behavior: 'smooth' });
  });
});

// --- Плавная навигация по якорям ---
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    window.scrollTo({ top: getAnchorTop(target), behavior: 'smooth' });
  });
});

// --- Галерея в первом блоке страницы отеля ---
document.querySelectorAll('[data-hotel-hero]').forEach((hero) => {
  const images = (hero.dataset.heroImages || '')
    .split('|')
    .map((image) => image.trim())
    .filter(Boolean);
  const current = hero.querySelector('[data-hero-current]');
  const total = hero.querySelector('[data-hero-total]');
  const prev = hero.querySelector('[data-hero-prev]');
  const next = hero.querySelector('[data-hero-next]');
  let index = 0;
  let autoplayTimer = null;
  let touchStartX = 0;
  let touchStartY = 0;

  if (!images.length) return;

  const updateHeroImage = (smooth = true) => {
    const image = `url('${images[index]}')`;

    if (!smooth) {
      hero.style.backgroundImage = `linear-gradient(90deg, rgba(17,22,21,.58), rgba(17,22,21,.3)), linear-gradient(0deg, rgba(17,22,21,.56), rgba(17,22,21,.12)), ${image}`;
      hero.style.setProperty('--hotel-hero-image', image);
      hero.style.setProperty('--hotel-next-image', image);
      if (current) current.textContent = String(index + 1).padStart(2, '0');
      if (total) total.textContent = String(images.length).padStart(2, '0');
      return;
    }

    hero.style.setProperty('--hotel-next-image', image);
    hero.classList.add('is-fading');
    window.setTimeout(() => {
      hero.style.backgroundImage = `linear-gradient(90deg, rgba(17,22,21,.58), rgba(17,22,21,.3)), linear-gradient(0deg, rgba(17,22,21,.56), rgba(17,22,21,.12)), ${image}`;
      hero.style.setProperty('--hotel-hero-image', image);
      hero.classList.remove('is-fading');
    }, 550);

    if (current) current.textContent = String(index + 1).padStart(2, '0');
    if (total) total.textContent = String(images.length).padStart(2, '0');
  };

  const showPreviousImage = () => {
    index = (index - 1 + images.length) % images.length;
    updateHeroImage();
  };

  const showNextImage = () => {
    index = (index + 1) % images.length;
    updateHeroImage();
  };

  const restartAutoplay = () => {
    if (autoplayTimer) window.clearTimeout(autoplayTimer);
    if (images.length < 2) return;
    autoplayTimer = window.setTimeout(() => {
      showNextImage();
      restartAutoplay();
    }, 15000);
  };

  prev?.addEventListener('click', () => {
    showPreviousImage();
    restartAutoplay();
  });

  next?.addEventListener('click', () => {
    showNextImage();
    restartAutoplay();
  });

  hero.addEventListener('touchstart', (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  hero.addEventListener('touchend', (event) => {
    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;

    if (deltaX < 0) {
      showNextImage();
    } else {
      showPreviousImage();
    }
    restartAutoplay();
  });

  updateHeroImage(false);
  restartAutoplay();
});

// --- Галереи в карточках вилл ---
document.querySelectorAll('[data-room-gallery]').forEach((gallery) => {
  const images = (gallery.dataset.roomImages || '')
    .split('|')
    .map((image) => image.trim())
    .filter(Boolean);
  const image = gallery.querySelector('img');
  const prev = gallery.querySelector('[data-room-prev]');
  const next = gallery.querySelector('[data-room-next]');
  const counter = document.createElement('span');
  let index = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let imageSwitchTimer = null;

  if (!image || images.length < 2) {
    prev?.remove();
    next?.remove();
    return;
  }

  counter.className = 'room-gallery-counter';
  gallery.append(counter);

  const updateRoomImage = (smooth = true) => {
    counter.textContent = `${index + 1} / ${images.length}`;

    if (!smooth) {
      image.src = images[index];
      return;
    }

    if (imageSwitchTimer) window.clearTimeout(imageSwitchTimer);
    gallery.classList.add('is-switching');
    imageSwitchTimer = window.setTimeout(() => {
      image.src = images[index];
      gallery.classList.remove('is-switching');
    }, 180);
  };

  image.addEventListener('load', () => {
    gallery.classList.remove('is-switching');
  });

  const setRoomIndex = (nextIndex) => {
    if (nextIndex === index) return;
    index = nextIndex;
    updateRoomImage();
  };

  const showPreviousRoomImage = () => {
    setRoomIndex((index - 1 + images.length) % images.length);
  };

  const showNextRoomImage = () => {
    setRoomIndex((index + 1) % images.length);
  };

  const preloadRoomImages = () => {
    images.forEach((src) => {
      const preloadedImage = new Image();
      preloadedImage.src = src;
    });
  };

  const initRoomImage = () => {
    image.src = images[index];
    counter.textContent = `${index + 1} / ${images.length}`;
  };

  prev?.addEventListener('click', (event) => {
    event.preventDefault();
    showPreviousRoomImage();
  });

  next?.addEventListener('click', (event) => {
    event.preventDefault();
    showNextRoomImage();
  });

  gallery.addEventListener('touchstart', (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  gallery.addEventListener('touchend', (event) => {
    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;

    if (deltaX < 0) {
      showNextRoomImage();
    } else {
      showPreviousRoomImage();
    }
  });

  initRoomImage();
  preloadRoomImages();
});

// --- Наблюдатель за секциями (Intersection Observer) ---
if (directionNavButtons.length && directionSections.length) {
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) scheduleDirectionUpdate();
  }, {
    threshold: [0.3, 0.5, 0.7]
  });

  directionSections.forEach((section) => observer.observe(section));
  updateActiveDirectionFromViewport();
  window.addEventListener('scroll', scheduleDirectionUpdate, { passive: true });
  window.addEventListener('resize', scheduleDirectionUpdate);
}

// --- Модальные окна ---
const modalOpenButtons = document.querySelectorAll('[data-modal-open]');
const modals = document.querySelectorAll('[data-modal]');
let modalScrollY = 0;

const closeModal = (modal) => {
  if (!modal) return;
  const wasOpen = modal.classList.contains('is-open');
  const lockedTop = parseInt(document.body.style.top || '0', 10);
  const restoreY = lockedTop ? Math.abs(lockedTop) : modalScrollY;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  if (wasOpen && !document.querySelector('[data-modal].is-open')) {
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.body.classList.remove('is-modal-open');
    document.documentElement.style.scrollBehavior = 'auto';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, restoreY);
    requestAnimationFrame(() => {
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
    });
  }
};

const openModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modals.forEach(closeModal);
  modalScrollY = window.scrollY || document.documentElement.scrollTop;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('is-modal-open');
  document.body.style.position = 'fixed';
  document.body.style.top = `-${modalScrollY}px`;
  document.body.style.width = '100%';
};

const fillHotelRequestFromButton = (button) => {
  if (!button || button.dataset.modalOpen !== 'hotel-request') return;

  const modal = document.getElementById('hotel-request');
  if (!modal) return;

  const hotel = button.dataset.requestHotel || '';
  const country = button.dataset.requestCountry || '';
  const room = button.dataset.requestRoom || '';
  const type = button.dataset.requestRoomType || '';
  const area = button.dataset.requestRoomArea || '';
  const capacity = button.dataset.requestRoomCapacity || '';
  const hotelInput = modal.querySelector('#hotel-request-villa');
  const messageInput = modal.querySelector('#hotel-request-message');

  if (!hotel && !room) {
    if (hotelInput) hotelInput.value = hotelInput.defaultValue || '';
    if (messageInput) messageInput.value = '';
    return;
  }

  const selectedTitle = [hotel, room].filter(Boolean).join(' - ');
  const details = [
    hotel ? `Отель: ${hotel}` : '',
    country ? `Страна: ${country}` : '',
    room ? `Номер / вилла: ${room}` : '',
    type ? `Тип: ${type}` : '',
    area ? `Площадь: ${area}` : '',
    capacity ? `Размещение: ${capacity}` : ''
  ].filter(Boolean).join('\n');

  if (hotelInput && selectedTitle) {
    hotelInput.value = selectedTitle;
  }

  if (messageInput && details) {
    messageInput.value = `${details}\n\nПожелания: `;
  }
};

modalOpenButtons.forEach((button) => {
  button.addEventListener('click', () => {
    fillHotelRequestFromButton(button);
    openModal(button.dataset.modalOpen);
  });
  button.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fillHotelRequestFromButton(button);
      openModal(button.dataset.modalOpen);
    }
  });
});

document.querySelectorAll('[data-modal-close]').forEach((button) => {
  button.addEventListener('click', () => closeModal(button.closest('[data-modal]')));
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  modals.forEach(closeModal);
});
