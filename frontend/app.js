const navButtons = document.querySelectorAll(".nav-button");
const views = document.querySelectorAll(".view");
const apiBaseUrl = "http://localhost:3000";
const catalogApiBaseUrl = "http://localhost:3001";

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

let spacesCache = [];

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
  }
});

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
