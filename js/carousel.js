// БЕСКОНЕЧНАЯ КАРУСЕЛЬ + СВАЙП
// КАРУСЕЛЬ
(function () {
  const MOBILE_BREAKPOINT = 768;
  const isMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;

  // ============================================================
  // ============   МОБИЛЬНЫЙ РЕЖИМ (scroll + кнопки)   ==========
  // ============================================================
  if (isMobile) {
    console.log("extras-carousel: mobile mode -> native scroll + buttons");

    document.querySelectorAll(".extras__carousel").forEach((carousel) => {
      const track   = carousel.querySelector(".carousel-track");
      const prevBtn = carousel.querySelector(".carousel-btn.prev");
      const nextBtn = carousel.querySelector(".carousel-btn.next");

      // на мобилке стрелки должны работать, так что не скрываем их
      // (если ты где-то их display:none делаешь в CSS для мобилки — убери это)

      // найдём реальные карточки (img внутри track)
      const slides = Array.from(track.children);

      // защита: если меньше 2 слайдов — кнопки не нужны
      if (slides.length < 2) {
        prevBtn.style.display = "none";
        nextBtn.style.display = "none";
        return;
      }

      // текущий "индекс слайда по центру"
      let currentIndex = 0;

      // функция: проскроллить так, чтобы слайд с индексом i оказался по центру вьюшки
      function scrollToIndex(i, smooth = true) {
        // ограничим индекс
        if (i < 0) i = 0;
        if (i > slides.length - 1) i = slides.length - 1;
        currentIndex = i;

        // ширина видимой области карусели
        const viewportWidth = carousel.clientWidth;

        // ширина карточки (берём первую как эталон)
        const slideWidth = slides[0].getBoundingClientRect().width;

        // целевой сдвиг так, чтобы карточка была по центру:
        // offsetLeft (позиция карточки внутри track) + половина карточки - половина вьюпорта
        const targetLeft =
          slides[i].offsetLeft + slideWidth / 2 - viewportWidth / 2;

        track.scrollTo({
          left: targetLeft,
          behavior: smooth ? "smooth" : "auto",
        });
      }

      // начальная центровка — ставим первую карточку в центр
      scrollToIndex(0, false);

      // обработчики стрелок
      const total = slides.length; // количество слайдов

      // обработчики стрелок (ЗАКОЛЬЦОВАНО)
      nextBtn.addEventListener("click", () => {
        const nextIndex = (currentIndex + 1) % total;              // 0..N-1
        scrollToIndex(nextIndex, true);
      });

      prevBtn.addEventListener("click", () => {
        const prevIndex = (currentIndex - 1 + total) % total;      // 0..N-1
        scrollToIndex(prevIndex, true);
      });

      // слушаем ручной скролл пальцем и после прокрутки
      // находим ближайший слайд к центру — чтобы обновить currentIndex,
      // иначе after пару свайпов кнопка "вперёд" может прыгать не туда
      let scrollTimeout;
      track.addEventListener("scroll", () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          const viewportCenter = track.scrollLeft + carousel.clientWidth / 2;

          // ищем карточку, чей центр ближе всего к viewportCenter
          let bestIdx = 0;
          let bestDist = Infinity;
          slides.forEach((sl, idx) => {
            const slideCenter = sl.offsetLeft + sl.getBoundingClientRect().width / 2;
            const dist = Math.abs(slideCenter - viewportCenter);
            if (dist < bestDist) {
              bestDist = dist;
              bestIdx = idx;
            }
          });

          currentIndex = bestIdx;
        }, 100);
      });

      // при ресайзе пересчёт положения (на случай поворота экрана)
      window.addEventListener("resize", () => {
        scrollToIndex(currentIndex, false);
      });
    });

    return; // ВАЖНО: не выполняем десктопную часть ниже
  }

  // ============================================================
  // ============   ДЕСКТОП / ПЛАНШЕТ шире 768px   ===============
  // ============================================================
  console.log("extras-carousel: desktop mode -> infinite slider");

  document.querySelectorAll(".extras__carousel").forEach((carousel) => {
    const track   = carousel.querySelector(".carousel-track");
    const prevBtn = carousel.querySelector(".carousel-btn.prev");
    const nextBtn = carousel.querySelector(".carousel-btn.next");

    const GAP = 30; // должен совпадать с $gap в SASS

    const originals = Array.from(track.children);
    const N = originals.length;

    // делаем бесконечную ленту:
    originals.forEach((el) => track.appendChild(el.cloneNode(true))); // вправо
    for (let i = N - 1; i >= 0; i--) {
        track.insertBefore(originals[i].cloneNode(true), track.firstChild); // влево
    }

    let index = N; // старт с середины
    let slideWidth = originals[0].offsetWidth + GAP;
    let isMoving = false;
    const TRANSITION = "transform 0.4s ease";

    function applyTransform(jump = false) {
      track.style.transition = jump ? "none" : TRANSITION;
      track.style.transform = `translateX(-${slideWidth * index}px)`;
      if (jump) {
        // форсим reflow
        track.offsetHeight;
        track.style.transition = TRANSITION;
      }
    }

    applyTransform(true);

    function move(delta) {
      if (isMoving) return;
      isMoving = true;
      index += delta;
      applyTransform(false);
    }

    nextBtn.addEventListener("click", () => move(1));
    prevBtn.addEventListener("click", () => move(-1));

    track.addEventListener("transitionend", () => {
      isMoving = false;

      // зацикливание
      if (index >= N * 2) {
        index -= N;
        applyTransform(true);
      } else if (index < N) {
        index += N;
        applyTransform(true);
      }
    });

    window.addEventListener("resize", () => {
      slideWidth = originals[0].offsetWidth + GAP;
      applyTransform(true);
    });

    // свайп для десктопа/планшета
    let dragging = false;
    let startX = 0;
    let lastX = 0;
    let baseOffset = 0;
    let hasIntent = null; // 'x' или 'y'

    const getX = (e) => (e.touches ? e.touches[0].clientX : e.clientX);

    function onPointerDown(e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;

      dragging = true;
      isMoving = false;
      hasIntent = null;

      startX = getX(e);
      lastX  = startX;

      const matrix = new WebKitCSSMatrix(getComputedStyle(track).transform);
      baseOffset = matrix.m41;

      track.style.transition = "none";
      carousel.classList.add("is-grabbing");
      e.preventDefault();
    }

    function onPointerMove(e) {
      if (!dragging) return;

      const x = getX(e);
      const dx = x - startX;

      if (!hasIntent) {
        // пробуем распознать намерение
        const dy = (e.touches ? e.touches[0].clientY : e.clientY) - (e.touches ? e.touches[0].screenY : e.screenY);
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
          hasIntent = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
        }
      }
      if (hasIntent === "y") {
        onPointerUp();
        return;
      }

      lastX = x;
      track.style.transform = `translateX(${baseOffset + dx}px)`;
    }

    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      carousel.classList.remove("is-grabbing");

      const dx = lastX - startX;
      const threshold = Math.max(60, slideWidth * 0.2);

      if (dx <= -threshold) {
        index += 1; // свайп влево
      } else if (dx >= threshold) {
        index -= 1; // свайп вправо
      }

      applyTransform(false);
    }

    // pointer events
    track.addEventListener("pointerdown", onPointerDown, { passive: false });
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    // touch fallback
    track.addEventListener("touchstart", onPointerDown, { passive: false });
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("touchend", onPointerUp);
    window.addEventListener("touchcancel", onPointerUp);
  });
})();




