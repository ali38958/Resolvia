const SERVER_URL = window.location.origin;

const menuControl = document.getElementById('menu-control');
const navigationMenu = document.getElementById('navigation-menu');
const mainContent = document.getElementById('main-content');
const navList = document.getElementById('nav-list');
let navItems = [];

// ============================================================
// THEME TOGGLE
// ============================================================
const THEME_KEY = 'resolvia-theme';

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (prefersDark ? 'dark' : 'light'));
}

const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        applyTheme(current === 'dark' ? 'light' : 'dark');
    });
}

initTheme();

// ============================================================
// SIDEBAR TOGGLE
// ============================================================
const toggleMenu = () => {
    navigationMenu.classList.toggle('open');
    mainContent.classList.toggle('shifted');
    menuControl.style.opacity = '0';
    menuControl.style.transform = 'rotate(90deg)';
    setTimeout(() => {
        menuControl.classList.toggle('fa-bars');
        menuControl.classList.toggle('fa-arrow-left');
        menuControl.style.opacity = '1';
        menuControl.style.transform = 'rotate(0deg)';
    }, 200);
};

menuControl.addEventListener('click', toggleMenu);

// Close on outside click (mobile)
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 &&
        navigationMenu.classList.contains('open') &&
        !e.target.closest('.navigation-menu') &&
        !e.target.closest('#menu-control')) {
        toggleMenu();
    }
});

// Handle resize
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        navigationMenu.classList.add('open');
        mainContent.classList.add('shifted');
        menuControl.classList.remove('fa-bars');
        menuControl.classList.add('fa-arrow-left');
    } else {
        navigationMenu.classList.remove('open');
        mainContent.classList.remove('shifted');
        menuControl.classList.remove('fa-arrow-left');
        menuControl.classList.add('fa-bars');
    }
});

// Initial state
if (window.innerWidth > 768) {
    navigationMenu.classList.add('open');
    mainContent.classList.add('shifted');
    menuControl.classList.remove('fa-bars');
    menuControl.classList.add('fa-arrow-left');
}

