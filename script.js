const KEY = 'arvion_demo_v2';

const seed = [];

function load() {
    try {
        return JSON.parse(localStorage.getItem(KEY)) || {
            users: [],
            products: seed,
            orders: [],
            currentUser: null
        };
    } catch {
        return {
            users: [],
            products: seed,
            orders: [],
            currentUser: null
        };
    }
}

let state = load();
let currentUser = state.currentUser || null;

function save() {
    state.currentUser = currentUser;
    localStorage.setItem(KEY, JSON.stringify(state));
}

function esc(s = '') {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}

function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;

    t.textContent = msg;
    t.classList.add('show');

    setTimeout(() => {
        t.classList.remove('show');
    }, 2600);
}

function updateHeader() {
    const actions = document.getElementById('headerActions');
    if (!actions) return;

    if (currentUser) {
        actions.innerHTML = `
            <div class="header-user">
                <span class="user-name" title="${esc(currentUser.name)}">${esc(currentUser.name)}</span>
                <button class="btn btn-outline btn-sm" id="headerLogout">Выйти</button>
            </div>
        `;
        document.getElementById('headerLogout').onclick = logout;
    } else {
        actions.innerHTML = `
            <button id="loginBtn" class="btn btn-outline">Войти</button>
            <button id="registerBtn" class="btn">Регистрация</button>
        `;
        document.getElementById('loginBtn').onclick = () => authForm('login');
        document.getElementById('registerBtn').onclick = () => authForm('register');
    }
}

