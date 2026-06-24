import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import { saveSession } from "../utils/authStorage";
import MessageBox from "../components/MessageBox";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@corporativoalpha.com");
  const [password, setPassword] = useState("Admin123");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      const response = await login(email, password);
      saveSession(response.token, response.user);

      if (response.user.role === "ADMINISTRADOR") {
        navigate("/admin");
      } else {
        navigate("/spaces");
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>OfficeSpace</h1>
        <p>Gestión Híbrida Inteligente</p>

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <button type="submit">Iniciar sesión</button>

        <MessageBox type="error" message={error} />
      </form>
    </main>
  );
}