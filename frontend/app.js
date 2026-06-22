const navButtons = document.querySelectorAll(".nav-button");
const views = document.querySelectorAll(".view");
const apiBaseUrl = "http://localhost:3000";
const catalogApiBaseUrl = "http://localhost:3001";
const bookingApiBaseUrl = "http://localhost:3002";

const activateView = (viewId) => {
  navButtons.forEach((item) => item.classList.remove("active"));
  views.forEach((view) => view.classList.remove("active"));

  const button = document.querySelector(`.nav-button[data-view="${viewId}"]`);
  const view = document.getElementById(viewId);

  if (button) button.classList.add("active");
  if (view) view.classList.add("active");

  document.dispatchEvent(new CustomEvent("view:activated", { detail: { viewId } }));
};

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.view) {
      activateView(button.dataset.view);
    }
  });
});

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const logoutButton = document.getElementById("logoutButton");
const sessionCard = document.getElementById("sessionCard");
const sessionName = document.getElementById("sessionName");
const sessionRole = document.getElementById("sessionRole");
const spaceForm = document.getElementById("spaceForm");
const spaceMessage = document.getElementById("spaceMessage");
const spacesTableBody = document.getElementById("spacesTableBody");
const refreshSpacesButton = document.getElementById("refreshSpacesButton");
const saveSpaceButton = document.getElementById("saveSpaceButton");
const clearSpaceFormButton = document.getElementById("clearSpaceFormButton");
const adminOnlyHeaders = document.querySelectorAll(".admin-only");
const availabilityForm = document.getElementById("availabilityForm");
const availabilityResults = document.getElementById("availabilityResults");
const availabilityMessage = document.getElementById("availabilityMessage");
const bookingSummary = document.getElementById("bookingSummary");
const confirmBookingForm = document.getElementById("confirmBookingForm");
const confirmAttendees = document.getElementById("confirmAttendees");
const bookingMessage = document.getElementById("bookingMessage");
const refreshBookingsButton = document.getElementById("refreshBookingsButton");
const myBookingsList = document.getElementById("myBookingsList");
const myBookingsMessage = document.getElementById("myBookingsMessage");
const metricTotalSpaces = document.getElementById("metricTotalSpaces");
const metricOccupiedToday = document.getElementById("metricOccupiedToday");
const metricAvailableToday = document.getElementById("metricAvailableToday");
const metricTotalBookings = document.getElementById("metricTotalBookings");
const dashboardSignals = document.getElementById("dashboardSignals");

let spacesCache = [];
let selectedBooking = null;

const getDefaultViewByRole = (role) => (role === "ADMINISTRADOR" ? "dashboard" : "search");
const getToken = () => localStorage.getItem("officeSpaceToken");
const getRole = () => localStorage.getItem("officeSpaceUserRole");
const isAdmin = () => getRole() === "ADMINISTRADOR";

const setLoginMessage = (message, isSuccess = false) => {
  loginMessage.textContent = message;
  loginMessage.classList.toggle("success", isSuccess);
};

