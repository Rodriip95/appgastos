import "server-only";
import { createHash } from "node:crypto";
import { after } from "next/server";
import { userCollection } from "@/lib/data/collections";
import { getAdminMessaging } from "@/lib/firebase/admin";

export type PushPayload = {
  title: string;
  body: string;
  /** Ruta que abre el aviso al tocarlo */
  url: string;
};

/** Id estable de un token FCM (los tokens traen caracteres no válidos para un id). */
export const tokenId = (token: string) => createHash("sha256").update(token).digest("base64url").slice(0, 40);

const STALE = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token"]);

/** Envía un aviso a todos los dispositivos de cada usuario y borra los tokens vencidos. */
export async function sendPush(uids: string[], payload: PushPayload): Promise<void> {
  await Promise.all(
    [...new Set(uids)].map(async (uid) => {
      try {
        const col = userCollection(uid, "pushTokens");
        const devices = (await col.get()).docs.map((d) => ({ id: d.id, token: d.get("token") as string }));
        if (devices.length === 0) return;

        const res = await getAdminMessaging().sendEachForMulticast({
          tokens: devices.map((d) => d.token),
          // Solo `data`: el service worker arma la notificación (ver public/sw.js).
          data: { ...payload },
          webpush: { headers: { Urgency: "high" } },
        });
        await Promise.all(
          res.responses.map((r, i) =>
            !r.success && STALE.has(r.error?.code ?? "") ? col.doc(devices[i].id).delete() : null,
          ),
        );
      } catch (error) {
        console.error("[push] send:", error);
      }
    }),
  );
}

/** Avisa sin demorar la respuesta de la acción. */
export function notify(uids: string[], payload: PushPayload): void {
  if (uids.length > 0) after(() => sendPush(uids, payload));
}