function render() {
    const search = document.getElementById('searchInput');
    const category = document.getElementById('categoryFilter');
    const grid = document.getElementById('productGrid');

    if (!search || !category || !grid) return;

    const q = search.value.toLowerCase().trim();
    const cat = category.value;

    const list = state.products.filter(p =>
        (!cat || p.category === cat) &&
        (`${p.title} ${p.description} ${p.category} ${p.seller}`)
            .toLowerCase()
            .includes(q)
    );

    grid.innerHTML = list.length
        ? list.map(p => `
            <article class="product-card">
                <div class="product-picture">
                    ${p.image
                        ? `<img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">`
                        : `<span aria-hidden="true">${p.icon || '◇'}</span>`}
                </div>
                <div class="product-info">
                    <span class="pill">${esc(p.category)}</span>
                    <h3>${esc(p.title)}</h3>
                    <div class="price">
                        ${Number(p.price).toLocaleString('ru-RU')}
                        ${esc(p.currency)}
                    </div>
                    <div class="subtle">Продавец: ${esc(p.seller)}</div>
                    <button class="btn" type="button" data-product-id="${p.id}">
                        Подробнее
                    </button>
                </div>
            </article>
        `).join('')
        : `<div class="empty">
            ${state.products.length === 0
                ? 'Каталог пока пуст. Станьте продавцом и добавьте первый товар.'
                : 'По вашему запросу ничего не найдено.'}
           </div>`;

    grid.querySelectorAll('[data-product-id]').forEach(btn => {
        btn.onclick = () => openProduct(Number(btn.dataset.productId));
    });

    updateHeader();
    renderAccount();
}

function openModal(html) {
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    document.body.style.overflow = '';
}

function authForm(mode) {
    const reg = mode === 'register';

    openModal(`
        <h2>${reg ? 'Создать аккаунт' : 'Войти'}</h2>
        <p class="muted">
            ${reg
                ? 'Присоединяйтесь к ARVION Marketplace.'
                : 'Войдите в свой аккаунт ARVION.'}
        </p>
        <form id="authForm">
            ${reg ? `
                <label>Имя / название магазина</label>
                <input name="name" required minlength="2" autocomplete="name">
            ` : ''}
            <label>Email</label>
            <input name="email" type="email" required autocomplete="email">
            <label>Пароль</label>
            <input name="password" type="password" required minlength="8" autocomplete="${reg ? 'new-password' : 'current-password'}">
            <button class="btn" type="submit">
                ${reg ? 'Зарегистрироваться' : 'Войти'}
            </button>
        </form>
        <p class="form-note">
            Демо-версия: данные хранятся только в этом браузере.
            Не используйте настоящий пароль.
        </p>
        <p class="subtle">
            ${reg ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}
            <a href="#" id="switchAuth">
                ${reg ? 'Войти' : 'Зарегистрироваться'}
            </a>
        </p>
    `);

    document.getElementById('authForm').onsubmit = e => {
        e.preventDefault();

        const f = new FormData(e.target);
        const email = f.get('email').trim().toLowerCase();
        const password = f.get('password');

        if (reg) {
            if (state.users.some(u => u.email === email)) {
                return toast('Этот email уже зарегистрирован.');
            }

            currentUser = {
                id: Date.now(),
                name: f.get('name').trim(),
                email,
                role: 'buyer',
                telegram: ''
            };

            state.users.push({
                ...currentUser,
                password
            });
        } else {
            const u = state.users.find(
                x => x.email === email && x.password === password
            );

            if (!u) {
                return toast('Неверный email или пароль.');
            }

            currentUser = {
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                telegram: u.telegram || ''
            };
        }

        save();
        closeModal();
        render();
        toast('Вы вошли в аккаунт.');
    };

    document.getElementById('switchAuth').onclick = e => {
        e.preventDefault();
        authForm(reg ? 'login' : 'register');
    };
}

function openProduct(id) {
    const p = state.products.find(x => x.id === id);
    if (!p) return;

    const commission = (Number(p.price) * 0.05).toFixed(2);

    openModal(`
        <span class="pill">${esc(p.category)}</span>
        <h2 style="margin-top:12px">${esc(p.title)}</h2>
        <div class="price">
            ${Number(p.price).toLocaleString('ru-RU')}
            ${esc(p.currency)}
        </div>
        <p>${esc(p.description)}</p>
        <p class="subtle">
            Продавец: ${esc(p.seller)} · ${esc(p.type)}
        </p>
        <div class="notice">
            <b>Комиссия 5%:</b>
            расчётная сумма ${commission} ${esc(p.currency)}.
            Это не списание денег.
        </div>
        ${p.telegram
            ? `
                <a class="btn"
                   target="_blank"
                   rel="noopener noreferrer"
                   href="https://t.me/${encodeURIComponent(p.telegram.replace(/^@/, ''))}">
                    Написать продавцу в Telegram
                </a>
            `
            : `
                <p class="subtle" style="margin:12px 0 4px">
                    Продавец пока не указал Telegram.
                </p>
            `
        }
        <button class="btn btn-outline" type="button" id="orderBtn">
            Зафиксировать намерение купить
        </button>
    `);

    document.getElementById('orderBtn').onclick = () => {
        if (!currentUser) {
            closeModal();
            authForm('login');
            return;
        }

        state.orders.push({
            id: Date.now(),
            productId: p.id,
            buyerId: currentUser.id,
            seller: p.seller,
            total: Number(p.price),
            commission: Number(commission),
            currency: p.currency,
            status: 'Создан'
        });

        save();
        closeModal();
        render();
        toast('Заявка сохранена в демо-кабинете.');
    };
}

function sellerApply() {
    if (!currentUser) {
        authForm('login');
        return;
    }

    if (currentUser.role === 'seller') {
        toast('Вы уже продавец.');
        return;
    }

    openModal(`
        <h2>Заявка продавца</h2>
        <p class="muted">
            Укажите Telegram для связи с покупателями.
        </p>
        <form id="sellerForm">
            <label>Telegram username</label>
            <input
                name="telegram"
                placeholder="@username"
                required
                autocomplete="username"
            >
            <button class="btn" type="submit">
                Отправить заявку
            </button>
        </form>
    `);

    document.getElementById('sellerForm').onsubmit = e => {
        e.preventDefault();

        const tg = new FormData(e.target)
            .get('telegram')
            .trim()
            .replace(/^@/, '');

        if (!tg) {
            return toast('Укажите username.');
        }

        currentUser.telegram = tg;
        currentUser.role = 'seller';

        const u = state.users.find(x => x.id === currentUser.id);
        if (u) {
            u.telegram = tg;
            u.role = 'seller';
        }

        save();
        closeModal();
        render();
        toast('Демо-заявка продавца принята.');
    };
}

function addProduct() {
    if (!currentUser) {
        authForm('login');
        return;
    }

    if (currentUser.role === 'buyer') {
        sellerApply();
        return;
    }

    openModal(`
        <h2>Добавить товар</h2>
        <form id="productForm">
            <label>Название</label>
            <input name="title" required maxlength="80">

            <label>Описание</label>
            <textarea name="description" required maxlength="500"></textarea>

            <label>Категория</label>
            <select name="category">
                <option>Электроника</option>
                <option>Одежда</option>
                <option>Цифровые товары</option>
                <option>Дом и быт</option>
                <option>Другое</option>
            </select>

            <label>Цена</label>
            <input
                name="price"
                type="number"
                min="0.01"
                step="0.01"
                required
            >

            <label>Валюта</label>
            <select name="currency">
                <option>KGS</option>
                <option>USD</option>
                <option>RUB</option>
                <option>EUR</option>
            </select>

            <label>Тип товара</label>
            <select name="type">
                <option>Физический</option>
                <option>Цифровой</option>
            </select>

            <button class="btn" type="submit">
                Опубликовать товар
            </button>
        </form>
    `);

    document.getElementById('productForm').onsubmit = e => {
        e.preventDefault();

        const f = new FormData(e.target);
        const price = Number(f.get('price'));

        if (!(price > 0)) {
            return toast('Укажите корректную цену.');
        }

        state.products.unshift({
            id: Date.now(),
            title: f.get('title').trim(),
            description: f.get('description').trim(),
            category: f.get('category'),
            price,
            currency: f.get('currency'),
            type: f.get('type'),
            seller: currentUser.name,
            telegram: currentUser.telegram || '',
            icon: '◇'
        });

        save();
        closeModal();
        render();
        toast('Товар добавлен в каталог.');
    };
}

function renderAccount() {
    const box = document.getElementById('accountPanel');
    if (!box) return;

    if (!currentUser) {
        box.innerHTML = `
            <p class="muted" style="margin-bottom:16px">
                Войдите или создайте аккаунт, чтобы открыть кабинет.
            </p>
            <div class="row">
                <button class="btn" type="button" id="panelLogin">Войти</button>
                <button class="btn btn-outline" type="button" id="panelRegister">Регистрация</button>
            </div>
        `;
        document.getElementById('panelLogin').onclick = () => authForm('login');
        document.getElementById('panelRegister').onclick = () => authForm('register');
        return;
    }

    const mine = state.products.filter(p => p.seller === currentUser.name);
    const orders = state.orders.filter(o => o.buyerId === currentUser.id);

    box.innerHTML = `
        <div class="dashboard-item">
            <div>
                <b>${esc(currentUser.name)}</b>
                <div class="subtle">
                    ${esc(currentUser.email)} · ${esc(currentUser.role)}
                    ${currentUser.telegram ? ` · @${esc(currentUser.telegram)}` : ''}
                </div>
            </div>
            <button class="btn btn-outline btn-sm" type="button" id="panelLogout">
                Выйти
            </button>
        </div>

        <div class="dashboard-list">
            <div class="row">
                <button class="btn" type="button" id="panelAddProduct">
                    ＋ Добавить товар
                </button>
                ${currentUser.role !== 'seller' ? `
                    <button class="btn btn-outline" type="button" id="panelSeller">
                        Стать продавцом
                    </button>
                ` : ''}
            </div>

            <h3>Мои товары (${mine.length})</h3>
            ${mine.length
                ? mine.map(p => `
                    <div class="dashboard-item">
                        <span>${esc(p.title)}</span>
                        <b>${Number(p.price).toLocaleString('ru-RU')} ${esc(p.currency)}</b>
                    </div>
                `).join('')
                : `<p class="subtle">Вы пока не добавили товары.</p>`
            }

            <h3>Мои заявки (${orders.length})</h3>
            ${orders.length
                ? orders.map(o => `
                    <div class="dashboard-item">
                        <span>Заказ #${o.id} · ${esc(o.status)}</span>
                        <b>${Number(o.total).toLocaleString('ru-RU')} ${esc(o.currency)}</b>
                    </div>
                `).join('')
                : `<p class="subtle">Заявок пока нет.</p>`
            }
        </div>
    `;

    document.getElementById('panelLogout').onclick = logout;
    document.getElementById('panelAddProduct').onclick = addProduct;

    const sellerBtn = document.getElementById('panelSeller');
    if (sellerBtn) sellerBtn.onclick = sellerApply;
}

function logout() {
    currentUser = null;
    save();
    render();
    toast('Вы вышли из аккаунта.');
}

// Events
document.getElementById('sellerBtn').onclick = sellerApply;
document.getElementById('searchInput').oninput = render;
document.getElementById('categoryFilter').onchange = render;
document.getElementById('closeModal').onclick = closeModal;

document.getElementById('modal').onclick = e => {
    if (e.target.id === 'modal') closeModal();
};

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('modal');
        if (modal && !modal.classList.contains('hidden')) closeModal();
    }
});

document.getElementById('year').textContent = new Date().getFullYear();

render();
