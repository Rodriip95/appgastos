import "server-only";
import { cache } from "react";
import type { DocumentSnapshot, Timestamp } from "firebase-admin/firestore";
import { verifySession } from "@/lib/auth/session";
import { DOC_ID_RE, sharedCollection } from "@/lib/data/collections";
import { toPerson } from "@/lib/data/profiles";
import { computeBalance, computeGoalProgress } from "@/lib/finance/shared";
import type { SharedEntry, SharedMember, SharedSpace } from "@/lib/finance/types";

export function toSpace(doc: DocumentSnapshot): SharedSpace {
  const d = doc.data() ?? {};
  const members = Object.entries((d.members ?? {}) as Record<string, FirebaseFirestore.DocumentData>).map(
    ([uid, m]): SharedMember => ({ ...toPerson(uid, m), status: m.status ?? "accepted" }),
  );
  return {
    id: doc.id,
    kind: d.kind === "goal" ? "goal" : "expenses",
    name: d.name ?? "",
    icon: d.icon ?? "wallet",
    color: d.color ?? "slate",
    createdBy: d.createdBy ?? "",
    members,
    subcategories: d.subcategories ?? [],
    goal:
      d.kind === "goal"
        ? { targetCents: Number(d.goal?.targetCents) || 0, targetDate: d.goal?.targetDate ?? null }
        : null,
  };
}

const ENTRY_TYPES = ["expense", "settlement", "deposit", "withdrawal"];

function toEntry(doc: DocumentSnapshot): SharedEntry {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    type: ENTRY_TYPES.includes(d.type) ? d.type : "expense",
    paidBy: d.paidBy,
    amountCents: Number(d.amountCents) || 0,
    date: d.date,
    month: d.month,
    subcategoryId: d.subcategoryId ?? null,
    note: d.note ?? "",
    split: d.split ?? {},
    createdBy: d.createdBy ?? "",
    createdAt: (d.createdAt as Timestamp | undefined)?.toMillis() ?? 0,
  };
}

/** Los movimientos más recientes primero. */
const newestFirst = (a: SharedEntry, b: SharedEntry) =>
  b.date.localeCompare(a.date) || b.createdAt - a.createdAt;

export const acceptedMembers = (space: SharedSpace) => space.members.filter((m) => m.status === "accepted");

export type SpaceSummary = {
  space: SharedSpace;
  /** Gastos: total gastado. Objetivos: total reservado (centavos) */
  total: number;
  /** Gastos: saldo de quien consulta. Objetivos: lo que aportó neto (centavos) */
  mine: number;
};

export type SharedOverview = {
  spaces: SpaceSummary[];
  /** Espacios a los que me invitaron y todavía no respondí */
  invites: SharedSpace[];
};

export const getSharedOverview = cache(async (kind: SharedSpace["kind"]): Promise<SharedOverview> => {
  const { uid } = await verifySession();
  const snap = await sharedCollection().where("memberIds", "array-contains", uid).get();
  const docs = snap.docs.filter((d) => toSpace(d).kind === kind);
  const all = docs.map(toSpace);
  const statusOf = (s: SharedSpace) => s.members.find((m) => m.uid === uid)?.status;

  const spaces = await Promise.all(
    docs
      .filter((doc) => statusOf(toSpace(doc)) === "accepted")
      .map(async (doc) => {
        const space = toSpace(doc);
        const entries = (await doc.ref.collection("entries").get()).docs.map(toEntry);
        const uids = space.members.map((m) => m.uid);
        if (kind === "goal") {
          const progress = computeGoalProgress(entries, uids);
          return { space, total: progress.saved, mine: progress.people[uid] ?? 0 };
        }
        const balance = computeBalance(entries, uids);
        return { space, total: balance.total, mine: balance.people[uid]?.net ?? 0 };
      }),
  );
  return {
    spaces: spaces.sort((a, b) => a.space.name.localeCompare(b.space.name)),
    invites: all.filter((s) => statusOf(s) === "pending"),
  };
});

export type SharedDetail = {
  space: SharedSpace;
  entries: SharedEntry[];
  /** uid de quien consulta */
  me: string;
};

/** Espacio y movimientos; null si no existe o quien consulta no participa. */
export async function getSharedDetail(id: string, kind: SharedSpace["kind"]): Promise<SharedDetail | null> {
  const { uid } = await verifySession();
  if (!DOC_ID_RE.test(id)) return null;
  const doc = await sharedCollection().doc(id).get();
  if (!doc.exists) return null;
  const space = toSpace(doc);
  if (space.kind !== kind) return null;
  if (space.members.find((m) => m.uid === uid)?.status !== "accepted") return null;
  const entries = (await doc.ref.collection("entries").get()).docs.map(toEntry).sort(newestFirst);
  return { space, entries, me: uid };
}

/** Cantidad de invitaciones a espacios compartidos sin responder (globito del menú). */
export const getPendingInviteCount = cache(async (kind: SharedSpace["kind"]): Promise<number> => {
  return (await getSharedOverview(kind)).invites.length;
});
