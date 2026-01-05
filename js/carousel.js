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

      if (!track || !prevBtn || !nextBtn) {
        console.warn("extras-carousel: нет трека или кнопок для", carousel);
        return;
      }

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
//ТУТ КАРУСЕЛЬ С ТОЧКАМИ
document.addEventListener('DOMContentLoaded', function () {
  const carousel = document.querySelector('.price-carousel');
  if (!carousel) return;

  const track  = carousel.querySelector('.price-carousel__track');
  if (!track) return;

  const slides = Array.from(track.querySelectorAll('.price-card'));
  const dots   = Array.from(carousel.querySelectorAll('.price-carousel__dot'));
  const nextBtn = carousel.querySelector('.price-carousel__btn--next');

  if (!slides.length || !dots.length) return;

  let currentIndex = 0;
  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  function setActiveDot(i) {
    dots.forEach((dot, idx) => {
      dot.classList.toggle('price-carousel__dot--active', idx === i);
    });
  }

  function getSlideWidth() {
    const first = slides[0];
    if (!first) return 0;
    return first.getBoundingClientRect().width;
  }

  function goToSlide(i, smooth = true) {
    const maxIndex = slides.length - 1;
    currentIndex = Math.max(0, Math.min(i, maxIndex));

    const slideWidth = getSlideWidth();
    if (!slideWidth) return;

    const targetLeft = currentIndex * slideWidth;

    track.scrollTo({
      left: targetLeft,
      behavior: smooth ? 'smooth' : 'auto',
    });

    setActiveDot(currentIndex);
  }

  // пересчёт индекса по scrollLeft
  function updateIndexFromScroll() {
    if (!isMobile()) return;

    const slideWidth = getSlideWidth();
    if (!slideWidth) return;

    const rawIndex = track.scrollLeft / slideWidth;
    const newIndex = Math.round(rawIndex);

    if (newIndex !== currentIndex) {
      currentIndex = newIndex;
      setActiveDot(currentIndex);
    }
  }

  // клики по точкам
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      if (!isMobile()) return;
      goToSlide(i, true);
    });
  });

  // кнопка "вперёд" (если решишь показывать)
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (!isMobile()) return;
      goToSlide(currentIndex + 1, true);
    });
  }

  // обновляем активную точку при свайпе
  track.addEventListener('scroll', () => {
    if (!isMobile()) return;
    window.requestAnimationFrame(updateIndexFromScroll);
  });

  // при ресайзе — пересчитать позицию
  window.addEventListener('resize', () => {
    if (!isMobile()) {
      currentIndex = 0;
      track.scrollTo({ left: 0, behavior: 'auto' });
      setActiveDot(0);
    } else {
      goToSlide(currentIndex, false);
    }
  });

  // стартовое состояние
  if (isMobile()) {
    goToSlide(0, false);
  } else {
    setActiveDot(0);
  }
});



//ПОКА ТУТ ПУСТО
const videoModal = document.getElementById('videoModal');
const tourVideo = videoModal.querySelector('video');
const closeVideoBtn = videoModal.querySelector('.video-modal__close');
const videoBackdrop = videoModal.querySelector('.video-modal__backdrop');

document.querySelectorAll('.price-card__video').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    const src = btn.dataset.video; // data-video с ссылкой
    tourVideo.src = src;
    tourVideo.currentTime = 0;
    tourVideo.play();
    videoModal.classList.add('video-modal--active');
    document.body.style.overflow = 'hidden';
  });
});

closeVideoBtn.addEventListener('click', () => {
  tourVideo.pause();
  tourVideo.src = '';
  videoModal.classList.remove('video-modal--active');
  document.body.style.overflow = '';
});

