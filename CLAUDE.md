# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

App web de gastos mensuales (idioma de la UI: español). Core: registrar ingresos y gastos, y generar resúmenes/análisis mensuales (cuánto ingresó, cuánto se gastó y en qué). Las categorías y subcategorías (ej. "Carro" > "Seguro") las define el propio usuario, no son fijas. Login con Google; los datos se guardan por usuario.

Stack: Next.js (App Router, `src/` dir, alias `@/*`), TypeScript, Tailwind CSS v4, shadcn/ui (estilo radix-nova, íconos lucide), zod, Firebase (Auth con Google + Firestore vía firebase-admin). Diseño mobile first.

Moneda, locale y zona horaria se configuran en `src/lib/config.ts` (por defecto ARS / es-AR / Buenos Aires).

## Comandos

```bash
npm run dev      # servidor de desarrollo (Turbopack)
npm run build    # build de producción
npm run lint     # ESLint
```

No hay framework de tests configurado todavía. Componentes shadcn nuevos: `npx shadcn@latest add <nombre>` (quedan en `src/components/ui`, no editarlos salvo necesidad).

## Configuración de Firebase

Copiar `.env.example` a `.env.local` y completar las variables `NEXT_PUBLIC_FIREBASE_*` (Firebase Console > Project settings > Web app). `.gitignore` ignora `.env*` salvo `.env.example`. Hay que habilitar el proveedor Google en Firebase Authentication.

## Arquitectura

### Autenticación (Google + cookie de sesión)
Flujo: el cliente hace `signInWithPopup` (`components/auth/GoogleSignInButton.tsx`) → manda el ID token a la Server Action `createSession` (`lib/auth/actions.ts`) → el servidor lo verifica con firebase-admin y guarda una cookie httpOnly `session` (5 días). La sesión vive en la cookie, no en el SDK cliente (el SDK cliente cierra su sesión tras crear la cookie; el popup se abre sin `await` previos para que mobile no lo bloquee).

- `lib/firebase/client.ts`: SDK cliente (`auth`, `db`). Solo para componentes `"use client"`.
- `lib/firebase/admin.ts`: SDK admin, `server-only`, init perezoso vía `getAdminAuth()` (el build no requiere credenciales; el runtime sí: `FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY`).
- `lib/auth/session.ts`: DAL. `getSessionUser()` (devuelve null) y `verifySession()` (redirige a `/login`). Usar `verifySession()` en cada página/acción protegida y, más adelante, antes de leer/escribir datos del usuario.
- `proxy.ts` (reemplaza a `middleware` en Next 16): solo chequeo optimista de presencia de cookie para redirigir a `/login`. `/login` queda excluido a propósito (evita bucle con cookie inválida); esa página redirige a `/` si la sesión es válida.

### Rutas y renderizado
`next.config.ts` tiene `cacheComponents` y `partialPrefetching`: acceder a `cookies()`/datos de runtime fuera de `<Suspense>` rompe el build. Patrón usado: shell estático + componente async con la sesión envuelto en `<Suspense>` (ver `components/layout/Header.tsx`, `(app)/page.tsx`).
- `src/app/(auth)/login`: pública.
- `src/app/(app)/`: rutas protegidas. `/` es el resumen del mes (`?m=YYYY-MM` para meses pasados; solo se puede ir hasta el primer mes con movimientos y nunca a meses futuros). `/categorias` es el panel de categorías. `/tarjetas` es el panel de tarjetas y cuotas. Los layouts no se re-renderizan al navegar, por eso la auth se verifica en cada página, no en el layout.
- Para calcular "hoy" en el servidor hay que llamar `await io()` (de `next/cache`) antes; si no, `cacheComponents` falla por valor inestable.

### Datos (Firestore)
El navegador **no** accede a Firestore: `firestore.rules` bloquea todo y todo pasa por el servidor con firebase-admin.
- `users/{uid}/categories/{id}`: `{ type: "income"|"expense", name, description, icon, color, subcategories: [{id, name}] }`. Las subcategorías van embebidas en el doc. `icon`/`color` son claves de `lib/finance/catalog.ts`, mapeadas a componentes/clases en `components/categories/CategoryIcon.tsx`.
- `users/{uid}/transactions/{id}`: `{ type, amount, date: "YYYY-MM-DD", month: "YYYY-MM", categoryId|null, subcategoryId|null, note }`. Las fechas son strings (sin problemas de zona horaria); `month` se deriva de `date` y es lo que se consulta (igualdad + orden en memoria, sin índices compuestos).
- `users/{uid}/cards/{id}`: `{ name, closingDay, dueDay, color }` (tarjetas de crédito). Una compra con tarjeta (`createCardPurchase` en `lib/actions/cards.ts`) crea **un movimiento por cuota** en `transactions`, con `cardId`, `purchaseId` (compartido por todas las cuotas), `purchaseDate` e `installment: {n, total}`. Cada cuota se fecha en el vencimiento del resumen que la cobra (compra después del cierre → resumen siguiente; vencimiento ≤ cierre → mes siguiente). Las cuotas se editan/borran como compra completa (`updateCardPurchase`/`deleteCardPurchase`); `updateTransaction` las rechaza.
- Lógica pura de tarjetas (cronograma de cuotas, próximo vencimiento, `upcomingDues`) en `lib/finance/cards.ts`. `/tarjetas` muestra próximos resúmenes y compras en cuotas; la home muestra `DueReminders` (vencimientos de los próximos 7 días, se puede cerrar por sesión del navegador).
- Lecturas: `lib/data/*` (DAL, `server-only`, cada función llama `verifySession()`). Escrituras: Server Actions en `lib/actions/*` (validan con zod, verifican que la categoría sea del usuario y del mismo tipo, y llaman `refresh()` de `next/cache`). Devuelven `ActionResult` en vez de lanzar.
- Al borrar una categoría, sus movimientos quedan como "Sin categoría". Las categorías sugeridas están en `lib/finance/defaults.ts` y se importan con `addDefaultCategories()` (no duplica por nombre+tipo).
- Lógica pura (formato de montos/fechas, `parseAmount`, `summarizeMonth`) en `lib/finance/`, usable en servidor y cliente.

### UI
- Server Components por defecto; `"use client"` solo para interacción (formularios, sheets, nav activa, menú de usuario).
- `components/common/ResponsiveSheet.tsx`: bottom sheet (vaul) en mobile, Dialog en desktop. Úsalo para formularios.
- `TransactionSheetProvider` envuelve la vista del mes y aporta el formulario de alta/edición. Lo abren `QuickActions` (botones Ingreso/Gasto, dentro de `BalanceCard` vía la prop `actions`) y las filas (`TransactionRow`) vía contexto. No hay botones flotantes.
- Navegación (`components/layout/AppNav.tsx`): en mobile, menú lateral (`SideMenu`, Drawer de vaul con `direction="left"`) abierto desde el botón ☰ del header, con el usuario y cerrar sesión al pie (llega del servidor como prop `footer`). En desktop, links en el header (`DesktopNav`). Las secciones se definen una sola vez en `ITEMS`.
- Home: si el usuario tiene tarjetas, `CardsStrip` muestra un carrusel con el próximo vencimiento de cada una (enlaza a `/tarjetas`).

## Next.js

`AGENTS.md` advierte que esta versión de Next.js (16.x) tiene cambios incompatibles respecto a lo conocido: antes de escribir código de Next, leer la guía relevante en `node_modules/next/dist/docs/` y atender los avisos de deprecación.
