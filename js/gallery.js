// Окно увеличения фото галереи: клик по большому фото открывает его во весь экран,
// стрелки и клавиши ← → листают по кругу.
// Само листание галереи и миниатюры — js/slider.js, крестик [data-modal-close] и клик по фону — js/modal.js,
// Esc закрывает окно сам браузер.
//
// Разметка: [data-gallery] — галерея со слайдами-кнопками в [data-slider-track] и миниатюрами в [data-slider-dots];
// окно увеличения одно на страницу — <dialog id="lightbox"> с кнопками [data-lightbox-prev] и [data-lightbox-next].

function initGalleries() {
  const dialog = document.getElementById('lightbox');
  if (!dialog) return;

  const img = dialog.querySelector('.lightbox__img');
  let photos = [];
  let index = 0;
  let onClose = null;

  // По кругу: с последнего фото «вперёд» — на первое
  function show(i) {
    index = (i + photos.length) % photos.length;
    img.src = photos[index].src;
    img.alt = photos[index].alt;
  }

  dialog.querySelector('[data-lightbox-prev]').addEventListener('click', () => show(index - 1));
  dialog.querySelector('[data-lightbox-next]').addEventListener('click', () => show(index + 1));

  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(index - 1);
    if (event.key === 'ArrowRight') show(index + 1);
  });

  dialog.addEventListener('close', () => {
    if (onClose) onClose(index);
  });

  document.querySelectorAll('[data-gallery]').forEach((gallery) => {
    const slides = [...gallery.querySelector('[data-slider-track]').children];
    const thumbs = [...gallery.querySelectorAll('[data-slider-dots] button')];

    // Адрес берём из <source> внутри <picture>: у самого <img> там заглушка, а настоящее фото могло ещё не загрузиться
    const list = slides.map((slide) => {
      const photo = slide.querySelector('img');
      const source = slide.querySelector('source');
      return { src: source ? source.srcset : photo.src, alt: photo.alt };
    });

    // После закрытия большое фото встаёт на последнее просмотренное (нажатием его миниатюры — её обслуживает slider.js),
    // и фокус переходит на него
    function returnFrom(last) {
      if (thumbs[last]) thumbs[last].click();
      slides[last].querySelector('button').focus({ preventScroll: true });
    }

    slides.forEach((slide, i) => {
      slide.querySelector('button').addEventListener('click', () => {
        photos = list;
        onClose = returnFrom;
        show(i);
        dialog.showModal();
      });
    });
  });
}

initGalleries();