videoBackdrop.addEventListener('click', () => {
  tourVideo.pause();
  tourVideo.src = '';
  videoModal.classList.remove('video-modal--active');
  document.body.style.overflow = '';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && videoModal.classList.contains('video-modal--active')) {
    tourVideo.pause();
    tourVideo.src = '';
    videoModal.classList.remove('video-modal--active');
    document.body.style.overflow = '';
  }
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

//ОТЗЫВЫ
// reviews-photozone-carousel.js
(function () {
  const MOBILE_BREAKPOINT = 768;

  // На мобильных НИЧЕГО не делаем – работает нативный скролл
  if (window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches) {
    return;
  }

  // Десктоп: листаем по кнопкам
  document.querySelectorAll('.reviews-card__carousel').forEach((carousel) => {
    const track = carousel.querySelector('.carousel-mod');
    const slides = Array.from(track.querySelectorAll('img'));
    const prevBtn = carousel.querySelector('.carousel-button.prev');
    const nextBtn = carousel.querySelector('.carousel-button.next');

    if (!track || !slides.length || !prevBtn || !nextBtn) return;

    let index = 0;

    function goTo(i) {
      if (i < 0) i = slides.length - 1;
      if (i >= slides.length) i = 0;
      index = i;

      const target = slides[index];
      const offset = target.offsetLeft;

      track.scrollTo({
        left: offset,
        behavior: 'smooth',
      });
    }

    prevBtn.addEventListener('click', () => goTo(index - 1));
    nextBtn.addEventListener('click', () => goTo(index + 1));
  });
})();

//ОТЗЫВЫ ДЕКСТОП

// carousel.js

document.addEventListener('DOMContentLoaded', () => {
  initPriceCarousel();
  initExtrasCarousels();
  initReviewsCarousel();
});

/* ================= ПРАЙС-ПАКЕТЫ ================= */
function initPriceCarousel() {
  const carousel = document.querySelector('.price-carousel');
  if (!carousel) return;

  const track = carousel.querySelector('.price-carousel__track');
  const cards = track ? Array.from(track.children) : [];
  const nextBtn = carousel.querySelector('.price-carousel__btn--next');
  const dots = Array.from(
    carousel.querySelectorAll('.price-carousel__dot')
  );

  if (!track || !cards.length || !nextBtn) return;

  let index = 0;

  function isMobile() {
    return window.innerWidth <= 768;
  }

  function goToSlide(newIndex) {
    if (isMobile()) {
      track.style.transform = '';
      return;
    }

    const maxIndex = cards.length - 1;
    if (newIndex < 0) newIndex = 0;
    if (newIndex > maxIndex) newIndex = maxIndex;
    index = newIndex;

    const cardWidth = cards[0].getBoundingClientRect().width;
    const gap = 32; // как в CSS
    const offset = (cardWidth + gap) * index;

    track.style.transition = 'transform 0.4s ease';
    track.style.transform = `translateX(-${offset}px)`;

    // точки
    dots.forEach((dot, i) => {
      dot.classList.toggle('price-carousel__dot--active', i === index);
    });
  }

  nextBtn.addEventListener('click', () => {
    if (isMobile()) return; // на мобиле свайп/скролл
    goToSlide(index + 1);
  });

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      if (isMobile()) return;
      goToSlide(i);
    });
  });

  window.addEventListener('resize', () => {
    if (!isMobile()) {
      goToSlide(index);
    } else {
      track.style.transform = '';
    }
  });
}

/* ================= ДОП. УСЛУГИ (фото-карусели) ================= */
// ===== ДОПОЛНИТЕЛЬНЫЕ УСЛУГИ (карусели с фото) =====
(function initExtrasCarousels() {
  const carousels = document.querySelectorAll('.extras-carousel');
  if (!carousels.length) return;

  const GAP = 30; // gap между карточками в CSS: $gap: 30px;

  carousels.forEach((carousel) => {
    const track = carousel.querySelector('.extras-carousel__track');
    if (!track) return;

    const slides = Array.from(track.children);
    const prevBtn = carousel.querySelector('.prev');
    const nextBtn = carousel.querySelector('.next');

    if (!slides.length || !prevBtn || !nextBtn) return;

    let index = 0;

    function getStep() {
      const first = slides[0];
      return first.getBoundingClientRect().width + GAP;
    }

    function getMaxIndex() {
      const wrapperWidth = carousel.getBoundingClientRect().width;
      const step = getStep();
      const visible = Math.max(1, Math.round(wrapperWidth / step));
      return Math.max(0, slides.length - visible);
    }

    let step = getStep();
    let maxIndex = getMaxIndex();

    function update() {
      // на мобиле отключаем логику JS – там скролл пальцем
      if (window.innerWidth <= 768) {
        track.style.transform = 'none';
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        return;
      }

      track.style.transform = `translateX(${-index * step}px)`;

      // левая скрыта на первом слайде
      prevBtn.style.display = index <= 0 ? 'none' : 'flex';
      // правая скрыта на последнем «кадре»
      nextBtn.style.display = index >= maxIndex ? 'none' : 'flex';
    }

    prevBtn.addEventListener('click', () => {
      if (index > 0) {
        index -= 1;              // листаем по ОДНОЙ картинке влево
        update();
      }
    });

    nextBtn.addEventListener('click', () => {
      if (index < maxIndex) {
        index += 1;              // листаем по ОДНОЙ картинке вправо
        update();
      }
    });

    window.addEventListener('resize', () => {
      step = getStep();
      maxIndex = getMaxIndex();
      if (index > maxIndex) index = maxIndex;
      update();
    });

    // начальное состояние
    update();
  });
})();


