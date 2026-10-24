// Формы заявок: маска телефона, проверка полей, сообщение «Дякуємо!».
// Отправки пока нет: sendLead() — заглушка, на шаге 18 её заменит запрос к нашему обработчику.
//
// Разметка: <form data-form novalidate> с полями name (необязательное) и phone (обязательное: 9 цифр после +380).
// Поле ссылается на свой <p class="form-error"> через aria-describedby; последним в форме идёт <p class="form-success" hidden>.

function initForms() {
  const PHONE_DIGITS = 9;
  // Буквы любого алфавита, пробел, апостроф (три вида) и дефис
  const NAME_PATTERN = /^[\p{L}\s'’ʼ-]+$/u;

  const MESSAGES = {
    phoneEmpty: 'Вкажіть номер телефону',
    phoneShort: `Номер має містити ${PHONE_DIGITS} цифр після +380`,
    nameInvalid: "Ім'я може містити лише літери, пробіл, апостроф і дефіс",
  };

  // Цифры номера после +380
  function phoneDigits(value) {
    let digits = value.replace(/\D/g, '');
    // Вставили или автозаполнили полный международный номер (380XXXXXXXXX) — код страны уже стоит перед полем
    if (digits.length >= 12 && digits.startsWith('380')) digits = digits.slice(3);
    // Местный формат (0XXXXXXXXX): после +380 номер с нуля не начинается
    digits = digits.replace(/^0+/, '');
    return digits.slice(0, PHONE_DIGITS);
  }

  // (67) 123-45-67 — по мере ввода; в конце строки разделитель не ставим, иначе Backspace «застревал» бы на нём
  function formatPhone(digits) {
    if (!digits) return '';
    let result = `(${digits.slice(0, 2)}`;
    if (digits.length > 2) result += `) ${digits.slice(2, 5)}`;
    if (digits.length > 5) result += `-${digits.slice(5, 7)}`;
    if (digits.length > 7) result += `-${digits.slice(7, 9)}`;
    return result;
  }

  function validate(input) {
    if (input.name === 'phone') {
      const count = phoneDigits(input.value).length;
      if (count === 0) return MESSAGES.phoneEmpty;
      if (count < PHONE_DIGITS) return MESSAGES.phoneShort;
      return '';
    }
    const name = input.value.trim();
    if (name && !NAME_PATTERN.test(name)) return MESSAGES.nameInvalid;
    return '';
  }

  function showError(input, message) {
    const error = document.getElementById(input.getAttribute('aria-describedby'));
    if (message) {
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.removeAttribute('aria-invalid');
    }
    if (error) {
      error.textContent = message;
      error.hidden = !message;
    }
  }

  // Заявка для обработчика (шаг 18): метка формы, имя, телефон в международном виде, ловушка для ботов
  function collect(form) {
    const data = new FormData(form);
    return {
      form: data.get('form') || '',
      name: (data.get('name') || '').trim(),
      phone: `+380${phoneDigits(data.get('phone') || '')}`,
      website: data.get('website') || '',
    };
  }

  // Заглушка до шага 18: заявку никуда не отправляем и сразу считаем успешной
  function sendLead(lead) {
    return Promise.resolve(lead);
  }

  function fieldsOf(form) {
    return [...form.querySelectorAll('input[name="name"], input[name="phone"]')];
  }

  function showSuccess(form) {
    const success = form.querySelector('.form-success');
    form.classList.add('is-sent');
    success.hidden = false;
    // Кнопка исчезла — переводим фокус на сообщение, его же прочитает программа экранного чтения
    success.focus();
  }

  function resetForm(form) {
    form.reset();
    form.classList.remove('is-sent');
    form.querySelector('.form-success').hidden = true;
    fieldsOf(form).forEach((input) => showError(input, ''));
  }

  document.querySelectorAll('form[data-form]').forEach((form) => {
    const fields = fieldsOf(form);
    const button = form.querySelector('[type="submit"]');

    fields.forEach((input) => {
      input.addEventListener('input', () => {
        if (input.name === 'phone') input.value = formatPhone(phoneDigits(input.value));
        // Ошибка исчезает, как только поле исправили; новых ошибок до нажатия кнопки не показываем
        if (input.hasAttribute('aria-invalid')) showError(input, validate(input));
      });
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const errors = fields.map((input) => {
        const message = validate(input);
        showError(input, message);
        return message;
      });
      const firstInvalid = fields.find((_, i) => errors[i]);
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      // Пока заявка отправляется, кнопка выключена — второй раз её не нажать
      button.disabled = true;
      try {
        await sendLead(collect(form));
        showSuccess(form);
      } finally {
        button.disabled = false;
      }
    });

    // В модальном окне после закрытия отправленная форма возвращается в начальный вид;
    // неотправленную не трогаем, чтобы случайное закрытие не стирало введённое
    const dialog = form.closest('dialog');
    if (dialog) {
      dialog.addEventListener('close', () => {
        if (form.classList.contains('is-sent')) resetForm(form);
      });
    }
  });
}

initForms();
