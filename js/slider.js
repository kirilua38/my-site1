// Слайдер на прокрутке с «прилипанием» (CSS scroll-snap): пальцем и колесом листает сам браузер,
// скрипт добавляет стрелки, точки и переход с последнего слайда на первый.
//
// Разметка: внутри [data-slider] лежат трек [data-slider-track] со слайдами-детьми,
// кнопки [data-slider-prev] и [data-slider-next] и пустой [data-slider-dots] — точки скрипт создаёт сам.
// Как слайд «прилипает» (к началу или по центру), задаёт CSS: scroll-snap-align у слайдов.

function initSlider(root) {
  const track = root.querySelector('[data-slider-track]');
  if (!track) return;

  const slides = [...track.children];
  const prev = root.querySelector('[data-slider-prev]');
  const next = root.querySelector('[data-slider-next]');
  const dotsBox = root.querySelector('[data-slider-dots]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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
    const i = (index + slides.length) % slides.length;
    track.scrollTo({
      left: track.scrollLeft + offsetOf(slides[i]),
      behavior: reduceMotion.matches ? 'auto' : 'smooth',
    });
  }

  const dots = slides.map((_, i) => {
    if (!dotsBox) return null;
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'slider__dot';
    dot.setAttribute('aria-label', `Слайд ${i + 1} з ${slides.length}`);
    dot.addEventListener('click', () => goTo(i));
    dotsBox.append(dot);
    return dot;
  });

  function updateDots() {
    const active = currentIndex();
    dots.forEach((dot, i) => {
      if (dot) dot.setAttribute('aria-current', String(i === active));
    });
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
    frame = requestAnimationFrame(updateDots);
  }, { passive: true });

  window.addEventListener('resize', () => {
    updateFocusable();
    updateDots();
  });

  if (prev) prev.addEventListener('click', () => goTo(currentIndex() - 1));
  if (next) next.addEventListener('click', () => goTo(currentIndex() + 1));

  updateFocusable();
  updateDots();
}

document.querySelectorAll('[data-slider]').forEach(initSlider);