/* ================= ОТЗЫВЫ (карусель с зелёным фоном) ================= */
// carousel.js

document.addEventListener('DOMContentLoaded', () => {
  initPriceCarousel();
  initExtrasCarousels();
  initReviewsCarousel();
});

/* ============ ПРАЙС-ПАКЕТЫ ============ */
function initPriceCarousel() {
  const carousel = document.querySelector('.price-carousel');
  if (!carousel) return;

  const track = carousel.querySelector('.price-carousel__track');
  const cards = track ? Array.from(track.children) : [];
  const nextBtn = carousel.querySelector('.price-carousel__btn--next');
  const dots = Array.from(carousel.querySelectorAll('.price-carousel__dot'));

  if (!track || !cards.length || !nextBtn) return;

  let index = 0;

  function isMobile() {
    return window.innerWidth <= 768;
  }

  function goToSlide(newIndex) {
    if (isMobile()) {
      track.style.transform = '';
      return;
    }

    const maxIndex = cards.length - 1;
    if (newIndex < 0) newIndex = 0;
    if (newIndex > maxIndex) newIndex = maxIndex;
    index = newIndex;

    const cardWidth = cards[0].getBoundingClientRect().width;
    const gap = 32; // такой же, как в CSS
    const offset = (cardWidth + gap) * index;

    track.style.transition = 'transform 0.4s ease';
    track.style.transform = `translateX(-${offset}px)`;

    dots.forEach((dot, i) => {
      dot.classList.toggle('price-carousel__dot--active', i === index);
    });
  }

  nextBtn.addEventListener('click', () => {
    if (isMobile()) return;
    goToSlide(index + 1);
  });

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      if (isMobile()) return;
      goToSlide(i);
    });
  });

  window.addEventListener('resize', () => {
    if (!isMobile()) {
      goToSlide(index);
    } else {
      track.style.transform = '';
    }
  });
}

// === КАРУСЕЛЬ "ДОПОЛНИТЕЛЬНЫЕ УСЛУГИ" (десктоп) ===
// ===== КАРУСЕЛИ "ДОПОЛНИТЕЛЬНЫЕ УСЛУГИ" (десктоп) =====
(function initExtrasCarousels() {
  const carousels = document.querySelectorAll('.extras-carousel');
  if (!carousels.length) return;

  carousels.forEach((carousel) => {
    const track   = carousel.querySelector('.extras-carousel__track');
    const slides  = Array.from(track ? track.querySelectorAll('img') : []);
    const prevBtn = carousel.querySelector('.carousel-btn.prev');
    const nextBtn = carousel.querySelector('.carousel-btn.next');

    if (!track || !slides.length || !prevBtn || !nextBtn) return;

    let currentIndex  = 0;
    let visibleSlides = 1;

    // показать / спрятать кнопку
    function setBtnState(btn, isVisible) {
      if (!btn) return;

      if (isVisible) {
        btn.style.display = 'flex';
        btn.style.opacity = '1';
        btn.disabled = false;
      } else {
        btn.style.display = 'none';
        btn.style.opacity = '0';
        btn.disabled = true;
      }
    }

    // сколько карточек реально влезает в видимую область
    function recalcVisibleSlides() {
      if (!slides.length) return;

      const carouselWidth = carousel.getBoundingClientRect().width;
      if (!carouselWidth) return;

      // шаг между центрами/левыми краями соседних карточек (учитывает gap)
      let step = 0;
      if (slides.length > 1) {
        step = slides[1].offsetLeft - slides[0].offsetLeft;
      }
      if (!step || step <= 0) {
        step = slides[0].getBoundingClientRect().width;
      }

      visibleSlides = Math.max(1, Math.floor((carouselWidth + 1) / step));

      const maxIndex = Math.max(0, slides.length - visibleSlides);
      if (currentIndex > maxIndex) {
        currentIndex = maxIndex;
      }
    }

    // сдвиг трека
    const firstOffset = slides[0].offsetLeft;
    function updatePosition() {
      const target = slides[currentIndex];
      if (!target) return;

      const shift = target.offsetLeft - firstOffset;
      track.style.transition = 'transform 0.4s ease';
      track.style.transform  = `translateX(-${shift}px)`;
    }

    // логика видимости стрелок
    function updateButtons() {
      const maxIndex = Math.max(0, slides.length - visibleSlides);

      // слева — только если уже листали вправо
      setBtnState(prevBtn, currentIndex > 0);

      // справа — пока есть куда листать
      setBtnState(nextBtn, currentIndex < maxIndex);
    }

    function goTo(index) {
      const maxIndex = Math.max(0, slides.length - visibleSlides);
      currentIndex = Math.min(Math.max(index, 0), maxIndex);
      updatePosition();
      updateButtons();
    }

    nextBtn.addEventListener('click', () => {
      goTo(currentIndex + 1);
    });

    prevBtn.addEventListener('click', () => {
      goTo(currentIndex - 1);
    });

    function handleResize() {
      recalcVisibleSlides();
      updatePosition();
      updateButtons();
    }

    window.addEventListener('resize', handleResize);

    // стартовое состояние
    recalcVisibleSlides();
    updatePosition();
    updateButtons(); // здесь в начале: левая скрыта, правая видна
  });
})();