const renderSession = () => {
  const name = localStorage.getItem("officeSpaceUserName");
  const role = localStorage.getItem("officeSpaceUserRole");
  const token = localStorage.getItem("officeSpaceToken");

  const isLoggedIn = Boolean(token && name && role);

  sessionCard.hidden = !isLoggedIn;
  logoutButton.hidden = !isLoggedIn;

  if (isLoggedIn) {
    sessionName.textContent = name;
    sessionRole.textContent = role;
  }

  if (spaceForm) {
    spaceForm.hidden = !isAdmin();
  }

  adminOnlyHeaders.forEach((element) => {
    element.hidden = !isAdmin();
  });
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(loginForm);
  const email = formData.get("email");
  const password = formData.get("password");

  setLoginMessage("");
  loginButton.disabled = true;
  loginButton.textContent = "Validando...";

  try {
    const response = await fetch(`${apiBaseUrl}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      setLoginMessage(data.message || "No se pudo iniciar sesion.");
      return;
    }

    localStorage.setItem("officeSpaceToken", data.token);
    localStorage.setItem("officeSpaceUserName", data.user.fullName);
    localStorage.setItem("officeSpaceUserRole", data.user.role);
    localStorage.setItem("officeSpaceUserEmail", data.user.email);

    renderSession();
    setLoginMessage("Sesion iniciada correctamente.", true);
    activateView(getDefaultViewByRole(data.user.role));
  } catch (error) {
    setLoginMessage("No se pudo conectar con auth-service. Revisa que Docker este levantado.");
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Iniciar sesion";
  }
});

logoutButton.addEventListener("click", () => {
  localStorage.removeItem("officeSpaceToken");
  localStorage.removeItem("officeSpaceUserName");
  localStorage.removeItem("officeSpaceUserRole");
  localStorage.removeItem("officeSpaceUserEmail");
  renderSession();
  setLoginMessage("Sesion cerrada.", true);
  renderSpacesTable([]);
  activateView("login");
});

const setSpaceMessage = (message, isSuccess = false) => {
  spaceMessage.textContent = message;
  spaceMessage.classList.toggle("success", isSuccess);
};

const setAvailabilityMessage = (message, isSuccess = false) => {
  availabilityMessage.textContent = message;
  availabilityMessage.classList.toggle("success", isSuccess);
};

const setBookingMessage = (message, isSuccess = false) => {
  bookingMessage.textContent = message;
  bookingMessage.classList.toggle("success", isSuccess);
};

const setMyBookingsMessage = (message, isSuccess = false) => {
  myBookingsMessage.textContent = message;
  myBookingsMessage.classList.toggle("success", isSuccess);
};

const formatResources = (space) => {
  const resources = [];

  if (space.hasProjector) resources.push("Proyector");
  if (space.hasAc) resources.push("AC");
  if (space.hasScreen) resources.push("Pantalla");
  if (space.hasWhiteboard) resources.push("Pizarra");
  if (space.isQuietZone) resources.push("Silencioso");

  return resources.length ? resources.join(", ") : "Sin recursos";
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const buildAuthHeaders = () => ({
  Authorization: `Bearer ${getToken()}`
});

const renderSpacesTable = (spaces) => {
  spacesCache = spaces;

  if (!getToken()) {
    spacesTableBody.innerHTML = '<tr><td colspan="6">Inicia sesion para consultar espacios.</td></tr>';
    return;
  }

  if (!spaces.length) {
    spacesTableBody.innerHTML = '<tr><td colspan="6">No hay espacios para mostrar.</td></tr>';
    return;
  }

  spacesTableBody.innerHTML = spaces
    .map((space) => {
      const actions = isAdmin()
        ? `<td>
            <div class="table-actions">
              <button type="button" data-action="edit" data-id="${space.id}">Editar</button>
              <button type="button" data-action="delete" data-id="${space.id}">Eliminar</button>
            </div>
          </td>`
        : "";

      return `<tr>
        <td><strong>${escapeHtml(space.name)}</strong><br /><small>${escapeHtml(space.description || "")}</small></td>
        <td>${escapeHtml(space.type)}</td>
        <td>${escapeHtml(space.capacity)}</td>
        <td>${escapeHtml(space.floor)}</td>
        <td>${escapeHtml(formatResources(space))}</td>
        ${actions}
      </tr>`;
    })
    .join("");
};

const loadSpaces = async () => {
  const token = getToken();

  if (!token) {
    renderSpacesTable([]);
    setSpaceMessage("Inicia sesion para cargar el catalogo.");
    return;
  }

  setSpaceMessage("");

  try {
    const response = await fetch(`${catalogApiBaseUrl}/spaces`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await response.json();

    if (!response.ok) {
      setSpaceMessage(data.message || "No se pudieron cargar los espacios.");
      return;
    }

    renderSpacesTable(data);
  } catch (error) {
    setSpaceMessage("No se pudo conectar con catalog-service.");
  }
};

const readSpaceForm = () => {
  const formData = new FormData(spaceForm);

  return {
    id: formData.get("spaceId"),
    name: formData.get("name"),
    type: formData.get("type"),
    capacity: Number(formData.get("capacity")),
    floor: formData.get("floor"),
    description: formData.get("description"),
    hasProjector: formData.get("hasProjector") === "on",
    hasAc: formData.get("hasAc") === "on",
    hasScreen: formData.get("hasScreen") === "on",
    hasWhiteboard: formData.get("hasWhiteboard") === "on",
    isQuietZone: formData.get("isQuietZone") === "on"
  };
};

const clearSpaceForm = () => {
  spaceForm.reset();
  document.getElementById("spaceId").value = "";
  saveSpaceButton.textContent = "Crear espacio";
};

const fillSpaceForm = (space) => {
  document.getElementById("spaceId").value = space.id;
  document.getElementById("spaceName").value = space.name;
  document.getElementById("spaceType").value = space.type;
  document.getElementById("spaceCapacity").value = space.capacity;
  document.getElementById("spaceFloor").value = space.floor;
  document.getElementById("spaceDescription").value = space.description || "";
  document.getElementById("spaceProjector").checked = space.hasProjector;
  document.getElementById("spaceAc").checked = space.hasAc;
  document.getElementById("spaceScreen").checked = space.hasScreen;
  document.getElementById("spaceWhiteboard").checked = space.hasWhiteboard;
  document.getElementById("spaceQuietZone").checked = space.isQuietZone;
  saveSpaceButton.textContent = "Actualizar espacio";
};

spaceForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isAdmin()) {
    setSpaceMessage("Solo ADMINISTRADOR puede modificar espacios.");
    return;
  }

  const token = getToken();
  const space = readSpaceForm();
  const isEditing = Boolean(space.id);
  const url = isEditing ? `${catalogApiBaseUrl}/spaces/${space.id}` : `${catalogApiBaseUrl}/spaces`;
  const method = isEditing ? "PUT" : "POST";

  saveSpaceButton.disabled = true;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(space)
    });
    const data = await response.json();

    if (!response.ok) {
      setSpaceMessage(data.message || "No se pudo guardar el espacio.");
      return;
    }

    setSpaceMessage(isEditing ? "Espacio actualizado correctamente." : "Espacio creado correctamente.", true);
    clearSpaceForm();
    await loadSpaces();
  } catch (error) {
    setSpaceMessage("No se pudo conectar con catalog-service.");
  } finally {
    saveSpaceButton.disabled = false;
  }
});

clearSpaceFormButton.addEventListener("click", () => {
  clearSpaceForm();
  setSpaceMessage("");
});

refreshSpacesButton.addEventListener("click", loadSpaces);

spacesTableBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button");

  if (!button) return;

  const space = spacesCache.find((item) => item.id === button.dataset.id);

  if (!space) return;

  if (button.dataset.action === "edit") {
    fillSpaceForm(space);
    setSpaceMessage("Editando espacio seleccionado.", true);
    return;
  }

  if (button.dataset.action === "delete") {
    if (!isAdmin()) {
      setSpaceMessage("Solo ADMINISTRADOR puede eliminar espacios.");
      return;
    }

    try {
      const response = await fetch(`${catalogApiBaseUrl}/spaces/${space.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });
      const data = await response.json();

      if (!response.ok) {
        setSpaceMessage(data.message || "No se pudo eliminar el espacio.");
        return;
      }

      setSpaceMessage("Espacio eliminado correctamente.", true);
      clearSpaceForm();
      await loadSpaces();
    } catch (error) {
      setSpaceMessage("No se pudo conectar con catalog-service.");
    }
  }
});

