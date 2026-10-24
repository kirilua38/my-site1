// Фотогалерея: большое фото и полоса миниатюр; клик по фото открывает увеличение во весь экран.
//
// Разметка: внутри [data-gallery] — трек больших фото [data-gallery-track] (слайды во всю его ширину),
// полоса миниатюр [data-gallery-thumbs] из кнопок и стрелки [data-gallery-prev] / [data-gallery-next].
// Окно увеличения — одно на страницу: <dialog id="lightbox"> с кнопками [data-lightbox-prev|next|close].

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function scrollBehavior() {
  return reduceMotion.matches ? 'auto' : 'smooth';
}

// Окно увеличения: возвращает функцию open(список <img>, номер, что сделать при закрытии)
function createLightbox(dialog) {
  const img = dialog.querySelector('.lightbox__img');
  let photos = [];
  let index = 0;
  let onClose = null;

  // По кругу: с последнего фото «вперёд» — на первое
  function show(i) {
    index = (i + photos.length) % photos.length;
    img.src = photos[index].currentSrc || photos[index].src;
    img.alt = photos[index].alt;
  }

  dialog.querySelector('[data-lightbox-prev]').addEventListener('click', () => show(index - 1));
  dialog.querySelector('[data-lightbox-next]').addEventListener('click', () => show(index + 1));
  dialog.querySelector('[data-lightbox-close]').addEventListener('click', () => dialog.close());

  // Клик мимо фото (по самому <dialog>) закрывает окно; Esc закрывает его сам браузер
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(index - 1);
    if (event.key === 'ArrowRight') show(index + 1);
  });

  dialog.addEventListener('close', () => {
    if (onClose) onClose(index);
  });

  return function open(list, start, closeCallback) {
    photos = list;
    onClose = closeCallback;
    show(start);
    dialog.showModal();
  };
}

function initGallery(root, openLightbox) {
  const track = root.querySelector('[data-gallery-track]');
  const thumbsList = root.querySelector('[data-gallery-thumbs]');
  if (!track || !thumbsList) return;

  const slides = [...track.children];
  const photos = slides.map((slide) => slide.querySelector('img'));
  const thumbs = [...thumbsList.querySelectorAll('button')];
  const prev = root.querySelector('[data-gallery-prev]');
  const next = root.querySelector('[data-gallery-next]');

  // Слайды во всю ширину трека, поэтому номер текущего — прокрутка, делённая на ширину
  function currentIndex() {
    return track.clientWidth ? Math.round(track.scrollLeft / track.clientWidth) : 0;
  }

  function goTo(index) {
    const i = Math.max(0, Math.min(index, slides.length - 1));
    track.scrollTo({ left: i * track.clientWidth, behavior: scrollBehavior() });
  }

  // Прокручиваем только полосу миниатюр, а не всю страницу (scrollIntoView сдвинул бы и её)
  function revealThumb(thumb) {
    const listRect = thumbsList.getBoundingClientRect();
    const rect = thumb.getBoundingClientRect();
    if (rect.left < listRect.left) {
      thumbsList.scrollBy({ left: rect.left - listRect.left, behavior: scrollBehavior() });
    } else if (rect.right > listRect.right) {
      thumbsList.scrollBy({ left: rect.right - listRect.right, behavior: scrollBehavior() });
    }
  }

  // Подсветка активной миниатюры; стрелки на краях выключаются, по кругу галерея не листается
  function update() {
    const active = currentIndex();
    thumbs.forEach((thumb, i) => thumb.setAttribute('aria-current', String(i === active)));
    if (prev) prev.disabled = active === 0;
    if (next) next.disabled = active === slides.length - 1;
    revealThumb(thumbs[active]);
  }

  let frame = 0;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  }, { passive: true });

  thumbs.forEach((thumb, i) => thumb.addEventListener('click', () => goTo(i)));
  if (prev) prev.addEventListener('click', () => goTo(currentIndex() - 1));
  if (next) next.addEventListener('click', () => goTo(currentIndex() + 1));

  // После закрытия увеличения большое фото встаёт на последнее просмотренное, и фокус — на него же
  function returnFrom(index) {
    goTo(index);
    slides[index].querySelector('button').focus({ preventScroll: true });
  }

  slides.forEach((slide, i) => {
    slide.querySelector('button').addEventListener('click', () => {
      if (openLightbox) openLightbox(photos, i, returnFrom);
    });
  });

  thumbs.forEach((thumb, i) => thumb.setAttribute('aria-current', String(i === 0)));
  if (prev) prev.disabled = true;
}

const lightboxDialog = document.getElementById('lightbox');
const openLightbox = lightboxDialog ? createLightbox(lightboxDialog) : null;
document.querySelectorAll('[data-gallery]').forEach((root) => initGallery(root, openLightbox));
