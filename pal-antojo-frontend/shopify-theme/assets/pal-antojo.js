const state = { size: 5, quantities: {}, mode: 'build' };

const pickerItems = [...document.querySelectorAll('.picker-item')];
const sizePills = [...document.querySelectorAll('.size-pill')];
const stack = document.querySelector('#bag-stack');
const progressText = document.querySelector('#progress-text');
const progressBar = document.querySelector('#progress-bar');
const boxSizeLabel = document.querySelector('#box-size-label');
const addBox = document.querySelector('#add-box');
const builderNote = document.querySelector('#builder-note');
const cartCount = document.querySelector('#cart-count');
const toast = document.querySelector('#toast');
const menuButton = document.querySelector('#menu-button');
const mobileMenu = document.querySelector('#mobile-menu');
const surpriseButton = document.querySelector('.surprise-button');
const hasBuilder = Boolean(stack && progressText && progressBar && boxSizeLabel && addBox && builderNote && pickerItems.length);

const total = () => Object.values(state.quantities).reduce((sum, value) => sum + value, 0);

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 2400);
}

function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  mobileMenu.hidden = true;
}

menuButton?.addEventListener('click', () => {
  const willOpen = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(willOpen));
  mobileMenu.hidden = !willOpen;
});

mobileMenu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

function render() {
  if (!hasBuilder) return;
  const selected = total();
  progressText.textContent = `${selected} of ${state.size} selected`;
  progressBar.style.width = `${Math.min(100, (selected / state.size) * 100)}%`;
  boxSizeLabel.textContent = `${state.size} BAGS`;
  addBox.disabled = selected !== state.size;
  addBox.querySelector('span').textContent = selected === state.size ? 'BOX READY' : `CHOOSE ${state.size - selected} MORE`;
  addBox.querySelector('[data-add-box-label]').textContent = state.mode === 'variety' ? 'ADD VARIETY BOX · SAVE 15%' : 'ADD BOX · SAVE 10%';
  builderNote.textContent = selected === state.size ? 'Perfect. Your box is ready to go.' : `Fill all ${state.size} spots to unlock your box.`;

  pickerItems.forEach((item) => {
    const qty = state.quantities[item.dataset.id] || 0;
    item.querySelector('.counter span').textContent = qty;
    item.querySelector('.minus').disabled = qty === 0;
    item.querySelector('.plus').disabled = item.dataset.available === 'false' || qty >= 3 || selected >= state.size;
    item.classList.toggle('is-selected', qty > 0);
  });

  stack.innerHTML = '';
  const picks = [];
  pickerItems.forEach((item) => {
    const qty = state.quantities[item.dataset.id] || 0;
    for (let i = 0; i < qty; i += 1) picks.push(item.dataset.image);
  });
  if (!picks.length) {
    stack.innerHTML = '<span class="empty-stack">YOUR PICKS<br />LAND HERE</span>';
  } else {
    picks.forEach((src, index) => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.style.setProperty('--i', index);
      img.style.setProperty('--n', picks.length);
      stack.appendChild(img);
    });
  }
}

sizePills.forEach((pill) => {
  pill.addEventListener('click', () => {
    state.size = Number(pill.dataset.size);
    state.mode = 'build';
    Object.keys(state.quantities).forEach((key) => { state.quantities[key] = 0; });
    sizePills.forEach((button) => {
      const active = button === pill;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-checked', String(active));
    });
    render();
  });
});

pickerItems.forEach((item) => {
  const id = item.dataset.id;
  state.quantities[id] = 0;
  item.querySelector('.plus').addEventListener('click', () => {
    if (state.quantities[id] >= 3) return showToast('Three is the max for one flavor. Keep mixing!');
    if (total() >= state.size) return showToast('Your box is full.');
    state.quantities[id] += 1;
    state.mode = 'build';
    render();
  });
  item.querySelector('.minus').addEventListener('click', () => {
    state.quantities[id] = Math.max(0, state.quantities[id] - 1);
    state.mode = 'build';
    render();
  });
});

function randomizeBox() {
  state.size = 5;
  state.mode = 'variety';
  sizePills.forEach((button) => {
    const active = button.dataset.size === '5';
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-checked', String(active));
  });
  pickerItems.forEach((item) => { state.quantities[item.dataset.id] = 0; });
  const shuffled = pickerItems.filter((item) => item.dataset.available !== 'false').sort(() => Math.random() - 0.5).slice(0, 5);
  shuffled.forEach((item) => { state.quantities[item.dataset.id] = 1; });
  render();
  document.querySelector('#build').scrollIntoView({ behavior: 'smooth' });
  showToast('Your mystery five just landed.');
}

if (surpriseButton && hasBuilder) surpriseButton.addEventListener('click', randomizeBox);

document.querySelectorAll('.pal-quick-add-form').forEach((form) => {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const response = await fetch(`${window.Shopify?.routes?.root || '/'}cart/add.js`, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
      if (!response.ok) throw new Error('Unable to add this product.');
      cartCount.textContent = String(Number(cartCount.textContent) + 1);
      showToast('Added to your bag.');
    } catch (error) { showToast(error.message); }
    finally { button.disabled = false; }
  });
});

if (addBox) addBox.addEventListener('click', async () => {
  const config = JSON.parse(document.querySelector('#PalBoxConfig')?.textContent || '{}');
  const items = Object.entries(state.quantities).filter(([, quantity]) => quantity > 0).map(([id, quantity]) => ({ id: Number(id), quantity, properties: { 'Box size': `${state.size} bags` } }));
  addBox.disabled = true;
  try {
    const response = await fetch(`${config.cartAddUrl || '/cart/add'}.js`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ items }) });
    if (!response.ok) throw new Error('Unable to add this box. Please try again.');
    const code = state.mode === 'variety' ? config.varietyCode : config.buildCode;
    const cartUrl = config.cartUrl || '/cart';
    window.location.assign(`${config.discountUrl || '/discount/'}${code}?redirect=${encodeURIComponent(cartUrl)}`);
  } catch (error) { showToast(error.message); addBox.disabled = false; }
});

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.18 });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

render();

if (hasBuilder && new URLSearchParams(window.location.search).get('mode') === 'surprise') randomizeBox();
