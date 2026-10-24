// Слайдер на прокрутке с «прилипанием» (CSS scroll-snap): пальцем и колесом листает сам браузер,
// скрипт добавляет стрелки, точки и переход с последнего слайда на первый.
//
// Разметка: внутри [data-slider] лежат трек [data-slider-track] со слайдами-детьми,
// кнопки [data-slider-prev] и [data-slider-next] и пустой [data-slider-dots] — точки скрипт создаёт сам.
// Как слайд «прилипает» (к началу или по центру), задаёт CSS: scroll-snap-align у слайдов.
// Плавность прокрутки тоже задаёт CSS (scroll-behavior), с учётом настройки «меньше анимаций».
//
// Необязательно:
// - в [data-slider-dots] можно заранее положить свои кнопки (например, миниатюры) — тогда скрипт берёт их;
// - data-slider-loop="false" на [data-slider] выключает листание по кругу: на краях стрелки выключаются.

function initSlider(root) {
  const track = root.querySelector('[data-slider-track]');
  if (!track) return;

  const slides = [...track.children];
  const prev = root.querySelector('[data-slider-prev]');
  const next = root.querySelector('[data-slider-next]');
  const dotsBox = root.querySelector('[data-slider-dots]');
  const loop = root.dataset.sliderLoop !== 'false';

  // На сколько пикселей прокрутить трек, чтобы слайд встал на своё «прилипающее» место
  function offsetOf(slide) {
    const trackRect = track.getBoundingClientRect();
    const slideRect = slide.getBoundingClientRect();
    if (getComputedStyle(slide).scrollSnapAlign.includes('center')) {
      return slideRect.left + slideRect.width / 2 - (trackRect.left + trackRect.width / 2);
    }
    const paddingStart = parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0;
    return slideRect.left - trackRect.left - paddingStart;
  }

  // Текущий слайд — тот, что ближе всех к своему месту; в самом конце трека — последний.
  // Расстояния считаем один раз на слайд: замеры положения заставляют браузер пересчитывать раскладку
  function currentIndex() {
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (maxScroll > 0 && track.scrollLeft >= maxScroll - 2) return slides.length - 1;
    const distances = slides.map((slide) => Math.abs(offsetOf(slide)));
    return distances.indexOf(Math.min(...distances));
  }

  function goTo(index) {
    const i = loop
      ? (index + slides.length) % slides.length
      : Math.max(0, Math.min(index, slides.length - 1));
    track.scrollTo({ left: track.scrollLeft + offsetOf(slides[i]) });
  }

  // Свои кнопки в блоке точек (миниатюры) берём как есть, иначе создаём точки
  const ownDots = dotsBox ? [...dotsBox.querySelectorAll('button')] : [];
  const dots = ownDots.length || !dotsBox ? ownDots : slides.map((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'slider__dot';
    dot.setAttribute('aria-label', `Слайд ${i + 1} з ${slides.length}`);
    dotsBox.append(dot);
    return dot;
  });
  dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  // Если полоса точек сама прокручивается (миниатюры), активная точка показывается в ней.
  // Прокручиваем только полосу: scrollIntoView сдвинул бы ещё и страницу
  function revealDot(dot) {
    if (dotsBox.scrollWidth <= dotsBox.clientWidth) return;
    const boxRect = dotsBox.getBoundingClientRect();
    const rect = dot.getBoundingClientRect();
    if (rect.left < boxRect.left) {
      dotsBox.scrollBy({ left: rect.left - boxRect.left });
    } else if (rect.right > boxRect.right) {
      dotsBox.scrollBy({ left: rect.right - boxRect.right });
    }
  }

  // Без листания по кругу стрелки на краях выключаются.
  // Если фокус стоял на стрелке, которую выключаем, он переходит на активную точку, а не теряется
  function updateArrows(active) {
    if (loop) return;
    [[prev, active === 0], [next, active === slides.length - 1]].forEach(([arrow, isEdge]) => {
      if (!arrow) return;
      if (isEdge && document.activeElement === arrow && dots[active]) {
        dots[active].focus({ preventScroll: true });
      }
      arrow.disabled = isEdge;
    });
  }

  function update() {
    const active = currentIndex();
    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === active)));
    if (dots[active]) revealDot(dots[active]);
    updateArrows(active);
  }

  // Трек, который можно прокрутить, должен получать фокус: тогда его листают стрелками клавиатуры
  function updateFocusable() {
    if (track.scrollWidth > track.clientWidth + 1) {
      track.tabIndex = 0;
    } else {
      track.removeAttribute('tabindex');
    }
  }

  let frame = 0;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  }, { passive: true });

  window.addEventListener('resize', () => {
    updateFocusable();
    update();
  });

  if (prev) prev.addEventListener('click', () => goTo(currentIndex() - 1));
  if (next) next.addEventListener('click', () => goTo(currentIndex() + 1));

  updateFocusable();
  update();
}

document.querySelectorAll('[data-slider]').forEach(initSlider);
