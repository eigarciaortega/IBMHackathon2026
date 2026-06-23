const navButtons = document.querySelectorAll(".nav-button");
const protectedNavButtons = document.querySelectorAll(".protected-nav");
const adminNavButtons = document.querySelectorAll(".admin-nav");
const views = document.querySelectorAll(".view");
const apiBaseUrl = "http://localhost:3000";
const catalogApiBaseUrl = "http://localhost:3001";
const bookingApiBaseUrl = "http://localhost:3002";

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
const availabilityDate = document.getElementById("availabilityDate");
const availabilityStartTime = document.getElementById("availabilityStartTime");
const availabilityEndTime = document.getElementById("availabilityEndTime");
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
const dashboardPermissionMessage = document.getElementById("dashboardPermissionMessage");
const occupancyPercent = document.getElementById("occupancyPercent");
const occupancyBar = document.getElementById("occupancyBar");
const occupancySummary = document.getElementById("occupancySummary");
const dashboardRecommendations = document.getElementById("dashboardRecommendations");
const mostBookedSpacesChart = document.getElementById("mostBookedSpacesChart");
const peakHoursChart = document.getElementById("peakHoursChart");
const bookingsByTypeChips = document.getElementById("bookingsByTypeChips");
const assistantResourceChips = document.getElementById("assistantResourceChips");
const assistantRecentSearches = document.getElementById("assistantRecentSearches");
const assistantCard = document.getElementById("assistantCard");
const assistantOpenButton = document.getElementById("assistantOpenButton");
const assistantCloseButton = document.getElementById("assistantCloseButton");
const assistantText = document.getElementById("assistantText");
const assistantOutput = document.getElementById("assistantOutput");
const assistantButton = document.getElementById("assistantButton");
const assistantFilters = document.getElementById("assistantFilters");
const assistantSuggestions = document.getElementById("assistantSuggestions");

let spacesCache = [];
let selectedBooking = null;
let latestAssistantResponse = null;
let assistantVisible = false;

const getDefaultViewByRole = (role) => (role === "ADMINISTRADOR" ? "dashboard" : "search");
const getToken = () => localStorage.getItem("officeSpaceToken");
const getRole = () => localStorage.getItem("officeSpaceUserRole");
const isAdmin = () => getRole() === "ADMINISTRADOR";
const isLoggedIn = () => Boolean(getToken() && getRole() && localStorage.getItem("officeSpaceUserName"));

const setMessage = (element, message, isSuccess = false) => {
  element.textContent = message;
  element.classList.toggle("success", isSuccess);
};

const setLoginMessage = (message, isSuccess = false) => setMessage(loginMessage, message, isSuccess);
const setSpaceMessage = (message, isSuccess = false) => setMessage(spaceMessage, message, isSuccess);
const setAvailabilityMessage = (message, isSuccess = false) => setMessage(availabilityMessage, message, isSuccess);
const setBookingMessage = (message, isSuccess = false) => setMessage(bookingMessage, message, isSuccess);
const setMyBookingsMessage = (message, isSuccess = false) => setMessage(myBookingsMessage, message, isSuccess);

const pad = (value) => String(value).padStart(2, "0");

const localDateIso = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const timeValue = (date = new Date()) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const getSuggestedBookingWindow = () => {
  const start = new Date();
  start.setHours(start.getHours() + 1, 0, 0, 0);

  let end = new Date(start);
  end.setHours(end.getHours() + 1);

  if (localDateIso(end) !== localDateIso(start)) {
    start.setDate(start.getDate() + 1);
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setHours(1, 0, 0, 0);
  }

  return {
    date: localDateIso(start),
    startTime: timeValue(start),
    endTime: timeValue(end)
  };
};

