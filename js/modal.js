// Модальные окна на <dialog>: открываются кнопкой с data-modal-open="<имя>" (окно с id="modal-<имя>"),
// закрываются крестиком и кликом по тёмному фону. Esc закрывает окно сам браузер.

function initModals() {
  // Один обработчик на весь документ: работает для любых кнопок, в том числе добавленных позже
  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-modal-open]');
    if (opener) {
      const modal = document.getElementById(`modal-${opener.dataset.modalOpen}`);
      if (modal) {
        modal.showModal();
      } else {
        console.warn(`Нет модального окна #modal-${opener.dataset.modalOpen}`);
      }
      return;
    }

    if (event.target.closest('[data-modal-close]')) {
      event.target.closest('dialog').close();
      return;
    }

    // Клик пришёлся на сам <dialog>, а не на окно внутри него, — это клик по тёмному фону
    if (event.target instanceof HTMLDialogElement) {
      event.target.close();
    }
  });
}

initModals();
