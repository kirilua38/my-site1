// Кнопка «наверх»: появляется, когда страницу прокрутили на экран вниз, и плавно возвращает в начало.
// Плавность задаёт CSS (scroll-behavior у <html>), с учётом настройки «меньше анимаций».

function initToTop() {
  const button = document.querySelector('.to-top');
  if (!button) return;

  function update() {
    button.classList.toggle('is-visible', window.scrollY > window.innerHeight);
  }

  window.addEventListener('scroll', update, { passive: true });
  update();

  button.addEventListener('click', () => {
    window.scrollTo({ top: 0 });
  });
}

initToTop();