const validateTemporalSelection = ({ date, startTime, endTime }) => {
  const today = localDateIso();

  if (!date) return "Selecciona una fecha para continuar.";
  if (date < today) return "La fecha no puede estar en el pasado.";
  if (!startTime || !endTime) return "Selecciona hora de inicio y hora de fin.";
  if (endTime <= startTime) return "La hora de fin debe ser mayor que la hora de inicio.";
  if (date === today && startTime <= timeValue()) {
    return "No puedes reservar en un horario que ya pasó. Selecciona una hora posterior.";
  }

  return "";
};

const initializeAvailabilityDefaults = (force = false) => {
  const today = localDateIso();
  const suggested = getSuggestedBookingWindow();

  availabilityDate.min = today;

  const currentValues = {
    date: availabilityDate.value,
    startTime: availabilityStartTime.value,
    endTime: availabilityEndTime.value
  };

  if (force || !currentValues.date || validateTemporalSelection(currentValues)) {
    availabilityDate.value = suggested.date;
    availabilityStartTime.value = suggested.startTime;
    availabilityEndTime.value = suggested.endTime;
  }
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const buildAuthHeaders = () => ({
  Authorization: `Bearer ${getToken()}`
});

const setAssistantVisible = (visible) => {
  assistantVisible = Boolean(visible && isLoggedIn());
  assistantCard.hidden = !assistantVisible;
  assistantOpenButton.hidden = assistantVisible || !isLoggedIn();
};

const activateView = (viewId) => {
  if (!isLoggedIn() && viewId !== "login") {
    viewId = "login";
  }

  if (viewId === "dashboard" && !isAdmin()) {
    setAvailabilityMessage("No tienes permisos para ver Dashboard. Te llevamos a Buscar.", false);
    viewId = "search";
  }

  navButtons.forEach((item) => item.classList.remove("active"));
  views.forEach((view) => view.classList.remove("active"));

  const button = document.querySelector(`.nav-button[data-view="${viewId}"]`);
  const view = document.getElementById(viewId);

  if (button) button.classList.add("active");
  if (view) view.classList.add("active");

  document.dispatchEvent(new CustomEvent("view:activated", { detail: { viewId } }));
};

const renderSession = () => {
  const name = localStorage.getItem("officeSpaceUserName");
  const role = localStorage.getItem("officeSpaceUserRole");
  const loggedIn = isLoggedIn();

  sessionCard.hidden = !loggedIn;
  logoutButton.hidden = !loggedIn;
  protectedNavButtons.forEach((button) => {
    button.hidden = !loggedIn;
  });
  adminNavButtons.forEach((button) => {
    button.hidden = !loggedIn || role !== "ADMINISTRADOR";
  });

  if (loggedIn) {
    sessionName.textContent = name;
    sessionRole.textContent = role;
  }

  if (spaceForm) {
    spaceForm.hidden = !isAdmin();
  }

  adminOnlyHeaders.forEach((element) => {
    element.hidden = !isAdmin();
  });

  dashboardPermissionMessage.hidden = loggedIn && isAdmin();
  setAssistantVisible(loggedIn && assistantVisible);
};

const resetProtectedViews = () => {
  renderSpacesTable([]);
  renderAvailability([], {});
  renderMyBookings([]);
  selectedBooking = null;
  bookingSummary.innerHTML = "<span>Selecciona un espacio disponible para preparar la reserva.</span>";
  assistantSuggestions.innerHTML = "";
  assistantFilters.innerHTML = "";
  latestAssistantResponse = null;
};

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.view) {
      activateView(button.dataset.view);
    }
  });
});

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
      headers: { "Content-Type": "application/json" },
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

    assistantVisible = true;
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
  assistantVisible = false;
  renderSession();
  resetProtectedViews();
  setLoginMessage("Sesion cerrada.", true);
  activateView("login");
});

const normalizeSpace = (space) => ({
  ...space,
  hasProjector: space.hasProjector ?? space.has_projector,
  hasAc: space.hasAc ?? space.has_ac,
  hasScreen: space.hasScreen ?? space.has_screen,
  hasWhiteboard: space.hasWhiteboard ?? space.has_whiteboard,
  isQuietZone: space.isQuietZone ?? space.is_quiet_zone
});