document.addEventListener("view:activated", (event) => {
  if (event.detail.viewId === "dashboard") {
    loadSpaces();
    loadDashboardMetrics();
  }

  if (event.detail.viewId === "bookings") {
    loadMyBookings();
  }
});

const buildAvailabilityQuery = () => {
  const formData = new FormData(availabilityForm);
  const params = new URLSearchParams();

  for (const [key, value] of formData.entries()) {
    if (value === "on") {
      params.set(key, "true");
      continue;
    }

    if (value !== "") {
      params.set(key, value);
    }
  }

  return params;
};

const renderAvailability = (spaces, request) => {
  if (!spaces.length) {
    availabilityResults.innerHTML = '<article class="space-card"><h3>Sin espacios disponibles</h3><p>Prueba con otro horario, capacidad o recurso.</p></article>';
    return;
  }

  availabilityResults.innerHTML = spaces
    .map(
      (space) => `<article class="space-card">
        <span>${escapeHtml(space.type)}</span>
        <h3>${escapeHtml(space.name)}</h3>
        <p>${escapeHtml(space.description || "")}</p>
        <strong>${escapeHtml(space.capacity)} personas - ${escapeHtml(space.floor)}</strong>
        <p>${escapeHtml(formatResources(space))}</p>
        <button type="button" data-action="reserve" data-id="${space.id}">Reservar</button>
      </article>`
    )
    .join("");

  availabilityResults.querySelectorAll("button[data-action='reserve']").forEach((button) => {
    button.addEventListener("click", () => {
      const space = spaces.find((item) => item.id === button.dataset.id);

      selectedBooking = {
        space,
        date: request.date,
        startTime: request.startTime,
        endTime: request.endTime,
        attendees: Number(request.attendees || request.minCapacity || 1)
      };

      confirmAttendees.value = selectedBooking.attendees;
      bookingSummary.innerHTML = `
        <span>Espacio: ${escapeHtml(space.name)}</span>
        <span>Fecha: ${escapeHtml(request.date)}</span>
        <span>Horario: ${escapeHtml(request.startTime)} - ${escapeHtml(request.endTime)}</span>
        <span>Capacidad: ${escapeHtml(space.capacity)} personas</span>
      `;
      setBookingMessage("");
      activateView("confirm");
    });
  });
};

availabilityForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!getToken()) {
    setAvailabilityMessage("Inicia sesion para buscar disponibilidad.");
    return;
  }

  const params = buildAvailabilityQuery();
  setAvailabilityMessage("");
  availabilityResults.innerHTML = "";

  try {
    const response = await fetch(`${bookingApiBaseUrl}/availability?${params.toString()}`, {
      headers: buildAuthHeaders()
    });
    const data = await response.json();

    if (!response.ok) {
      setAvailabilityMessage(data.message || "No se pudo consultar disponibilidad.");
      return;
    }

    setAvailabilityMessage(`Encontramos ${data.spaces.length} espacios disponibles.`, true);
    renderAvailability(data.spaces, {
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      attendees: params.get("attendees"),
      minCapacity: params.get("minCapacity")
    });
  } catch (error) {
    setAvailabilityMessage("No se pudo conectar con booking-service.");
  }
});

confirmBookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedBooking) {
    setBookingMessage("Selecciona un espacio disponible antes de confirmar.");
    return;
  }

  try {
    const response = await fetch(`${bookingApiBaseUrl}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders()
      },
      body: JSON.stringify({
        spaceId: selectedBooking.space.id,
        date: selectedBooking.date,
        startTime: selectedBooking.startTime,
        endTime: selectedBooking.endTime,
        attendees: Number(confirmAttendees.value)
      })
    });
    const data = await response.json();

    if (!response.ok) {
      setBookingMessage(data.message || "No se pudo crear la reserva.");
      return;
    }

    setBookingMessage("Reserva creada correctamente.", true);
    selectedBooking = null;
    await loadMyBookings();
  } catch (error) {
    setBookingMessage("No se pudo conectar con booking-service.");
  }
});

const renderMyBookings = (bookings) => {
  if (!getToken()) {
    myBookingsList.innerHTML = '<div class="booking-row"><strong>Inicia sesion para ver tus reservas.</strong></div>';
    return;
  }

  if (!bookings.length) {
    myBookingsList.innerHTML = '<div class="booking-row"><strong>No tienes reservas registradas.</strong></div>';
    return;
  }

  myBookingsList.innerHTML = bookings
    .map((booking) => {
      const canCancel = booking.status === "ACTIVE";
      const action = canCancel
        ? `<button type="button" data-action="cancel-booking" data-id="${booking.id}">Cancelar</button>`
        : "<span></span>";

      return `<div class="booking-row">
        <strong>${escapeHtml(booking.space.name)} (${escapeHtml(booking.status)})</strong>
        <span>${escapeHtml(booking.date)} - ${escapeHtml(booking.startTime)} a ${escapeHtml(booking.endTime)} - ${escapeHtml(booking.attendees)} asistentes</span>
        ${action}
      </div>`;
    })
    .join("");
};

const loadMyBookings = async () => {
  if (!getToken()) {
    renderMyBookings([]);
    setMyBookingsMessage("Inicia sesion para consultar tus reservas.");
    return;
  }

  setMyBookingsMessage("");

  try {
    const response = await fetch(`${bookingApiBaseUrl}/bookings/my`, {
      headers: buildAuthHeaders()
    });
    const data = await response.json();

    if (!response.ok) {
      setMyBookingsMessage(data.message || "No se pudieron cargar tus reservas.");
      return;
    }

    renderMyBookings(data);
  } catch (error) {
    setMyBookingsMessage("No se pudo conectar con booking-service.");
  }
};

refreshBookingsButton.addEventListener("click", loadMyBookings);

myBookingsList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action='cancel-booking']");

  if (!button) return;

  try {
    const response = await fetch(`${bookingApiBaseUrl}/bookings/${button.dataset.id}`, {
      method: "DELETE",
      headers: buildAuthHeaders()
    });
    const data = await response.json();

    if (!response.ok) {
      setMyBookingsMessage(data.message || "No se pudo cancelar la reserva.");
      return;
    }

    setMyBookingsMessage("Reserva cancelada correctamente.", true);
    await loadMyBookings();
  } catch (error) {
    setMyBookingsMessage("No se pudo conectar con booking-service.");
  }
});

const loadDashboardMetrics = async () => {
  if (!isAdmin()) {
    dashboardSignals.textContent = "El dashboard de ocupacion esta disponible para administradores.";
    return;
  }

  try {
    const [todayResponse, analyticsResponse] = await Promise.all([
      fetch(`${bookingApiBaseUrl}/dashboard/today`, { headers: buildAuthHeaders() }),
      fetch(`${bookingApiBaseUrl}/dashboard/analytics`, { headers: buildAuthHeaders() })
    ]);
    const today = await todayResponse.json();
    const analytics = await analyticsResponse.json();

    if (!todayResponse.ok || !analyticsResponse.ok) {
      dashboardSignals.textContent = today.message || analytics.message || "No se pudieron cargar las metricas.";
      return;
    }

    metricTotalSpaces.textContent = today.totalSpaces;
    metricOccupiedToday.textContent = today.occupiedToday;
    metricAvailableToday.textContent = today.availableToday;
    metricTotalBookings.textContent = analytics.totalBookings;

    const topSpace = analytics.mostBookedSpaces[0];
    const peakHour = analytics.peakHours[0];

    dashboardSignals.textContent = `Promedio de asistentes: ${analytics.averageAttendees}. Espacio mas reservado: ${topSpace ? topSpace.name : "sin datos"}. Horario mas solicitado: ${peakHour ? peakHour.hour : "sin datos"}.`;
  } catch (error) {
    dashboardSignals.textContent = "No se pudo conectar con booking-service.";
  }
};

const assistantText = document.getElementById("assistantText");
const assistantOutput = document.getElementById("assistantOutput");
const assistantButton = document.getElementById("assistantButton");

assistantButton.addEventListener("click", () => {
  const text = assistantText.value.toLowerCase();
  const capacityMatch = text.match(/\b(\d+)\b/);
  const resources = [];

  if (text.includes("proyector")) resources.push("proyector");
  if (text.includes("pantalla")) resources.push("pantalla");
  if (text.includes("pizarra")) resources.push("pizarra");
  if (text.includes("aire acondicionado")) resources.push("aire acondicionado");
  if (text.includes("silencioso")) resources.push("zona silenciosa");

  const result = {
    intent: "BUSCAR_ESPACIO",
    type: text.includes("desk") || text.includes("escritorio") ? "DESK" : "SALA",
    capacity: capacityMatch ? Number(capacityMatch[1]) : null,
    timePreference: text.includes("tarde") ? "AFTERNOON" : text.includes("manana") ? "MORNING" : null,
    resources,
    message: "Encontre filtros iniciales para buscar un espacio adecuado para ti."
  };

  assistantOutput.textContent = JSON.stringify(result, null, 2);
});

renderSession();

const savedRole = localStorage.getItem("officeSpaceUserRole");

if (savedRole) {
  activateView(getDefaultViewByRole(savedRole));
}
