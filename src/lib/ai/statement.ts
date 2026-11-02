import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Category } from "@/lib/finance/types";

// Lectura de resúmenes de tarjeta con Claude Haiku (modelo chico y barato que lee PDFs e imágenes).
// Requiere ANTHROPIC_API_KEY en el entorno (Vercel > Settings > Environment Variables).

const MODEL = "claude-haiku-5-5";

const statementSchema = z.object({
  dueDate: z.string().nullable().describe("Fecha de vencimiento del resumen, YYYY-MM-DD"),
  closingDate: z.string().nullable().describe("Fecha de cierre del resumen, YYYY-MM-DD"),
  cardName: z.string().nullable().describe("Banco y marca de la tarjeta, ej. 'Visa Galicia'"),
  items: z.array(
    z.object({
      date: z.string().nullable().describe("Fecha de la compra original, YYYY-MM-DD"),
      description: z.string().describe("Comercio o concepto, legible y corto"),
      amount: z.number().describe("Monto que cobra ESTE resumen (la cuota, no el total de la compra), positivo"),
      currency: z.enum(["ARS", "USD"]),
      installment: z.number().int().describe("Número de cuota que cobra este resumen; 1 si es un pago único"),
      installments: z.number().int().describe("Cantidad total de cuotas; 1 si es un pago único"),
      categoryId: z.string().nullable().describe("id de la categoría del usuario que mejor encaja, o null"),
      subcategoryId: z.string().nullable().describe("id de la subcategoría dentro de esa categoría, o null"),
    }),
  ),
});

export type ExtractedStatement = z.infer<typeof statementSchema>;

const SYSTEM = `Lees resúmenes de tarjetas de crédito (en general de Argentina) y devolvés sus consumos como datos.

Reglas:
- Incluí cada consumo del período: compras en un pago, cuotas ("C.03/06", "Cuota 3 de 6", "03/06") e impuestos o cargos (IVA, sellos, percepciones, intereses, comisiones, mantenimiento) como pago único.
- No incluyas pagos que hizo la persona ("SU PAGO", "PAGO EN PESOS"), saldo anterior, totales, subtotales, límites ni pagos mínimos.
- No incluyas créditos, devoluciones ni bonificaciones (montos negativos).
- amount es lo que se cobra en este resumen. En una cuota, es el valor de la cuota.
- Los montos argentinos usan punto de miles y coma decimal: "12.345,67" es 12345.67.
- Si un consumo está en dólares, currency es "USD" y amount es el monto en dólares.
- Fechas en formato YYYY-MM-DD. Si la fecha de compra no trae año, deducilo de la fecha de cierre.
- description: el nombre del comercio o concepto, sin códigos ni números de cupón, con mayúscula inicial.
- Para categoryId y subcategoryId usá solo ids de la lista de categorías que te paso. Si ninguna encaja con seguridad, null.`;

function categoriesText(categories: Category[]): string {
  const expense = categories.filter((c) => c.type === "expense");
  if (expense.length === 0) return "La persona no tiene categorías: devolvé categoryId y subcategoryId en null.";
  return [
    "Categorías de gasto de la persona:",
    ...expense.map((c) => {
      const subs = c.subcategories.map((s) => `${s.name} (${s.id})`).join(", ");
      return `- ${c.name} (${c.id})${subs ? `: ${subs}` : ""}`;
    }),
  ].join("\n");
}

export type StatementFile = { data: string; mediaType: string };

export const STATEMENT_MEDIA_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export class StatementReadError extends Error {}

export async function extractStatement(file: StatementFile, categories: Category[]): Promise<ExtractedStatement> {
  const client = new Anthropic();

  const source =
    file.mediaType === "application/pdf"
      ? ({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: file.data },
        } as const)
      : ({
          type: "image",
          source: {
            type: "base64",
            media_type: file.mediaType as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
            data: file.data,
          },
        } as const);

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [source, { type: "text", text: `${categoriesText(categories)}\n\nExtraé los consumos de este resumen.` }],
      },
    ],
    output_config: { format: zodOutputFormat(statementSchema) },
  });

  if (response.stop_reason === "max_tokens") {
    throw new StatementReadError("El resumen es demasiado largo para leerlo de una vez");
  }
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new StatementReadError("No pudimos leer el resumen");
  }
  return response.parsed_output;
}
