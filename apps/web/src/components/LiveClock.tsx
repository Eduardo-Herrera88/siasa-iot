import { useEffect, useState } from "react";

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");

  return (
    <div className="text-right leading-tight">
      <div className="font-mono text-base font-semibold tabular-nums text-slate-100">
        {hh}:{mm}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {WEEKDAYS[now.getDay()]} {now.getDate()} {MONTHS[now.getMonth()]}
      </div>
    </div>
  );
}
