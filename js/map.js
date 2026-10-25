// Карта офисов на странице «Контакти».
// Библиотека Leaflet лежит в проекте (vendor/leaflet, почему — docs/decisions/2026-10-25-karta-kontaktiv.md)
// и подгружается, только когда до карты почти докрутили, — вместе с плитками OpenStreetMap.
// Контур Украины — data/ukraine.geo.json, цвета контура — из CSS-переменных (variables.css).
//
// Разметка: пустой <div id="offices-map"> с высотой из CSS.

// Адреса — в том же формате, что в блоке контактов: при переезде офиса поиск найдёт и эту строку
const OFFICES = [
  { name: 'Тернопіль', address: 'м. Тернопіль, вул. Микулинецька, 3а', lat: 49.543302119694395, lng: 25.60439369725591 },
  { name: 'Київ', address: 'м. Київ, вул. Жилянська, 75', lat: 50.43892846933746, lng: 30.49897086846423 },
  { name: 'Дніпро', address: 'м. Дніпро, вул. Європейська, 5, оф. 314', lat: 48.469463497159296, lng: 35.04454949681051 },
];

// Если контур не загрузится — примерные границы Украины
const FALLBACK_BOUNDS = [[44.3, 22.0], [52.5, 40.3]];

// Стили и скрипт библиотеки добавляем на страницу и ждём, пока загрузятся оба.
// Стили — перед нашими: наши правила для карты (css/contacts.css) должны их перебивать
function loadLeaflet() {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'vendor/leaflet/leaflet.css';
  const script = document.createElement('script');
  script.src = 'vendor/leaflet/leaflet.js';
  const loaded = (element) => new Promise((resolve, reject) => {
    element.addEventListener('load', resolve);
    element.addEventListener('error', reject);
  });
  const ready = Promise.all([loaded(css), loaded(script)]);
  document.head.insertBefore(css, document.head.querySelector('link[rel="stylesheet"]'));
  document.head.append(script);
  return ready;
}

function initOfficesMap(element) {
  const wide = window.matchMedia('(min-width: 640px)');
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const colors = getComputedStyle(document.documentElement);

  // Колесо мыши листает страницу, а не масштабирует карту. На сенсорных экранах одним пальцем карту не двигаем —
  // иначе палец, попавший на карту, перестаёт листать страницу; масштаб — двумя пальцами и кнопками «+/−».
  // Кто в системе выбрал «меньше анимаций», видит карту без плавного масштабирования
  const map = L.map(element, {
    scrollWheelZoom: false,
    dragging: !L.Browser.mobile,
    zoomSnap: 0.25,
    zoomDelta: 0.25,
    zoomAnimation: !calm,
    fadeAnimation: !calm,
    markerZoomAnimation: !calm,
  });

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  OFFICES.forEach((office) => {
    L.marker([office.lat, office.lng], { alt: office.name, title: office.name })
      .addTo(map)
      .bindPopup(`<strong>${office.name}</strong><br>${office.address}`);
  });

  let bounds = L.latLngBounds(FALLBACK_BOUNDS);

  // Посетитель сам сдвинул или масштабировал карту — больше не вписываем её заново.
  // Своё вписывание помечаем флагом: оно тоже начинается с movestart/zoomstart и всегда кончается moveend
  let fitting = false;
  let touched = false;
  map.on('movestart zoomstart', () => {
    if (!fitting) touched = true;
  });
  map.on('moveend', () => {
    fitting = false;
  });

  function fit() {
    fitting = true;
    map.fitBounds(bounds, {
      padding: wide.matches ? [14, 14] : [6, 6],
      maxZoom: wide.matches ? 6 : 6.25,
    });
  }

  // Контур: широкая светлая подложка и поверх неё тонкая синяя линия — так граница видна на любом фоне карты.
  // Карта вписывается один раз — по контуру, а если он не загрузился или пустой, по примерным границам
  fetch('data/ukraine.geo.json')
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((geojson) => {
      const line = (color, weight, opacity) => ({ color, weight, opacity, fill: false });
      L.geoJSON(geojson, { style: line(colors.getPropertyValue('--color-bg').trim(), 7, 0.9), interactive: false }).addTo(map);
      const border = L.geoJSON(geojson, { style: line(colors.getPropertyValue('--color-primary').trim(), 2.5, 0.95), interactive: false }).addTo(map);
      if (border.getBounds().isValid()) bounds = border.getBounds();
    })
    .catch(() => {})
    .finally(fit);

  // Изменилась ширина карты (поворот телефона, окно шире или уже) — вписываем заново, если посетитель её не трогал.
  // Высота окна на телефоне меняется при каждой прокрутке (прячется строка адреса) — это не повод сбрасывать вид
  let width = element.clientWidth;
  new ResizeObserver(() => {
    if (element.clientWidth === width) return;
    width = element.clientWidth;
    map.invalidateSize();
    if (!touched) fit();
  }).observe(element);
}

function setupOfficesMap() {
  const element = document.getElementById('offices-map');
  if (!element) return;

  // За 300px до появления карты на экране: загрузить библиотеку и создать карту
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    loadLeaflet()
      .then(() => initOfficesMap(element))
      .catch(() => {
        // Библиотека не загрузилась — блок контактов над картой остаётся рабочим
      });
  }, { rootMargin: '300px' });
  observer.observe(element);
}

setupOfficesMap();