/* ============ ОТЗЫВЫ (зелёный фон + карусель) ============ */
/* ============ ОТЗЫВЫ (зелёный фон + карусель) ============ */
document.addEventListener('DOMContentLoaded', () => {
  initReviewsCarousel();
});
function initReviewsCarousel() {
  const carousel = document.querySelector('.reviews-card__carousel');
  if (!carousel) return;

  const track   = carousel.querySelector('.carousel-mod');
  const slides  = track ? Array.from(track.children) : [];
  const prevBtn = carousel.querySelector('.carousel-button.prev');
  const nextBtn = carousel.querySelector('.carousel-button.next');

  if (!track || !slides.length || !prevBtn || !nextBtn) return;

  let index = 0;

  function isMobile() {
    return window.innerWidth <= 768;
  }

  // расстояние между карточками (ширина + gap)
  function getStep() {
    if (slides.length === 0) return 0;
    if (slides.length === 1) {
      return slides[0].getBoundingClientRect().width;
    }
    const r1 = slides[0].getBoundingClientRect();
    const r2 = slides[1].getBoundingClientRect();
    return r2.left - r1.left; // учитывает и ширину, и gap
  }

  // показать/спрятать стрелку и включить/выключить её
  function setArrowState(btn, isVisible) {
    if (!btn) return;
    if (isVisible) {
      btn.style.visibility = 'visible';
      btn.disabled = false;
    } else {
      btn.style.visibility = 'hidden';
      btn.disabled = true;
    }
  }

  function update() {
    // На мобиле карусель скроллится пальцем — стрелки не нужны
    if (isMobile()) {
      track.style.transform = '';
      setArrowState(prevBtn, false);
      setArrowState(nextBtn, false);
      return;
    }

    const step = getStep();
    if (!step) return;

    const itemsCount   = slides.length;
    const viewportWidth = carousel.clientWidth;

    // сколько карточек помещается в видимой области
    const visibleCount = Math.max(1, Math.floor(viewportWidth / step));
    const maxIndex     = Math.max(0, itemsCount - visibleCount);

    // не выходим за границы
    if (index < 0) index = 0;
    if (index > maxIndex) index = maxIndex;

    const offset = step * index;
    track.style.transition = 'transform 0.4s ease';
    track.style.transform  = `translateX(-${offset}px)`;

    // левая стрелка — только если мы ушли от начала
    setArrowState(prevBtn, index > 0);

    // правая стрелка — только если ещё можно листать вправо
    setArrowState(nextBtn, index < maxIndex);
  }

  prevBtn.addEventListener('click', () => {
    if (isMobile()) return;
    index -= 1;          // по одной карточке назад
    update();
  });

  nextBtn.addEventListener('click', () => {
    if (isMobile()) return;
    index += 1;          // по одной карточке вперёд
    update();
  });

  window.addEventListener('resize', update);

  // стартовое состояние: только правая стрелка
  index = 0;
  update();
}




const overlay = document.getElementById('offlineOverlay');

function updateOnlineStatus() {
  if (!navigator.onLine) {
    overlay.style.display = 'flex';
  } else {
    overlay.style.display = 'none';
  }
}

window.addEventListener('load', updateOnlineStatus);
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
