// Simple SPA router + small interactivity
// Keep comments plain and short

document.addEventListener('DOMContentLoaded', () => {
  const menuItems = Array.from(document.querySelectorAll('.menu-item'));
  const viewPages = Array.from(document.querySelectorAll('.view-page'));
  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');
  const messagesList = document.getElementById('messagesList');
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');

  // Sample messages data
  const messages = [
    { from: 'Admin', text: 'Your report is ready!', time: 'Today' },
    { from: 'Mentor', text: "Don't forget to submit your task.", time: 'Yesterday' },
    { from: 'Study Group', text: 'Live session at 6 PM tomorrow.', time: '2d' }
  ];

  // Render message cards
  function renderMessages() {
    messagesList.innerHTML = '';
    messages.forEach((m, idx) => {
      const el = document.createElement('div');
      el.className = 'message';
      el.tabIndex = 0;
      el.innerHTML = `<div class="from">${m.from} <small class="muted" style="margin-left:8px;font-weight:600">${m.time}</small></div>
                      <div class="text">${m.text}</div>`;
      // toggle expand on click
      el.addEventListener('click', () => {
        el.classList.toggle('expanded');
      });
      // keyboard accessibility
      el.addEventListener('keydown', (e) => { if(e.key === 'Enter') el.click(); });
      messagesList.appendChild(el);
    });
  }

  renderMessages();

  // Simple route change function
  function routeTo(route) {
    // hide all views
    viewPages.forEach(v => v.hidden = true);

    const target = viewPages.find(v => v.dataset.view === route);
    if (target) {
      target.hidden = false;
      // update active menu
      menuItems.forEach(mi => mi.classList.toggle('active', mi.dataset.route === route));
      // update header text for better UX
      switch(route){
        case 'home':
          pageTitle.textContent = 'Welcome to Your Dashboard';
          pageSubtitle.textContent = 'Select a section from the menu to get started.';
          break;
        case 'profile':
          pageTitle.textContent = 'Profile';
          pageSubtitle.textContent = 'View and update your personal details.';
          break;
        case 'assignments':
          pageTitle.textContent = 'Assignments';
          pageSubtitle.textContent = 'All your tasks and due dates.';
          break;
        case 'progress':
          pageTitle.textContent = 'Progress';
          pageSubtitle.textContent = 'Track your course completion and scores.';
          break;
        case 'logout':
          pageTitle.textContent = 'Logout';
          pageSubtitle.textContent = 'Sign out of your account securely.';
          break;
        default:
          pageTitle.textContent = 'Dashboard';
          pageSubtitle.textContent = '';
      }
    }
    // close sidebar on mobile after navigation
    if (window.innerWidth <= 720) {
      sidebar.classList.remove('open');
      sidebar.style.left = '-100%';
    }
  }

  // Wire up menu clicks
  menuItems.forEach(mi => {
    mi.addEventListener('click', () => {
      const r = mi.dataset.route;
      routeTo(r);
    });
  });

  // Buttons in hero link to routes
  document.querySelectorAll('[data-route]').forEach(el => {
    el.addEventListener('click', (e) => {
      const r = e.currentTarget.dataset.route;
      if (r) routeTo(r);
    });
  });

  // Hamburger toggle for mobile
  hamburger.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('open');
    if (isOpen) {
      sidebar.style.left = '0';
    } else {
      sidebar.style.left = '-100%';
    }
  });

  // Cancel / confirm logout buttons
  document.getElementById('cancelLogout').addEventListener('click', () => { routeTo('home'); });
  document.getElementById('confirmLogout').addEventListener('click', () => {
    alert('You are logged out (demo).'); // demo action
    routeTo('home');
  });

  // small accessibility: close sidebar if click outside on narrow screens
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 720) {
      const isInsideSidebar = e.composedPath().includes(sidebar) || e.composedPath().includes(hamburger);
      if (!isInsideSidebar) {
        sidebar.classList.remove('open');
        sidebar.style.left = '-100%';
      }
    }
  });

  // initial route
  routeTo('home');
});