const formatResources = (spaceInput) => {
  const space = normalizeSpace(spaceInput);
  const resources = [];

  if (space.hasProjector) resources.push("Proyector");
  if (space.hasAc) resources.push("AC");
  if (space.hasScreen) resources.push("Pantalla");
  if (space.hasWhiteboard) resources.push("Pizarra");
  if (space.isQuietZone) resources.push("Silencioso");

  return resources.length ? resources.join(", ") : "Sin recursos";
};

const renderSpacesTable = (spaces) => {
  spacesCache = spaces.map(normalizeSpace);

  if (!getToken()) {
    spacesTableBody.innerHTML = '<tr><td colspan="6">Inicia sesion para consultar espacios.</td></tr>';
    return;
  }

  if (!spacesCache.length) {
    spacesTableBody.innerHTML = '<tr><td colspan="6">No hay espacios para mostrar.</td></tr>';
    return;
  }

  spacesTableBody.innerHTML = spacesCache
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
  if (!getToken()) {
    renderSpacesTable([]);
    setSpaceMessage("Inicia sesion para cargar el catalogo.");
    return;
  }

  if (!isAdmin()) {
    renderSpacesTable([]);
    setSpaceMessage("El CRUD de espacios esta disponible solo para administradores.");
    return;
  }

  setSpaceMessage("");

  try {
    const response = await fetch(`${catalogApiBaseUrl}/spaces`, {
      headers: buildAuthHeaders()
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
  const normalized = normalizeSpace(space);
  document.getElementById("spaceId").value = normalized.id;
  document.getElementById("spaceName").value = normalized.name;
  document.getElementById("spaceType").value = normalized.type;
  document.getElementById("spaceCapacity").value = normalized.capacity;
  document.getElementById("spaceFloor").value = normalized.floor;
  document.getElementById("spaceDescription").value = normalized.description || "";
  document.getElementById("spaceProjector").checked = normalized.hasProjector;
  document.getElementById("spaceAc").checked = normalized.hasAc;
  document.getElementById("spaceScreen").checked = normalized.hasScreen;
  document.getElementById("spaceWhiteboard").checked = normalized.hasWhiteboard;
  document.getElementById("spaceQuietZone").checked = normalized.isQuietZone;
  saveSpaceButton.textContent = "Actualizar espacio";
};

spaceForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isAdmin()) {
    setSpaceMessage("Solo ADMINISTRADOR puede modificar espacios.");
    return;
  }

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
        ...buildAuthHeaders()
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
        headers: buildAuthHeaders()
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

const buildAvailabilityQuery = () => {
  const formData = new FormData(availabilityForm);
  const params = new URLSearchParams();

  for (const [key, value] of formData.entries()) {
    if (value === "on") {
      params.set(key, "true");
    } else if (value !== "") {
      params.set(key, value);
    }
  }

  return params;
};

const getAvailabilityTemporalValues = () => ({
  date: availabilityDate.value,
  startTime: availabilityStartTime.value,
  endTime: availabilityEndTime.value
});

const renderAvailability = (spaces, request) => {
  const normalizedSpaces = spaces.map(normalizeSpace);

  if (!normalizedSpaces.length) {
    availabilityResults.innerHTML = '<article class="space-card"><h3>Sin espacios disponibles</h3><p>Prueba con otro horario, capacidad o recurso.</p></article>';
    return;
  }

  availabilityResults.innerHTML = normalizedSpaces
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
      const space = normalizedSpaces.find((item) => item.id === button.dataset.id);

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

  const temporalError = validateTemporalSelection(getAvailabilityTemporalValues());

  if (temporalError) {
    setAvailabilityMessage(temporalError);
    availabilityResults.innerHTML = "";
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

const createBookingFromPayload = async ({ spaceId, date, startTime, endTime, attendees }) => {
  const response = await fetch(`${bookingApiBaseUrl}/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders()
    },
    body: JSON.stringify({ spaceId, date, startTime, endTime, attendees })
  });
  const data = await response.json();
  return { response, data };
};

confirmBookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedBooking) {
    setBookingMessage("Selecciona un espacio disponible antes de confirmar.");
    return;
  }

  const temporalError = validateTemporalSelection({
    date: selectedBooking.date,
    startTime: selectedBooking.startTime,
    endTime: selectedBooking.endTime
  });

  if (temporalError) {
    setBookingMessage(temporalError);
    return;
  }

  try {
    const { response, data } = await createBookingFromPayload({
      spaceId: selectedBooking.space.id,
      date: selectedBooking.date,
      startTime: selectedBooking.startTime,
      endTime: selectedBooking.endTime,
      attendees: Number(confirmAttendees.value)
    });

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

const renderBars = (container, rows, labelKey, valueKey, emptyMessage) => {
  if (!rows || !rows.length) {
    container.innerHTML = `<p class="empty-state">${escapeHtml(emptyMessage)}</p>`;
    return;
  }

  const maxValue = Math.max(...rows.map((row) => Number(row[valueKey]) || 0), 1);
  container.innerHTML = rows
    .map((row) => {
      const value = Number(row[valueKey]) || 0;
      const width = Math.max((value / maxValue) * 100, 6);
      return `<div class="bar-row">
        <div class="bar-row-label"><span>${escapeHtml(row[labelKey])}</span><strong>${escapeHtml(value)}</strong></div>
        <div class="mini-track"><div class="mini-fill" style="width: ${width}%"></div></div>
      </div>`;
    })
    .join("");
};

const renderChips = (container, rows, labelKey, valueKey, emptyMessage) => {
  if (!rows || !rows.length) {
    container.innerHTML = `<p class="empty-state">${escapeHtml(emptyMessage)}</p>`;
    return;
  }

  container.innerHTML = rows
    .map((row) => `<span class="data-chip">${escapeHtml(row[labelKey] || "Sin dato")} <strong>${escapeHtml(row[valueKey] || 0)}</strong></span>`)
    .join("");
};

const buildRecommendations = (today, analytics) => {
  const recommendations = [
    "Las reservas se validan contra fecha y hora actual para evitar registros invalidos y mejorar la confiabilidad operativa."
  ];
  const peakHour = analytics.peakHours?.[0];
  const topSpace = analytics.mostBookedSpaces?.[0];
  const deskDemand = analytics.bookingsByType?.find((item) => item.type === "DESK");
  const topResource = analytics.mostRequestedResources?.[0];

  if (peakHour) {
    recommendations.push(`Alta demanda detectada a las ${peakHour.hour}. Considera promover horarios alternativos para reducir saturacion.`);
  }

  if (topSpace) {
    recommendations.push(`${topSpace.name} concentra la mayor cantidad de reservas. Evalua crear mas espacios con caracteristicas similares.`);
  }

  if (Number(analytics.averageAttendees) >= 5) {
    recommendations.push(`El promedio de asistentes es de ${Number(analytics.averageAttendees).toFixed(2)}. Conviene priorizar salas medianas o grandes.`);
  }

  if (deskDemand && Number(deskDemand.bookings) > 0) {
    recommendations.push("Los escritorios individuales muestran demanda relevante. Se recomienda mantener disponibilidad flexible para trabajo hibrido.");
  }

  if (topResource) {
    recommendations.push(`Los usuarios solicitan con frecuencia ${topResource.resource}. Prioriza estos recursos en futuras adecuaciones.`);
  }

  if (!Number(analytics.totalBookings) && !Number(today.totalBookingsToday)) {
    recommendations.push("Aun no hay suficientes datos para detectar tendencias solidas. Continua monitoreando el uso de espacios.");
  }

  if (!recommendations.length) {
    recommendations.push("Aun no hay datos suficientes para generar esta recomendacion.");
  }

  return recommendations;
};

const renderDashboard = (today, analytics) => {
  const totalSpaces = Number(today.totalSpaces) || 0;
  const occupiedToday = Number(today.occupiedToday) || 0;
  const percent = totalSpaces ? Math.round((occupiedToday / totalSpaces) * 100) : 0;

  metricTotalSpaces.textContent = totalSpaces;
  metricOccupiedToday.textContent = occupiedToday;
  metricAvailableToday.textContent = today.availableToday ?? "-";
  metricTotalBookings.textContent = analytics.totalBookings ?? 0;
  occupancyPercent.textContent = `${percent}%`;
  occupancyBar.style.width = `${Math.min(percent, 100)}%`;
  occupancySummary.textContent = `${occupiedToday} de ${totalSpaces} espacios ocupados hoy.`;

  renderBars(mostBookedSpacesChart, analytics.mostBookedSpaces || [], "name", "bookings", "Aun no hay espacios reservados.");
  renderBars(peakHoursChart, analytics.peakHours || [], "hour", "bookings", "Aun no hay horarios pico.");
  renderChips(bookingsByTypeChips, analytics.bookingsByType || [], "type", "bookings", "Aun no hay reservas por tipo.");
  renderChips(assistantResourceChips, analytics.mostRequestedResources || [], "resource", "searches", "Aun no hay recursos solicitados.");

  const recent = analytics.recentAssistantSearches || [];
  assistantRecentSearches.innerHTML = recent.length
    ? recent
        .map(
          (search) => `<div class="recent-item">
            <strong>${escapeHtml(search.detectedType || "Consulta")}</strong>
            <span>${escapeHtml(search.queryText)}</span>
          </div>`
        )
        .join("")
    : '<p class="empty-state">Aun no hay busquedas recientes del asistente.</p>';

  dashboardRecommendations.innerHTML = buildRecommendations(today, analytics)
    .map((item) => `<article class="recommendation-card">${escapeHtml(item)}</article>`)
    .join("");
};

const loadDashboardMetrics = async () => {
  if (!isAdmin()) {
    dashboardPermissionMessage.hidden = false;
    return;
  }

  dashboardPermissionMessage.hidden = true;

  try {
    const [todayResponse, analyticsResponse] = await Promise.all([
      fetch(`${bookingApiBaseUrl}/dashboard/today`, { headers: buildAuthHeaders() }),
      fetch(`${bookingApiBaseUrl}/dashboard/analytics`, { headers: buildAuthHeaders() })
    ]);
    const today = await todayResponse.json();
    const analytics = await analyticsResponse.json();

    if (!todayResponse.ok || !analyticsResponse.ok) {
      dashboardRecommendations.innerHTML = `<p class="empty-state">${escapeHtml(today.message || analytics.message || "No se pudieron cargar las metricas.")}</p>`;
      return;
    }

    renderDashboard(today, analytics);
  } catch (error) {
    dashboardRecommendations.innerHTML = '<p class="empty-state">No se pudo conectar con booking-service.</p>';
  }
};

const renderAssistantFilters = (filters) => {
  if (!filters || !Object.keys(filters).length) {
    assistantFilters.innerHTML = "";
    return;
  }

  const resources = filters.resources?.length ? filters.resources.join(", ") : "Sin recursos detectados";
  assistantFilters.innerHTML = `
    <span>Tipo: ${escapeHtml(filters.type || "Sin detectar")}</span>
    <span>Capacidad: ${escapeHtml(filters.capacity || "Sin detectar")}</span>
    <span>Fecha: ${escapeHtml(filters.date || "Sin detectar")}</span>
    <span>Horario: ${escapeHtml(filters.startTime || "-")} - ${escapeHtml(filters.endTime || "-")}</span>
    <span>Recursos: ${escapeHtml(resources)}</span>
  `;
};

const renderAssistantSuggestions = (data) => {
  const spaces = data.suggestedSpaces || [];

  if (!spaces.length) {
    assistantSuggestions.innerHTML = "";
    return;
  }

  assistantSuggestions.innerHTML = spaces
    .map((spaceInput) => {
      const space = normalizeSpace(spaceInput);
      return `<article class="assistant-suggestion-card">
        <span>${escapeHtml(space.type)}</span>
        <h4>${escapeHtml(space.name)}</h4>
        <p>${escapeHtml(space.description || "")}</p>
        <strong>${escapeHtml(space.capacity)} personas - ${escapeHtml(space.floor)}</strong>
        <small>${escapeHtml(formatResources(space))}</small>
        <button type="button" data-action="assistant-reserve" data-id="${space.id}">Reservar</button>
      </article>`;
    })
    .join("");
};

assistantButton.addEventListener("click", async () => {
  if (!getToken()) {
    assistantOutput.textContent = "Inicia sesion para que Alpha Assistant pueda buscar espacios disponibles.";
    return;
  }

  assistantButton.disabled = true;
  assistantButton.textContent = "Buscando...";
  assistantSuggestions.innerHTML = "";

  try {
    const response = await fetch(`${bookingApiBaseUrl}/assistant/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders()
      },
      body: JSON.stringify({ message: assistantText.value })
    });
    const data = await response.json();
    latestAssistantResponse = data;
    assistantOutput.textContent = data.message || "No pude consultar Alpha Assistant.";
    renderAssistantFilters(data.interpretedFilters);
    renderAssistantSuggestions(data);
  } catch (error) {
    assistantOutput.textContent = "No se pudo conectar con booking-service.";
  } finally {
    assistantButton.disabled = false;
    assistantButton.textContent = "Buscar sugerencias";
  }
});

