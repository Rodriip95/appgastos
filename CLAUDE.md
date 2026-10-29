# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

**Bingo**: app web de gastos mensuales (idioma de la UI: español), con la marca basada en Bingo, el perro salchicha rojo del dueño. Core: registrar ingresos y gastos, y generar resúmenes/análisis mensuales (cuánto ingresó, cuánto se gastó y en qué). Las categorías y subcategorías (ej. "Carro" > "Seguro") las define el propio usuario, no son fijas. Login con Google; los datos se guardan por usuario.

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

- `lib/firebase/client.ts`: SDK cliente, solo `auth` (Firestore se usa únicamente desde el servidor). Solo para componentes `"use client"`.
- `lib/firebase/admin.ts`: SDK admin, `server-only`, init perezoso vía `getAdminAuth()` (el build no requiere credenciales; el runtime sí: `FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY`).
- `lib/auth/session.ts`: DAL. `getSessionUser()` (devuelve null) y `verifySession()` (redirige a `/login`). Usar `verifySession()` en cada página/acción protegida y, más adelante, antes de leer/escribir datos del usuario.
- `proxy.ts` (reemplaza a `middleware` en Next 16): solo chequeo optimista de presencia de cookie para redirigir a `/login`. `/login` queda excluido a propósito (evita bucle con cookie inválida); esa página redirige a `/` si la sesión es válida.

### Rutas y renderizado
`next.config.ts` tiene `cacheComponents` y `partialPrefetching`: acceder a `cookies()`/datos de runtime fuera de `<Suspense>` rompe el build. Patrón usado: shell estático + componente async con la sesión envuelto en `<Suspense>` (ver `components/layout/Header.tsx`, `(app)/page.tsx`).
- `src/app/(auth)/login`: pública.
- `src/app/(app)/`: rutas protegidas. `/` es el resumen del mes (`?m=YYYY-MM` para meses pasados; solo se puede ir hasta el primer mes con movimientos y nunca a meses futuros). `/categorias` es el panel de categorías. `/tarjetas` es el panel de tarjetas y cuotas. `/ahorros` es la página de metas (`GoalsView`). `/contactos` es la página de contactos (`ContactsView`). Los layouts no se re-renderizan al navegar, por eso la auth se verifica en cada página, no en el layout.
- Para calcular "hoy" en el servidor hay que llamar `await io()` (de `next/cache`) antes; si no, `cacheComponents` falla por valor inestable.

### Datos (Firestore)
El navegador **no** accede a Firestore: `firestore.rules` bloquea todo y todo pasa por el servidor con firebase-admin.
- `users/{uid}/categories/{id}`: `{ type: "income"|"expense", name, description, icon, color, subcategories: [{id, name}], budget|null }`. Las subcategorías van embebidas en el doc. `icon`/`color` son claves de `lib/finance/catalog.ts`, mapeadas a componentes/clases en `components/categories/CategoryIcon.tsx`.
- `users/{uid}/transactions/{id}`: `{ type, amount, date: "YYYY-MM-DD", month: "YYYY-MM", categoryId|null, subcategoryId|null, note, recurring }`. Las fechas son strings (sin problemas de zona horaria); `month` se deriva de `date` y es lo que se consulta (igualdad + orden en memoria, sin índices compuestos).
- `users/{uid}/cards/{id}`: `{ name, closingDay, dueDay, color }` (tarjetas de crédito). Una compra con tarjeta (`createCardPurchase` en `lib/actions/cards.ts`) crea **un movimiento por cuota** en `transactions`, con `cardId`, `purchaseId` (compartido por todas las cuotas), `purchaseDate` e `installment: {n, total}`. Cada cuota se fecha en el vencimiento del resumen que la cobra (compra después del cierre → resumen siguiente; vencimiento ≤ cierre → mes siguiente). Las cuotas se editan/borran como compra completa (`updateCardPurchase`/`deleteCardPurchase`); `updateTransaction` las rechaza.
- Lógica pura de tarjetas (cronograma de cuotas, próximo vencimiento, `upcomingDues`) en `lib/finance/cards.ts`. `/tarjetas` muestra próximos resúmenes y compras en cuotas; la home muestra `DueReminders` (vencimientos de los próximos 7 días, se puede cerrar por sesión del navegador).
- `users/{uid}/goals/{id}`: `{ name, target, targetDate|null, icon, color, saved }` (metas de ahorro). `users/{uid}/goalMovements/{id}`: `{ goalId, amount (+aporte / −retiro), date, month, note }`. `saved` se actualiza en una transacción junto con cada movimiento (`lib/actions/goals.ts`); no se edita desde el formulario de la meta. Lo apartado en el mes se muestra en el balance como "Apartaste $X · Libre $Y" (no es un gasto). Lógica pura en `lib/finance/goals.ts` (avance, cuánto apartar por mes).
- Contactos (base de lo compartido): `users/{uid}` guarda un perfil público `{email, emailLower, name, photo}` (se crea en `createSession` y al abrir `/contactos`; se busca por email exacto, nunca hay listados). `contactRequests/{fromUid_toUid}`: `{fromUid, toUid, status: pending|accepted|rejected, from, to}` (copias de nombre/email/foto). `users/{uid}/contacts/{otherUid}` se crea en ambos lados al aceptar. `sendContactRequest` responde igual exista o no el email (no revela quién usa la app) y acepta sola si la otra persona ya había invitado. Lo compartido (gastos/objetivos) solo se podrá abrir con contactos aceptados.
- Lecturas: `lib/data/*` (DAL, `server-only`, cada función llama `verifySession()`). Escrituras: Server Actions en `lib/actions/*` (validan con zod, verifican que la categoría sea del usuario y del mismo tipo, y llaman `refresh()` de `next/cache`). Devuelven `ActionResult` en vez de lanzar.
- Al borrar una categoría, sus movimientos quedan como "Sin categoría". Las categorías sugeridas están en `lib/finance/defaults.ts` y se importan con `addDefaultCategories()` (no duplica por nombre+tipo).
- Lógica pura (formato de montos/fechas, `parseAmount`, `summarizeMonth`) en `lib/finance/`, usable en servidor y cliente.

