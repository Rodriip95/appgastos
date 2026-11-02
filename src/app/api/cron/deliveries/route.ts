import { profilesCollection, userCollection } from "@/lib/data/collections";
import { sendPush } from "@/lib/data/push";
import { isOpen } from "@/lib/finance/business";
import { formatShortDate, shiftDay, todayKey } from "@/lib/finance/format";
import { toOrder } from "@/lib/data/business";

/**
 * Tarea diaria de Vercel (ver `vercel.json`): avisa de las entregas de la próxima semana.
 * `remindedFor` guarda la fecha avisada: cada entrega se avisa una vez, y otra si se reprograma.
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
    const orders = await userCollection(user.id, "orders")
      .where("deliveryDate", ">=", today)
      .where("deliveryDate", "<=", shiftDay(today, 7))
      .get();
    for (const doc of orders.docs) {
      const order = toOrder(doc);
      if (!isOpen(order) || doc.get("remindedFor") === order.deliveryDate) continue;
      await sendPush([user.id], {
        title: `Entrega el ${formatShortDate(order.deliveryDate)}`,
        body: `Pedido de ${order.client}: ${order.detail.slice(0, 80)}`,
        url: "/negocio",
      });
      await doc.ref.update({ remindedFor: order.deliveryDate });
      sent += 1;
    }
  }
  return Response.json({ sent });
}
