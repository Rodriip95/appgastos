"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { removePushToken, savePushToken } from "@/lib/actions/push";
import { firebaseApp } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "bingo-push-token";

type Status = "checking" | "unsupported" | "blocked" | "off" | "on";

const read = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};
const write = (token: string | null) => {
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento: el interruptor se vuelve a calcular en cada visita.
  }
};

/** Activa o desactiva los avisos push en este dispositivo. */
export function PushToggle({ className }: { className?: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      const { isSupported } = await import("firebase/messaging");
      if (!(await isSupported()) || !process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) return setStatus("unsupported");
      if (Notification.permission === "denied") return setStatus("blocked");
      setStatus(Notification.permission === "granted" && read() ? "on" : "off");
    })().catch(() => setStatus("unsupported"));
  }, []);

  if (status === "checking" || status === "unsupported") return null;

  function enable() {
    startTransition(async () => {
      try {
        // El permiso se pide en el mismo gesto del toque.
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "blocked" : "off");
          return;
        }
        const { getMessaging, getToken } = await import("firebase/messaging");
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const token = await getToken(getMessaging(firebaseApp), {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
        const res = await savePushToken(token);
        if (!res.ok) throw new Error(res.error);
        write(token);
        setStatus("on");
        toast.success("Avisos activados en este dispositivo");
      } catch (error) {
        console.error("[push] enable:", error);
        toast.error("No pudimos activar los avisos");
      }
    });
  }

  function disable() {
    startTransition(async () => {
      try {
        const token = read();
        const { getMessaging, deleteToken } = await import("firebase/messaging");
        if (token) await removePushToken(token);
        await deleteToken(getMessaging(firebaseApp)).catch(() => false);
        write(null);
        setStatus("off");
        toast.success("Avisos desactivados");
      } catch (error) {
        console.error("[push] disable:", error);
        toast.error("No pudimos desactivar los avisos");
      }
    });
  }

  const on = status === "on";
  const blocked = status === "blocked";

  return (
    <button
      type="button"
      disabled={pending || blocked}
      onClick={on ? disable : enable}
      className={cn(
        "flex w-full items-center gap-2 rounded-xl bg-muted px-3 py-2 text-left text-xs transition hover:bg-muted/70 disabled:opacity-70",
        className,
      )}
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : on ? (
        <Bell className="size-3.5" />
      ) : (
        <BellOff className="size-3.5 text-muted-foreground" />
      )}
      <span className="flex-1">
        {blocked ? "Avisos bloqueados en el navegador" : on ? "Avisos activados" : "Activar avisos"}
      </span>
    </button>
  );
}
