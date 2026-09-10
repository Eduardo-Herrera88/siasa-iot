import { useEffect, useState } from "react";

export interface ToastMessage {
  id: number;
  text: string;
  tone: "error" | "success";
}

let nextId = 1;

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  function push(text: string, tone: ToastMessage["tone"] = "error") {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  return { toasts, push };
}

export function ToastContainer({ toasts }: { toasts: ToastMessage[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: ToastMessage }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={`rounded-lg border px-4 py-2.5 text-sm shadow-lg backdrop-blur transition-all duration-200 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      } ${
        toast.tone === "error"
          ? "border-red-900/50 bg-red-950/90 text-red-300"
          : "border-emerald-900/50 bg-emerald-950/90 text-emerald-300"
      }`}
    >
      {toast.text}
    </div>
  );
}
