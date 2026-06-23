<!DOCTYPE html>
<html lang="en" class="bg-slate-50">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dashboard — OfficeSpace</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: { extend: { colors: { brand: { 50: '#eef4ff', 100: '#d9e6ff', 200: '#b8d0ff', 300: '#8bb2ff', 400: '#5b8bff', 500: '#3366ff', 600: '#1f48db', 700: '#1a3aad', 800: '#1b3488', 900: '#1c2f6b', } } } }
    };
  </script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; }
    .card-lift { transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease; }
    .card-lift:hover { transform: translateY(-6px); }
    ::-webkit-scrollbar { width: 10px; height: 10px; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; border: 3px solid #f8fafc; }
  </style>
  <script>
    if (!localStorage.getItem('officespace_token')) {
        window.location.replace('login.php');
    }
  </script>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>
<body class="bg-slate-50 text-slate-800 antialiased">

  <section class="min-h-screen">
    <header class="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
      <div class="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between gap-4">
          <div class="flex items-center gap-2.5">
            <div class="h-9 w-9 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
            </div>
            <span class="text-lg font-extrabold tracking-tight text-slate-900">OfficeSpace</span>
          </div>
          <div class="flex items-center gap-3">
            <a id="btn-admin" href="admin.php" class="hidden rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition">Panel Admin</a>
            <a href="perfil.php" class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">Mi Perfil</a>
            <div class="flex items-center gap-2.5 pl-2">
              <div class="h-9 w-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold" id="user-initials">--</div>
              <div class="hidden sm:block leading-tight">
                <p class="text-sm font-semibold text-slate-800" id="user-email">Cargando...</p>
                <p class="text-xs text-brand-600 font-bold" id="user-role">ROL</p>
              </div>
            </div>
            <button onclick="logout()" title="Sign out" class="h-9 w-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600 transition">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8">

        <main>
          <div class="mb-6">
            <h1 class="text-2xl font-bold text-slate-900">Find a workspace</h1>
          </div>

          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-8">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Fecha</label>
                <input type="date" id="filtro-fecha" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Hora inicio</label>
                <input type="time" id="filtro-inicio" min="07:00" max="21:00" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Hora fin</label>
                <input type="time" id="filtro-fin" min="07:00" max="21:00" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Tipo</label>
                <select id="filtro-tipo" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 outline-none bg-white">
                  <option value="">Todos</option>
                  <option value="SALA">Sala</option>
                  <option value="DESK">Escritorio</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Capacidad mín.</label>
                <input type="number" id="filtro-capacidad" min="1" placeholder="Ej. 4" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 outline-none" />
              </div>
            </div>
            <div class="mt-4 flex gap-3">
              <button onclick="buscarEspacios()" class="flex-1 rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition">Search Availability</button>
              <button onclick="limpiarFiltros()" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Limpiar</button>
            </div>
          </div>

          <div id="workspace-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <p class="text-slate-500 col-span-3 text-center py-10">Conectando al Microservicio de Catálogos...</p>
          </div>
        </main>

        <aside class="xl:sticky xl:top-24 xl:self-start">
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 class="text-base font-bold text-slate-900">My Bookings</h2>
            </div>
            <div id="bookings-list" class="divide-y divide-slate-100 max-h-[640px] overflow-y-auto p-5 text-sm text-slate-500 text-center">
              Aún no tienes reservas activas.
            </div>
          </div>
        </aside>

      </div>
    </div>
  </section>

  <!-- MODAL RESERVA -->
  <div id="modal-reserva" class="fixed inset-0 z-50 hidden bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 class="text-lg font-bold text-slate-900">Confirmar Reserva</h3>
        <button onclick="cerrarModal()" class="text-slate-400 hover:text-slate-600 transition">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="p-6">
        <p class="text-sm text-slate-500 mb-4">Estás reservando: <span id="modal-nombre-espacio" class="font-bold text-brand-600">--</span></p>
        <form id="form-reserva" onsubmit="enviarReserva(event)" class="space-y-4">
          <input type="hidden" id="modal-id-espacio">
          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Fecha</label>
            <input type="date" id="modal-fecha" required class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 outline-none" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Hora Inicio</label>
              <input type="time" id="modal-inicio" required min="07:00" max="21:00" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Hora Fin</label>
              <input type="time" id="modal-fin" required min="07:00" max="21:00" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 outline-none" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Asistentes</label>
            <input type="number" id="modal-asistentes" required min="1" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 outline-none" placeholder="Ej. 2" />
            <p id="modal-capacidad-max" class="text-[11px] text-slate-400 mt-1">Capacidad máxima: --</p>
          </div>
          <!-- CAMPO NOTAS -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Notas / Propósito de la reunión
              <span class="normal-case font-normal text-slate-400 ml-1">(opcional)</span>
            </label>
            <textarea id="modal-notas" rows="3" maxlength="300"
              placeholder="Ej. Revisión de avances Q2 con el equipo de ventas..."
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 outline-none resize-none"></textarea>
            <p class="text-[11px] text-slate-400 mt-1 text-right">
              <span id="contador-notas">0</span>/300 caracteres
            </p>
          </div>
          <div class="pt-2 flex justify-end gap-3">
            <button type="button" onclick="cerrarModal()" class="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancelar</button>
            <button type="submit" id="btn-confirmar" class="bg-brand-600 text-white px-4 py-2 text-sm font-semibold rounded-lg hover:bg-brand-700 transition">Confirmar Reserva</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <script>
    // Contador de caracteres para notas
    document.getElementById('modal-notas').addEventListener('input', function() {
        document.getElementById('contador-notas').textContent = this.value.length;
    });

    document.addEventListener("DOMContentLoaded", () => {
        const userData = JSON.parse(localStorage.getItem('officespace_user'));
        if (userData) {
            document.getElementById('user-email').textContent    = userData.email;
            document.getElementById('user-role').textContent     = userData.rol;
            document.getElementById('user-initials').textContent = userData.email.substring(0, 2).toUpperCase();
            if (userData.rol === 'ADMINISTRADOR') {
                document.getElementById('btn-admin').classList.remove('hidden');
            }
            cargarEspacios();
            cargarReservas(userData.id);
        }
    });

    async function cargarEspacios(params = {}) {
        const grid = document.getElementById('workspace-grid');
        grid.innerHTML = '<p class="text-slate-400 col-span-3 text-center py-10">Buscando espacios...</p>';
        try {
            const qs = Object.entries(params)
                .filter(([_, v]) => v !== '' && v !== null && v !== undefined)
                .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                .join('&');
            const url      = `http://localhost:8001/get_spaces.php${qs ? '?' + qs : ''}`;
            const response = await fetch(url);
            const result   = await response.json();

            if (result.status === 'success' && result.data.length > 0) {
                grid.innerHTML = '';
                result.data.forEach(espacio => {
                    const isSala     = espacio.tipo === 'SALA';
                    const colorBadge = isSala ? 'bg-brand-50 text-brand-700 border-brand-100' : 'bg-violet-50 text-violet-700 border-violet-100';
                    grid.innerHTML += `
                    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-5 flex flex-col card-lift">
                        <div class="flex items-start justify-between gap-3">
                            <div>
                                <span class="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${colorBadge}">${espacio.tipo}</span>
                                <h3 class="mt-2 text-base font-bold text-slate-900">${espacio.nombre}</h3>
                                <p class="text-xs text-slate-500 mt-0.5">${espacio.piso}</p>
                            </div>
                            <div class="text-right">
                                <div class="flex items-center gap-1 text-slate-700 justify-end font-bold">
                                    <svg class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                                    ${espacio.capacidad}
                                </div>
                                <p class="text-[11px] text-slate-400">capacidad</p>
                            </div>
                        </div>
                        <div class="mt-4 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-100 p-2.5 rounded-lg flex items-center gap-2">
                            <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/></svg>
                            ${espacio.recursos || 'Espacio estándar'}
                        </div>
                        <div class="mt-auto pt-5 flex justify-end">
                            <button onclick="abrirModal(${espacio.id_espacio}, '${espacio.nombre}', ${espacio.capacidad})"
                                class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition">
                                Seleccionar
                            </button>
                        </div>
                    </div>`;
                });
            } else {
                const hayFiltros = Object.keys(params).length > 0;
                grid.innerHTML = `
                    <div class="col-span-3 text-center py-16">
                        <svg class="mx-auto h-12 w-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <p class="text-slate-500 font-semibold">${hayFiltros ? 'No hay espacios disponibles para ese horario.' : 'No hay espacios registrados.'}</p>
                        ${hayFiltros ? '<button onclick="limpiarFiltros()" class="mt-3 text-sm text-brand-600 hover:underline">Ver todos los espacios</button>' : ''}
                    </div>`;
            }
        } catch (error) {
            grid.innerHTML = '<p class="text-red-500 col-span-3 text-center py-10">Error al cargar catálogos.</p>';
        }
    }

    function buscarEspacios() {
        const params = {
            fecha:       document.getElementById('filtro-fecha').value,
            hora_inicio: document.getElementById('filtro-inicio').value,
            hora_fin:    document.getElementById('filtro-fin').value,
            tipo:        document.getElementById('filtro-tipo').value,
            capacidad:   document.getElementById('filtro-capacidad').value
        };
        if ((params.hora_inicio || params.hora_fin) && (!params.fecha || !params.hora_inicio || !params.hora_fin)) {
            Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Para buscar por horario necesitas fecha, hora inicio y hora fin.', confirmButtonColor: '#1f48db' });
            return;
        }
        cargarEspacios(params);
    }

    function limpiarFiltros() {
        document.getElementById('filtro-fecha').value     = '';
        document.getElementById('filtro-inicio').value    = '';
        document.getElementById('filtro-fin').value       = '';
        document.getElementById('filtro-tipo').value      = '';
        document.getElementById('filtro-capacidad').value = '';
        cargarEspacios();
    }

    async function cargarReservas(idUsuario) {
        const lista = document.getElementById('bookings-list');
        const token = localStorage.getItem('officespace_token');
        try {
            const response = await fetch(`http://localhost:8002/get_user_bookings.php?id_usuario=${idUsuario}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const result = await response.json();
            if (result.status === 'success' && result.data.length > 0) {
                lista.innerHTML = '';
                result.data.forEach(b => {
                    const dot = b.tipo === 'SALA' ? 'bg-brand-500' : 'bg-violet-500';
                    lista.innerHTML += `
                    <div class="px-5 py-3.5 hover:bg-slate-50 transition">
                        <div class="flex items-center gap-3">
                            <span class="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                <span class="h-2.5 w-2.5 rounded-full ${dot}"></span>
                            </span>
                            <div class="min-w-0 flex-1">
                                <p class="text-sm font-semibold text-slate-800 truncate">${b.nombre}</p>
                                <p class="text-xs text-slate-400 truncate">${b.fecha} · ${b.hora_inicio.substring(0,5)} – ${b.hora_fin.substring(0,5)}</p>
                            </div>
                            <button onclick="cancelarReserva(${b.id_reserva})"
                                class="shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition">
                                ${b.estatus}
                            </button>
                        </div>
                        ${b.notas ? `<p class="mt-1.5 ml-12 text-[11px] text-slate-400 italic truncate"> ${b.notas}</p>` : ''}
                    </div>`;
                });
            } else {
                lista.innerHTML = '<p class="p-5 text-sm text-slate-400 text-center">Aún no tienes reservas activas.</p>';
            }
        } catch (error) {
            lista.innerHTML = '<p class="p-5 text-sm text-red-500 text-center">Error al cargar reservas.</p>';
        }
    }

    async function cancelarReserva(idReserva) {
        const confirm = await Swal.fire({
            icon: 'warning', title: '¿Cancelar reserva?', text: 'Esta acción no se puede deshacer.',
            showCancelButton: true, confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'Volver', confirmButtonColor: '#dc2626'
        });
        if (!confirm.isConfirmed) return;
        const token = localStorage.getItem('officespace_token');
        try {
            const response = await fetch('http://localhost:8002/cancel_booking.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ id_reserva: idReserva })
            });
            const result = await response.json();
            if (response.ok) {
                Swal.fire({ icon: 'success', title: 'Reserva cancelada', timer: 1500, showConfirmButton: false });
                const userData = JSON.parse(localStorage.getItem('officespace_user'));
                cargarReservas(userData.id);
            } else {
                Swal.fire({ icon: 'error', title: 'Error', text: result.message });
            }
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Error de conexión' });
        }
    }

    function abrirModal(idEspacio, nombreEspacio, capacidad) {
        document.getElementById('modal-id-espacio').value           = idEspacio;
        document.getElementById('modal-nombre-espacio').textContent = nombreEspacio;
        document.getElementById('modal-capacidad-max').textContent  = 'Capacidad máxima: ' + capacidad;
        document.getElementById('modal-asistentes').max             = capacidad;
        document.getElementById('modal-notas').value                = '';
        document.getElementById('contador-notas').textContent       = '0';
        const hoy = new Date().toISOString().split('T')[0];
        document.getElementById('modal-fecha').value = hoy;
        document.getElementById('modal-fecha').min   = hoy;
        document.getElementById('modal-reserva').classList.remove('hidden');
    }

    function cerrarModal() {
        document.getElementById('modal-reserva').classList.add('hidden');
        document.getElementById('form-reserva').reset();
        document.getElementById('contador-notas').textContent = '0';
    }

    async function enviarReserva(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-confirmar');
        btn.textContent = "Procesando...";
        btn.disabled    = true;

        const userData = JSON.parse(localStorage.getItem('officespace_user'));
        const token    = localStorage.getItem('officespace_token');

        const payload = {
            id_espacio:  document.getElementById('modal-id-espacio').value,
            id_usuario:  userData.id,
            fecha:       document.getElementById('modal-fecha').value,
            hora_inicio: document.getElementById('modal-inicio').value,
            hora_fin:    document.getElementById('modal-fin').value,
            asistentes:  document.getElementById('modal-asistentes').value,
            notas:       document.getElementById('modal-notas').value.trim()
        };

        // Validación fecha pasada (cliente)
        const hoy = new Date().toISOString().split('T')[0];
        if (payload.fecha < hoy) {
            Swal.fire({ icon: 'warning', title: 'Fecha inválida', text: 'No puedes reservar en fechas pasadas.', confirmButtonColor: '#1f48db' });
            btn.textContent = "Confirmar Reserva"; btn.disabled = false; return;
        }

        // Validación horario de oficina (cliente)
        const inicioMin = payload.hora_inicio.split(':').reduce((h, m) => parseInt(h) * 60 + parseInt(m));
        const finMin    = payload.hora_fin.split(':').reduce((h, m) => parseInt(h) * 60 + parseInt(m));
        if (inicioMin < 7 * 60 || finMin > 21 * 60) {
            Swal.fire({ icon: 'warning', title: 'Fuera de horario', text: 'Las reservas solo están permitidas entre 07:00 y 21:00.', confirmButtonColor: '#1f48db' });
            btn.textContent = "Confirmar Reserva"; btn.disabled = false; return;
        }

        try {
            const response = await fetch('http://localhost:8002/create_booking.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (response.ok) {
                Swal.fire({ icon: 'success', title: '¡Reserva Confirmada!', text: result.message, timer: 2000, showConfirmButton: false });
                cerrarModal();
                cargarReservas(userData.id);
            } else {
                Swal.fire({ icon: 'error', title: 'Error en la reserva', text: result.message });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'No se pudo contactar al servidor de reservas.' });
        } finally {
            btn.textContent = "Confirmar Reserva";
            btn.disabled    = false;
        }
    }

    function logout() {
        localStorage.removeItem('officespace_token');
        localStorage.removeItem('officespace_user');
        window.location.href = 'login.php';
    }
  </script>
</body>
</html>