### UI
- Server Components por defecto; `"use client"` solo para interacción (formularios, sheets, nav activa, menú de usuario).
- `components/common/ResponsiveSheet.tsx`: bottom sheet (vaul) en mobile, Dialog en desktop. Úsalo para formularios.
- La vista del mes es `components/dashboard/DashboardView.tsx` (solo presentación; `(app)/page.tsx` trae los datos). Recibe también el mes anterior para comparar y detectar fijos pendientes.
- `TransactionSheetProvider` aporta el formulario de alta/edición. Lo abren `QuickAddButton` (+ en el total de ingresos y − en el de gastos de `BalanceCard`), `ScrollAddButton` (+ flotante que aparece cuando esos totales salen de pantalla), `RecurringSuggestions` y las filas (`TransactionRow`, que además se deslizan para eliminar).
- Formulario: categorías ordenadas por uso, "Registrar de nuevo" (prefill) y la marca `recurring` (gasto fijo mensual).
- Desglose (`Breakdown`): dona SVG, comparación con el mes anterior y link a la lista filtrada por categoría (`?c=<categoryId|none>`). `BudgetsCard` usa `category.budget` (tope mensual, solo gastos).
- `TransactionList` es client: búsqueda local, filtro por `?c=` y días cargados de a 7.
- Evitar pantallas cargadas: listas largas usan `CollapsibleList` ("Ver N más"; no colapsa si oculta uno solo), el formulario muestra las 7 categorías más usadas + "Más" y las tarjetas de categoría muestran 4 subcategorías + "+N". Ojo: a un componente client desde un Server Component solo se le pasan props serializables (nada de funciones).
- Tema claro/oscuro con next-themes (`ThemeProvider`, `ThemeToggle` en el menú). PWA: `app/manifest.ts` + `public/icon.svg`.
- Navegación (`components/layout/AppNav.tsx`): en mobile, menú lateral (`SideMenu`, Drawer de vaul con `direction="left"`) abierto desde el botón ☰ del header, con el usuario y cerrar sesión al pie (llega del servidor como prop `footer`). En desktop, links en el header (`DesktopNav`). Las secciones se definen una sola vez en `ITEMS`.
- Home: si el usuario tiene tarjetas, `CardsStrip` muestra un carrusel con el próximo vencimiento de cada una (enlaza a `/tarjetas`).

## Marca (Bingo)
- Paleta en `src/app/globals.css`: blanco cálido (`--background`), marrón rojizo como `--primary` (#9c3b22) y naranja como `--brand-orange` (#f28c28, clase `bg-brand-orange`/`text-brand-orange`). En oscuro el primario pasa a ser el naranja. Verde/rojo quedan solo para ingreso/gasto.
- Ilustraciones en `components/brand/Bingo.tsx` (SVG inline, sin el pan): `BingoDog` (`variant="hello"` en el login, `"wallet"` con la billetera en la home vía `BingoGreeting`), `BingoMark` (cabeza: header, menú, ícono) y `BingoWordmark` (logotipo).
- Tipografía del logotipo: Fredoka (Google Fonts, `font-brand`), letras con rebote y borde marrón. La fuente de Bluey es propietaria; Fredoka es la alternativa libre más parecida.
- Exportes estáticos en `public/brand/*.svg` e ícono PWA en `public/icon.svg`; se regeneran desde los componentes con `npm run brand:export`.

## Next.js

`AGENTS.md` advierte que esta versión de Next.js (16.x) tiene cambios incompatibles respecto a lo conocido: antes de escribir código de Next, leer la guía relevante en `node_modules/next/dist/docs/` y atender los avisos de deprecación.