//ВИДЕО
(function() {
    const openBtn = document.getElementById('openTourVideo');
    const modal = document.getElementById('videoModal');
    const closeBtn = document.getElementById('closeVideoBtn');
    const backdrop = document.getElementById('videoBackdrop');
    const videoEl = document.getElementById('tourVideo');

    // показать модалку
    function openModal() {
      modal.classList.add('video-modal--active');
      // блокируем прокрутку фона
      document.body.style.overflow = 'hidden';
      // сбросим видео к началу (по желанию можно убрать эту строку)
      videoEl.currentTime = 0;
      videoEl.play().catch(() => {});
    }

    // скрыть модалку
    function closeModal() {
      modal.classList.remove('video-modal--active');
      document.body.style.overflow = '';
      videoEl.pause();
    }

    // клики
    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);

    // esc закрывает
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('video-modal--active')) {
        closeModal();
      }
    });
  })();

//КАРУСУЛЬ ПРАЙСОВ
// price-carousel.js
document.addEventListener('DOMContentLoaded', function () {
  const carousel = document.querySelector('.price-carousel');
  if (!carousel) return;

  const track  = carousel.querySelector('.price-carousel__track');
  const slides = Array.from(track ? track.querySelectorAll('.price-card') : []);
  const nextBtn = carousel.querySelector('.price-carousel__btn--next');

  if (!track || !slides.length || !nextBtn) return;

  const GAP = 12; // как в SASS
  let index = 0;

  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  function getSlideWidth() {
    if (!slides.length) return 0;
    const rect = slides[0].getBoundingClientRect();
    return rect.width + GAP;
  }

  function scrollToIndex(i) {
  const slideWidth = getSlideWidth();
  if (!slideWidth) return;

  index = Math.max(0, Math.min(i, slides.length - 1));

  track.scrollTo({
    left: slideWidth * index,
    behavior: 'smooth',
  });
}

  nextBtn.addEventListener('click', () => {
    scrollToIndex(index + 1);
  });

  // следим за скроллом пальцем и обновляем index
  track.addEventListener('scroll', () => {
    if (!isMobile()) return;
    const slideWidth = getSlideWidth();
    if (!slideWidth) return;
    index = Math.round(track.scrollLeft / slideWidth);
  });

  window.addEventListener('resize', () => {
    if (!isMobile()) {
      // при выходе из мобилы сбрасываем скролл
      track.scrollTo({ left: 0 });
      index = 0;
    }
  });
});




//ПОКА ТУТ ПУСТО
document.addEventListener('DOMContentLoaded', () => {
    const modal   = document.getElementById('videoModal-2');
    if (!modal) return;

    const openButtons = document.querySelectorAll('.price-card__video');
    const closeBtn    = modal.querySelector('.video-modal__close');
    const backdrop    = modal.querySelector('.video-modal__backdrop');

    const openModal = (e) => {
      // чтобы страница не скроллилась к началу и не переходила по ссылке
      if (e) e.preventDefault();
      modal.classList.add('video-modal--active');
    };

    const closeModal = () => {
      modal.classList.remove('video-modal--active');
    };

    openButtons.forEach(btn => {
      btn.addEventListener('click', openModal);
    });

    if (closeBtn)  closeBtn.addEventListener('click', closeModal);
    if (backdrop)  backdrop.addEventListener('click', closeModal);
  });

//ДЛЯ АДАПТИВА
// === ФИКС ДЛЯ ANDROID (VH-БАГ) ===
// предотвращает съезжание блоков на телефонах Honor / Samsung и др.
function fixVh() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// вызываем при загрузке, ресайзе и смене ориентации
window.addEventListener('resize', fixVh);
window.addEventListener('orientationchange', fixVh);
fixVh();
