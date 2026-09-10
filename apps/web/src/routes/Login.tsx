import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../api/client";
import { useAuthStore } from "../store/auth.store";
import { ChipLogo } from "../components/icons";

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(rgba(148,163,184,0.35) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 40%, black 40%, transparent 80%)",
        }}
      />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/20 blur-[120px]" />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm animate-[fadeIn_0.3s_ease-out] rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-black/40 backdrop-blur"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-sky-500/30">
          <ChipLogo />
        </div>
        <h1 className="mb-1 text-center text-2xl font-semibold text-slate-50">SIASA IoT</h1>
        <p className="mb-7 text-center text-sm text-slate-400">Plataforma de automatización</p>

        <label className="mb-1.5 block text-xs font-medium text-slate-400">Usuario</label>
        <input
          className="mb-4 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          autoComplete="username"
        />

        <label className="mb-1.5 block text-xs font-medium text-slate-400">Contraseña</label>
        <input
          type="password"
          className="mb-6 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {error && (
          <p className="mb-4 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-sky-600 py-2.5 font-medium text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>
    </div>
  );
}