assistantSuggestions.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action='assistant-reserve']");

  if (!button || !latestAssistantResponse) return;

  const filters = latestAssistantResponse.interpretedFilters || {};
  const space = (latestAssistantResponse.suggestedSpaces || []).map(normalizeSpace).find((item) => item.id === button.dataset.id);
  let attendees = Number(filters.capacity);

  if (!space) return;

  if (!attendees || attendees < 1) {
    attendees = Number(window.prompt("Cuantas personas asistiran?"));
  }

  if (!attendees || attendees < 1) {
    assistantOutput.textContent = `${latestAssistantResponse.message}\n\nNecesito un numero valido de asistentes antes de reservar.`;
    return;
  }

  const temporalError = validateTemporalSelection({
    date: filters.date,
    startTime: filters.startTime,
    endTime: filters.endTime
  });

  if (temporalError) {
    assistantOutput.textContent = `${latestAssistantResponse.message}\n\n${temporalError}`;
    return;
  }

  button.disabled = true;
  button.textContent = "Reservando...";

  try {
    const { response, data } = await createBookingFromPayload({
      spaceId: space.id,
      date: filters.date,
      startTime: filters.startTime,
      endTime: filters.endTime,
      attendees
    });

    if (!response.ok) {
      assistantOutput.textContent = `${latestAssistantResponse.message}\n\nNo pude reservar ${space.name}: ${data.message || "error desconocido."}`;
      return;
    }

    assistantOutput.textContent = `Reserva creada para ${space.name} el ${filters.date} de ${filters.startTime} a ${filters.endTime}.`;
    await loadMyBookings();
  } catch (error) {
    assistantOutput.textContent = "No se pudo conectar con booking-service.";
  } finally {
    button.disabled = false;
    button.textContent = "Reservar";
  }
});

assistantCloseButton.addEventListener("click", () => {
  setAssistantVisible(false);
});

assistantOpenButton.addEventListener("click", () => {
  setAssistantVisible(true);
});

document.addEventListener("view:activated", (event) => {
  if (event.detail.viewId === "search") {
    initializeAvailabilityDefaults();
  }

  if (event.detail.viewId === "dashboard") {
    loadSpaces();
    loadDashboardMetrics();
  }

  if (event.detail.viewId === "bookings") {
    loadMyBookings();
  }
});

initializeAvailabilityDefaults();
renderSession();

if (isLoggedIn()) {
  assistantVisible = true;
  renderSession();
  activateView(getDefaultViewByRole(getRole()));
} else {
  activateView("login");
}
