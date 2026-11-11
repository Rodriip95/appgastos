import { profilesCollection, userCollection } from "@/lib/data/collections";
import { sendPush } from "@/lib/data/push";
import { isOpen, todayAgendaPush } from "@/lib/finance/business";
import { formatShortDate, shiftDay, todayKey } from "@/lib/finance/format";
import { toOrder } from "@/lib/data/business";

/**
 * Tarea diaria de Vercel (ver `vercel.json`, 9 h de Buenos Aires):
 * 1. La agenda de hoy en un solo aviso ("Hoy tienes 2 turnos y 1 entrega"), una vez por día
 *    (`settings/business.agendaNotifiedFor`).
 * 2. Las entregas de pedidos de la próxima semana. `remindedFor` guarda la fecha avisada:
 *    cada entrega se avisa una vez, y otra si se reprograma. Las de hoy ya van en la agenda.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("No autorizado", { status: 401 });
  }

  const today = todayKey();
  const users = await profilesCollection().select().get();
  let sent = 0;

  for (const user of users.docs) {
    const snap = await userCollection(user.id, "orders")
      .where("deliveryDate", ">=", today)
      .where("deliveryDate", "<=", shiftDay(today, 7))
      .get();
    if (snap.empty) continue;
    const orders = snap.docs.map((doc) => ({ doc, order: toOrder(doc) }));

    const settings = userCollection(user.id, "settings").doc("business");
    const agenda = todayAgendaPush(
      orders.map((o) => o.order),
      today,
    );
    if (agenda && (await settings.get()).get("agendaNotifiedFor") !== today) {
      await sendPush([user.id], { ...agenda, url: "/negocio/agenda" });
      await settings.set({ agendaNotifiedFor: today }, { merge: true });
      sent += 1;
    }

    for (const { doc, order } of orders) {
      if (order.kind !== "order" || order.deliveryDate === today) continue;
      if (!isOpen(order) || doc.get("remindedFor") === order.deliveryDate) continue;
      await sendPush([user.id], {
        title: `Entrega el ${formatShortDate(order.deliveryDate)}`,
        body: `Pedido de ${order.client}: ${order.detail.slice(0, 80)}`,
        url: "/negocio/pedidos",
      });
      await doc.ref.update({ remindedFor: order.deliveryDate });
      sent += 1;
    }
  }
  return Response.json({ sent });
}
