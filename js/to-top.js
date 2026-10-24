// Кнопка «наверх»: появляется, когда страницу прокрутили на экран вниз, и плавно возвращает в начало.

function initToTop() {
  const button = document.querySelector('.to-top');
  if (!button) return;

  // Тем, кто в настройках системы отключил анимации, прокручиваем без плавности
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function update() {
    button.classList.toggle('is-visible', window.scrollY > window.innerHeight);
  }

  window.addEventListener('scroll', update, { passive: true });
  update();

  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  });
}

initToTop();
