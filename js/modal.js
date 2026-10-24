// Окна на <dialog> — модальные и окно увеличения фото: открываются кнопкой с data-modal-open="<имя>"
// (окно с id="modal-<имя>"), закрываются крестиком [data-modal-close] и кликом по фону. Esc закрывает окно сам браузер.

function initModals() {
  // Где нажали кнопку мыши. Окно закрывается кликом по фону, только если и нажали, и отпустили на фоне:
  // иначе выделение текста в поле, отпущенное над фоном, закрыло бы окно и стёрло введённое
  let pressedOnBackdrop = false;
  document.addEventListener('pointerdown', (event) => {
    pressedOnBackdrop = event.target instanceof HTMLDialogElement;
  });

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

    // Клик пришёлся на сам <dialog>, а не на окно внутри него, — это клик по фону
    if (event.target instanceof HTMLDialogElement && pressedOnBackdrop) {
      event.target.close();
    }
  });
}

initModals();
