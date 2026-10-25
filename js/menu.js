// Шапка: выезжающая панель меню (телефон и планшет) и раскрывающийся пункт «Документи водія».

function initMenu() {
  const header = document.querySelector('.header');
  if (!header) return;

  const burger = header.querySelector('.header__burger');
  const panel = header.querySelector('.header__panel');
  const closeButton = header.querySelector('.header__close');
  const backdrop = header.querySelector('.header__backdrop');
  const toggles = header.querySelectorAll('.nav__toggle');
  const desktop = window.matchMedia('(min-width: 980px)');

  // Пока панель открыта, всё вокруг неё недоступно с клавиатуры и для программ экранного чтения (атрибут inert):
  // Tab не уйдёт на страницу под затемнением
  const outside = [
    header.querySelector('.header__logo'),
    burger,
    document.querySelector('main'),
    document.querySelector('footer'),
    document.querySelector('.to-top'),
    document.querySelector('.chat'),
  ].filter(Boolean);

  function setMenuOpen(isOpen) {
    header.classList.toggle('is-open', isOpen);
    // Класс на <html>, а не на <body>: так блокировка прокрутки работает и в Safari на iPhone
    document.documentElement.classList.toggle('is-menu-open', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
    outside.forEach((element) => {
      element.inert = isOpen;
    });
    // Фокус переходит в панель и возвращается на бургер, чтобы с клавиатуры не потеряться
    if (isOpen) {
      closeButton.focus();
    } else if (!desktop.matches) {
      burger.focus();
    }
  }

  function collapseToggles(except) {
    toggles.forEach((toggle) => {
      if (toggle !== except) toggle.setAttribute('aria-expanded', 'false');
    });
  }

  burger.addEventListener('click', () => setMenuOpen(true));
  closeButton.addEventListener('click', () => setMenuOpen(false));
  backdrop.addEventListener('click', () => setMenuOpen(false));

  // Ссылка или кнопка окна в панели (например, «Зворотній дзвінок») закрывает панель, чтобы окно не открылось поверх неё
  panel.addEventListener('click', (event) => {
    if (header.classList.contains('is-open') && event.target.closest('a[href], [data-modal-open]')) {
      setMenuOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    collapseToggles();
    if (header.classList.contains('is-open')) setMenuOpen(false);
  });

  // Планшет повернули в альбомную ориентацию с открытой панелью — закрываем, иначе страница останется без прокрутки
  desktop.addEventListener('change', () => {
    if (header.classList.contains('is-open')) setMenuOpen(false);
  });

  toggles.forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
      collapseToggles(toggle);
      toggle.setAttribute('aria-expanded', String(!isExpanded));
    });
  });

  // Клик мимо раскрытого пункта сворачивает его
  document.addEventListener('click', (event) => {
    toggles.forEach((toggle) => {
      if (!toggle.parentElement.contains(event.target)) toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

initMenu();
