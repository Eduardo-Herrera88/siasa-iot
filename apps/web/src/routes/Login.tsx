import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../api/client";
import { useAuthStore } from "../store/auth.store";

export default function Login() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/login`, { username, password });
      const me = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: me.data,
      });
      navigate("/devices");
    } catch {
      setError("Usuario o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl bg-slate-900 p-8 shadow-xl">
        <h1 className="mb-6 text-xl font-semibold">SIASA IoT</h1>

        <label className="mb-1 block text-sm text-slate-400">Usuario</label>
        <input
          className="mb-4 w-full rounded-md bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />

        <label className="mb-1 block text-sm text-slate-400">Contraseña</label>
        <input
          type="password"
          className="mb-6 w-full rounded-md bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-sky-600 py-2 font-medium hover:bg-sky-500 disabled:opacity-50"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
