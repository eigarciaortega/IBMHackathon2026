const navButtons = document.querySelectorAll(".nav-button");
const views = document.querySelectorAll(".view");
const apiBaseUrl = "http://localhost:3000";

const activateView = (viewId) => {
  navButtons.forEach((item) => item.classList.remove("active"));
  views.forEach((view) => view.classList.remove("active"));

  const button = document.querySelector(`.nav-button[data-view="${viewId}"]`);
  const view = document.getElementById(viewId);

  if (button) button.classList.add("active");
  if (view) view.classList.add("active");
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

const getDefaultViewByRole = (role) => (role === "ADMINISTRADOR" ? "dashboard" : "search");

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
  activateView("login");
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