// ============================================================
// NAV MENU LOAD
// ============================================================
async function loadNavMenu() {
    try {
        let data;

        if (window.api) {
            const response = await api.get('/api/pages');
            data = response.data;
        } else {
            const response = await fetch(`${SERVER_URL}/api/pages`, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                if (response.status === 401) { window.location.href = '/login'; return; }
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            data = await response.json();
        }

        navList.innerHTML = '';

        // Group by category
        const grouped = {};
        const ungrouped = [];

        data.pages.forEach((page) => {
            if (page.category) {
                if (!grouped[page.category]) grouped[page.category] = [];
                grouped[page.category].push(page);
            } else {
                ungrouped.push(page);
            }
        });

        const currentPath = window.location.pathname.replace(/\/+$/, '');

        function isPageActive(page) {
            const pageUrl = `${SERVER_URL}${page.file.replace(/\.html$/, '')}`;
            const pagePath = new URL(pageUrl).pathname.replace(/\/+$/, '');
            return pagePath === currentPath || (currentPath === '' && pagePath.endsWith('/dashboard'));
        }

        // Ungrouped items first (e.g. Dashboard)
        ungrouped.forEach((page) => navList.appendChild(createNavItem(page)));

        // Grouped categories
        Object.entries(grouped).forEach(([categoryName, pages]) => {
            const hasActive = pages.some(isPageActive);

            const categoryHeader = document.createElement('li');
            categoryHeader.classList.add('nav-category-header');
            if (!hasActive) categoryHeader.classList.add('collapsed');
            categoryHeader.innerHTML = `
                <span class="nav-category-label">${categoryName}</span>
                <i class="nav-category-arrow fa fa-chevron-down"></i>
            `;

            const categoryItems = document.createElement('ul');
            categoryItems.classList.add('nav-category-items');
            if (!hasActive) categoryItems.classList.add('collapsed');

            pages.forEach((page) => categoryItems.appendChild(createNavItem(page)));

            categoryHeader.addEventListener('click', () => {
                const isCollapsed = categoryItems.classList.contains('collapsed');
                categoryItems.classList.toggle('collapsed', !isCollapsed);
                categoryHeader.classList.toggle('collapsed', !isCollapsed);
            });

            navList.appendChild(categoryHeader);
            navList.appendChild(categoryItems);
        });

        navItems = document.querySelectorAll('.nav-item');
        updateActiveNav();
        window.addEventListener('popstate', updateActiveNav);

    } catch (err) {
        console.error('Error fetching pages:', err);
        if (err.response?.status === 401) { window.location.href = '/login'; return; }
        navList.innerHTML = "<li class='nav-item'><i class='fa fa-exclamation-circle'></i><p>Failed to load menu</p></li>";
    }
}

function createNavItem(page) {
    const li = document.createElement('li');
    li.classList.add('nav-item');

    const pageUrl = `${SERVER_URL}${page.file.replace(/\.html$/, '')}`;
    li.dataset.url = pageUrl;

    const badgeCount = page.badge || 0;
    const badgeHtml = badgeCount > 0
        ? `<span class="nav-badge${badgeCount > 5 ? ' pulse' : ''}">${badgeCount > 99 ? '99+' : badgeCount}</span>`
        : '<span class="nav-badge hidden"></span>';

    li.innerHTML = `
        <i class="${page.icon}"></i>
        <p>${page.name}</p>
        ${badgeHtml}
    `;

    li.addEventListener('click', () => { window.location.href = pageUrl; });
    return li;
}

function updateActiveNav() {
    const currentPath = window.location.pathname.replace(/\/+$/, '');

    navItems.forEach((li) => {
        const liPath = new URL(li.dataset.url).pathname.replace(/\/+$/, '');
        const isActive = liPath === currentPath || (currentPath === '' && liPath.endsWith('/dashboard'));

        li.classList.toggle('active', isActive);

        if (isActive) {
            const parentItems = li.closest('.nav-category-items');
            if (parentItems?.classList.contains('collapsed')) {
                parentItems.classList.remove('collapsed');
                parentItems.previousElementSibling?.classList.remove('collapsed');
            }
        }
    });
}

loadNavMenu();

// ============================================================
// LOGOUT
// ============================================================
async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return;

    const logoutBtn = document.getElementById('logout-btn');
    try {
        logoutBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i><span>Logging out...</span>';
        logoutBtn.disabled = true;

        if (window.api) {
            await api.post('/api/auth/logout');
        } else {
            const response = await fetch(`${SERVER_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error(`Logout failed: ${response.status}`);
        }

        localStorage.removeItem(THEME_KEY); // preserve theme? remove this line if you want to keep it
        sessionStorage.clear();
        document.cookie.split(';').forEach(c => {
            document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
        });

        window.location.href = '/login';

    } catch (error) {
        console.error('Logout error:', error);
        logoutBtn.innerHTML = '<i class="fa fa-sign-out-alt"></i><span>Logout</span>';
        logoutBtn.disabled = false;
        alert('Logout failed. Please try again.');
        window.location.href = '/login';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
});

// ============================================================
// PROFILE IMAGE
// ============================================================
async function updateProfileImage() {
    try {
        if (!window.api) return;
        const response = await api.get('/api/auth/profile-image');
        const d = response.data;
        const imageUrl = d?.logoUrl || d?.imageUrl || d?.url || d?.picture || null;
        updateProfileIcon(imageUrl);
    } catch {
        updateProfileIcon(null);
    }
}

function updateProfileIcon(imageUrl) {
    const profileIcon = document.querySelector('.profile-icon');
    if (!profileIcon) return;

    profileIcon.innerHTML = '';
    if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'Profile';
        img.className = 'profile-image';
        img.onerror = () => { profileIcon.innerHTML = '<i class="fa fa-user"></i>'; };
        profileIcon.appendChild(img);
    } else {
        const icon = document.createElement('i');
        icon.className = 'fa fa-user';
        profileIcon.appendChild(icon);
    }
}

const profileIcon = document.querySelector('.profile-icon');
if (profileIcon) {
    profileIcon.addEventListener('click', () => { window.location.href = 'profile'; });
}

document.addEventListener('DOMContentLoaded', updateProfileImage);
document.addEventListener('header-loaded', updateProfileImage);
