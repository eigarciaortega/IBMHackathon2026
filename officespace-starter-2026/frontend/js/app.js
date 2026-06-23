/* ── Configuración ────────────────────────────────────────────────────────── */
const API = `http://${window.location.hostname}:3000`;

/* ── Helpers de sesión ────────────────────────────────────────────────────── */
const Auth = {
  save(token, usuario) {
    localStorage.setItem('os_token', token);
    localStorage.setItem('os_user', JSON.stringify(usuario));
  },
  token()   { return localStorage.getItem('os_token'); },
  user()    { const u = localStorage.getItem('os_user'); return u ? JSON.parse(u) : null; },
  isAdmin() { const u = this.user(); return u && u.rol === 'ADMINISTRADOR'; },
  clear()   { localStorage.removeItem('os_token'); localStorage.removeItem('os_user'); },
  requireLogin() {
    if (!this.token()) { window.location.href = '/index.html'; return false; }
    return true;
  }
};

/* ── Fetch con JWT ────────────────────────────────────────────────────────── */
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = Auth.token();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (res.status === 401) { Auth.clear(); window.location.href = '/index.html'; return null; }
  return res;
}

/* ── Navbar ───────────────────────────────────────────────────────────────── */
function renderNavbar(activePage = '') {
  const user = Auth.user();
  if (!user) return;
  const isAdmin = user.rol === 'ADMINISTRADOR';
  const rolLabel = isAdmin ? 'Administrador' : 'Colaborador';
  const nav = document.getElementById('navbar');
  if (!nav) return;
  nav.innerHTML = `
    <span class="navbar-brand">OFFICESPACE</span>
    <nav class="navbar-links">
      <a href="/pages/search.html"      class="nav-link ${activePage==='search'     ?'active':''}">Buscar</a>
      <a href="/pages/my-bookings.html" class="nav-link ${activePage==='mybookings' ?'active':''}">Mis Reservas</a>
      ${isAdmin ? `<a href="/pages/admin.html"   class="nav-link ${activePage==='admin'      ?'active':''}">Administracion</a>` : ''}
    </nav>
    <div class="navbar-user">
      <span class="role-tag">${rolLabel}</span>
      <span class="user-email">${user.email}</span>
      <button class="btn-logout" onclick="logout()">Salir</button>
    </div>
  `;
}

function logout() {
  Auth.clear();
  window.location.href = '/index.html';
}

/* ── Alertas ──────────────────────────────────────────────────────────────── */
function showAlert(id, msg, type = 'success') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert alert-${type} show`;
  setTimeout(() => el.classList.remove('show'), 5000);
}

/* ── Formato ──────────────────────────────────────────────────────────────── */
function fmtTime(t) { return t ? t.slice(0,5) : ''; }
function fmtDate(d) {
  if (!d) return '';
  const [y,m,day] = d.split('T')[0].split('-');
  return `${day}/${m}/${y}`;
}

/* ── Notificaciones WebSocket ─────────────────────────────────────────────── */
function iniciarNotificaciones() {
  if (!Auth.token()) return;
  const script = document.createElement('script');
  script.src = 'http://localhost:3002/socket.io/socket.io.js';
  script.onload = () => {
    const socket = io('http://localhost:3002');
    socket.on('reserva_confirmada', d => mostrarToast(d.mensaje, 'success'));
    socket.on('reserva_cancelada',  d => mostrarToast(d.mensaje, 'error'));
    socket.on('recordatorio',       d => mostrarToast(d.mensaje, 'warning'));
  };
  document.head.appendChild(script);
  if (!document.getElementById('toast-container')) {
    const tc = document.createElement('div');
    tc.id = 'toast-container';
    tc.style.cssText = 'position:fixed;top:70px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;max-width:340px;';
    document.body.appendChild(tc);
  }
}

function mostrarToast(mensaje, tipo = 'success') {
  const colores = {
    success: { bg:'#1a1a1a', border:'#8b0000', color:'#ffffff' },
    error:   { bg:'#8b0000', border:'#ff0000', color:'#ffffff' },
    warning: { bg:'#2a2a2a', border:'#cccccc', color:'#ffffff' },
  };
  const c = colores[tipo] || colores.success;
  const toast = document.createElement('div');
  toast.style.cssText = `background:${c.bg};border:1px solid ${c.border};color:${c.color};padding:12px 16px;border-radius:4px;font-size:.85rem;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,.4);animation:slideIn .3s ease;letter-spacing:.3px;`;
  toast.textContent = mensaje;
  if (!document.getElementById('toast-style')) {
    const s = document.createElement('style');
    s.id = 'toast-style';
    s.textContent = '@keyframes slideIn{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}';
    document.head.appendChild(s);
  }
  const tc = document.getElementById('toast-container');
  if (tc) { tc.appendChild(toast); setTimeout(() => toast.remove(), 5000); }
}
