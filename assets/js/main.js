// --- Конфигурация и состояние ---
const header = document.querySelector('[data-header]');
const snapSections = Array.from(document.querySelectorAll('main > section'));
const setHeaderState = () => {
  if (!header) return;
  header.classList.toggle('is-scrolled', window.scrollY > 24);
};

setHeaderState();
window.addEventListener('scroll', setHeaderState, { passive: true });

// --- Снэп-скролл секций (Vertical Snapping) ---
let snapLocked = false;
const shouldUseSectionSnap = () => window.matchMedia('(min-width: 761px) and (pointer: fine)').matches;

// Расчет позиции для скролла к секции с учетом шапки
const getSnapTop = (section) => {
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;
  const sectionTop = section.getBoundingClientRect().top + scrollY;
  return section.classList.contains('hero') ? 0 : sectionTop;
};

const getCurrentSectionIndex = () => {
  const y = window.pageYOffset || document.documentElement.scrollTop;
  return snapSections.reduce((closestIndex, section, index) => {
    const closestDistance = Math.abs(y - getSnapTop(snapSections[closestIndex]));
    const sectionDistance = Math.abs(y - getSnapTop(section));
    return sectionDistance < closestDistance ? index : closestIndex;
  }, 0);
};

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
    const shouldSyncBackground = container.hasAttribute('data-background-carousel') && parent?.hasAttribute('data-overview-section');
    let activeIndex = Math.max(0, cards.findIndex(c => c.classList.contains('is-active')));
    let scrollFrame = null;

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

    const update = (index, smooth = true) => {
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
      if (shouldSyncBackground) {
        const img = activeCard.style.backgroundImage;
        const overlay = `linear-gradient(90deg, rgba(17, 22, 21, .88), rgba(17, 22, 21, .58) 42%, rgba(17, 22, 21, .35)), linear-gradient(0deg, rgba(17, 22, 21, .86), rgba(17, 22, 21, .18) 55%, rgba(95, 100, 96, .4))`;
        parent.style.backgroundImage = `${overlay}, ${img}`;
      }

      centerActiveCard(activeCard, smooth);
    };

    // Делегирование клика
    container.addEventListener('click', (e) => {
      const card = e.target.closest('[data-carousel-card]');
      if (card && !e.target.closest('a')) {
        update(cards.indexOf(card));
      }
    });

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
const form = document.querySelector('[data-request-form]');
const statusText = document.querySelector('[data-form-status]');

if (form && statusText) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    statusText.textContent = 'Запрос подготовлен. На следующем этапе подключим отправку в Telegram, WhatsApp или CRM.';
    form.reset();
  });
}

// --- Индикаторы направлений (Direction Dots) ---
const directionSections = document.querySelectorAll('[data-direction-section]');
const directionNavButtons = document.querySelectorAll('[data-direction-nav]');

const updateDirectionLine = (count) => {
  const activeButton = count.querySelector('[data-direction-nav].is-active') || count.querySelector('.direction-dot.is-active');
  if (!activeButton) return;

  const countRect = count.getBoundingClientRect();
  const buttonRect = activeButton.getBoundingClientRect();
  const isHorizontal = window.innerWidth <= 1060;

  const lineSize = isHorizontal ? countRect.width : countRect.height;
  if (!lineSize) return; // Защита от деления на ноль, если секция скрыта
  const activeCenter = isHorizontal
    ? buttonRect.left - countRect.left + (buttonRect.width / 2)
    : buttonRect.top - countRect.top + (buttonRect.height / 2);

  const center = (activeCenter / lineSize) * 100;
  const segmentSize = isHorizontal && window.innerWidth <= 760 ? 12 : (isHorizontal ? buttonRect.width : buttonRect.height);
  const segment = (segmentSize / lineSize) * 100;
  const start = Math.max(0, center - (segment / 2));
  const end = Math.min(100, center + (segment / 2));

  count.style.setProperty('--active-line-start', `${start}%`);
  count.style.setProperty('--active-line-end', `${end}%`);
  count.style.setProperty('--active-line-center', `${center}%`);
};

const updateDirectionLines = () => {
  document.querySelectorAll('.direction-count').forEach(updateDirectionLine);
};

const setActiveDirectionNav = (sectionId) => {
  directionNavButtons.forEach((button) => {
    const isActive = button.dataset.directionNav === sectionId;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
  updateDirectionLines();
};

directionNavButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const section = document.getElementById(button.dataset.directionNav);
    if (section) window.scrollTo({ top: getSnapTop(section), behavior: 'smooth' });
  });
});

// --- Плавная навигация по якорям ---
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    window.scrollTo({ top: getSnapTop(target), behavior: 'smooth' });
  });
});

// --- Наблюдатель за секциями (Intersection Observer) ---
if (directionNavButtons.length && directionSections.length) {
  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (visible) {
      setActiveDirectionNav(visible.target.id);
    }
  }, {
    threshold: [0.3, 0.5, 0.7]
  });

  directionSections.forEach((section) => observer.observe(section));
  updateDirectionLines();
  window.addEventListener('resize', updateDirectionLines);
}
