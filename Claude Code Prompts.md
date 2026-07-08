# AlbaIA — Prompts para Claude Code (desarrollo completo + pruebas)

> Requisito previo: Fase 0 hecha (Supabase creado, SQL de §5 del MVP Review ejecutado, anonymous sign-ins activado, `.env.local` con las 3 keys, `pnpm dev` corre).
> Copia `MVP Review + Plan.md` y este archivo a la raíz del repo.
> Dale a Claude Code **un prompt a la vez**, en orden. Al final de cada uno hay un checkpoint — pruébalo tú antes de continuar. Si falla, pega el error a Claude Code y pide que lo arregle antes de seguir.

---

## PROMPT 0 — Contexto (pégalo primero, una sola vez)

```
Eres un ingeniero senior de Next.js + Supabase trabajando en AlbaIA, una app de
formalización de negocios para Guatemala. Lee estos archivos antes de escribir
código y trátalos como especificación vinculante:

1. MVP Review + Plan.md — el plan por fases, la tabla ruta→diseño y los criterios
   de aceptación.
2. app/globals.css — los design tokens. TODO el UI usa estos tokens vía Tailwind
   (bg-background, text-foreground, border-border, bg-primary, text-muted-foreground,
   bg-panel, label-caps, etc). Nunca hardcodees hex en componentes.
3. lib/ — ya está completo: types.ts, gating.ts (can/requiredTierFor), actions/
   (funnel, auth, billing, checklist, documents), billing/plans.ts, i18n/,
   checklist-seed.ts, supabase/. NO modifiques lib/ salvo que un prompt lo pida
   explícitamente. La UI nueva DEBE llamar estas actions existentes.

Reglas permanentes:
- TypeScript estricto, cero `any`. Componentes < 150 líneas; extrae subcomponentes.
- Server Components por defecto; "use client" solo donde hay interactividad.
- Toda string visible va en lib/i18n/en.ts (agrega claves; nunca texto inline).
- Usa los componentes existentes en components/ui/ (Button, Card, Input, Label,
  Textarea, Badge). Si necesitas uno nuevo (Select, Progress, Dialog), créalo en
  components/ui/ siguiendo el mismo patrón shadcn.
- Layout de páginas internas: header blanco con borde inferior border-border,
  logo AlbaIA (components/brand.tsx), nav Process/Status/Documents/Support,
  contenido max-w-[1280px] centrado, padding lateral 64px en desktop.
- Hit targets mínimo 44px. Formularios navegables por teclado, labels asociados,
  estados de error con role="alert".
- Estados: pending con useTransition + botón disabled, errores visibles, nunca
  botones muertos.

Confirma que leíste todo y lista las rutas que existen hoy vs las que faltan.
No escribas código todavía.
```

---

## PROMPT 1 — Fase 1: Flujo invitado hasta roadmap

```
Ejecuta la Fase 1 del MVP Review + Plan.md. Construye 3 rutas:

1. /profile — página de perfilamiento guiado ("Tell us about your business").
   Card centrada. Tres campos: business size (radio cards: solo / small (2-10) /
   growing (10+)), industry (select: retail, food, services, tech, manufacturing,
   other), operating city (input de texto, ej. "Guatemala City"). CTA "Continue"
   → submitProfile() de lib/actions/funnel.ts → router.push("/analyzing/roadmap").
   Muestra un indicador de paso ("Step 2 of 3") con label-caps.

2. /analyzing/roadmap — reusa <LoadingPass> exactamente como app/analyzing/page.tsx
   pero con action={buildRoadmapStep}, nextHref="/roadmap", fallbackHref="/profile",
   y textos nuevos en i18n (título: construyendo tu roadmap personalizado).

3. /roadmap — Server Component. Lee del Supabase server client la fila de roadmaps
   del usuario actual (o redirect("/") si no hay). Muestra:
   - Eyebrow label-caps "RECOMMENDED STRUCTURE"
   - h1 con recommended_structure (ej. "Sole Proprietor") + rationale
   - Lista ordenada de steps (label, description); los premium con Badge "Premium"
     y candado, visibles pero marcados
   - CTA primario "Save my progress — create account" → /signup
   - Link secundario "Start over" → /
   La página funciona para usuario ANÓNIMO (la sesión anónima ya existe desde
   el landing).

Checkpoint: desde el landing puedo escribir una idea, pasar los 2 loadings,
llenar el perfil y ver mi roadmap, todo sin crear cuenta.
```

---

## PROMPT 2 — Fase 2: Cuenta, login y checklist

```
Ejecuta la Fase 2 del MVP Review + Plan.md.

1. Agrega signInAction a lib/actions/auth.ts (única modificación permitida a lib/):
   signInWithPassword con el server client, retorna {ok, error} con el mismo patrón
   de signUpAction.

2. /signup — card centrada: full name, email, password (mínimo 8 caracteres,
   validado en cliente Y en signUpAction — actualiza el mínimo de 6 a 8).
   Submit → signUpAction → router.push("/checklist"). Debajo: "Already have an
   account? Sign in" → /login. Nota visible bajo el CTA: "Your analysis and
   roadmap will be saved to your account." (i18n).

3. /login — card centrada: email + password → signInAction → /checklist.
   OBLIGATORIO: "Don't have an account? Create your account" → /signup.
   Nunca "contact support".

4. /checklist — Server Component, requiere usuario (redirect a /login si no hay).
   - Llama seedChecklistIfEmpty(supabase, user.id) al cargar.
   - Lee checklist_items (order sort_order) y subscriptions para el tier
     (default "free").
   - Header interno completo (nav Process activo).
   - Progress bar: X of Y steps complete.
   - Lista de items: título, Badge de status (pending/submitted/approved).
     Items premium cuando can(tier,'checklist_full') es false: visibles,
     opacidad reducida, candado, y texto de qué tier los desbloquea
     (requiredTierFor + tierLabel).
   - Si tier es free: card destacada bg-panel "Unlock your full formalization
     checklist" con CTA "Subscribe to Unlock" → /pricing.
   - Botón "Sign out" en el header (signOutAction) → /.

Checkpoint A: tras el Flow B como invitado, crear cuenta en /signup conserva
idea, perfil y roadmap (verifica en Supabase que el uid NO cambió) y el checklist
aparece sembrado desde el roadmap.
Checkpoint B: logout → /login → entrar de nuevo → mismo checklist.
```

---

## PROMPT 3 — Fase 3: Pricing, checkout y confirmación

```
Ejecuta la Fase 3 del MVP Review + Plan.md.

1. /pricing — usa PLANS de lib/billing/plans.ts (nunca hardcodees precios).
   - h1 "Choose your professional tier" + subtítulo.
   - Grid de 3 cards; Professional con badge "Most popular" y borde primario.
   - Cada card: nombre, precio grande ($X /month), tagline, lista de features
     con check icons, CTA "Select {name}" → /checkout?plan={tier}.
     LOS TRES CTAs navegan — cero botones muertos.
   - Debajo del grid, link: "Maybe later — continue on the free plan" → /checklist.

2. /checkout — client page que lee searchParams.plan (default "enterprise";
   si el plan no existe en getPlan(), redirect a /pricing).
   - Layout 2 columnas: form izquierda (cardholder name, email, card number,
     expiry, CVC, country select con Guatemala default), order summary derecha
     en bg-panel (plan, precio, features, "Due today", nota de garantía).
   - Header simple: logo + "Secure checkout" con icono de candado.
   - Validación mínima en cliente (campos no vacíos, card 16 dígitos).
   - Submit "Pay $X and activate" → confirmCheckout(plan) de lib/actions/billing.ts
     → router.push("/checkout/success?plan=" + tier). Estado pending en el botón.
   - Link "← Back to plans" → /pricing.
   - Comentario en el código: // DEMO MODE: confirmCheckout simulates the Stripe
     webhook. Replace with real webhook before production.

3. /checkout/success — card centrada de confirmación: icono check en círculo
   bg-accent, "Subscription active", resumen (plan, precio/mo, next billing =
   current_period_end de la subscription, qué desbloqueó). CTA "Continue to
   Partner Catalog" → /partners; link "Back to my checklist" → /checklist.

Checkpoint (Flow C completo): usuario free → /pricing → "Maybe later" regresa
al checklist SIN comprar; luego → checkout Basic → success → el checklist ya
muestra los items premium desbloqueados.
```

---

## PROMPT 4 — Fase 4: Partners, finalización, complete y dashboard

```
Ejecuta la Fase 4 del MVP Review + Plan.md.

1. /partners — Server Component, requiere usuario.
   - Lee consultation_credits del usuario y el tier.
   - Grid de partners (datos estáticos en lib/data.ts si no existen ya): nombre,
     rol (Lawyer/Accountant), especialidad, ciudad.
   - Si can(tier,'partner_scheduling'): CTA "Schedule Consultation" por card,
     mostrando créditos restantes por tipo ("2 lawyer credits left"). El CTA
     descuenta un crédito vía una server action nueva en lib/actions/
     consultations.ts y muestra confirmación inline.
   - Si no: cards visibles con candado + CTA "Upgrade to Enterprise" → /pricing.
   - CTA de página "Continue to finalization" → /finalize.

2. /finalize — requiere usuario. Dos upload cards: "Notarized deed" y "Tax
   affidavit (RTU/SAT registration)". Usa las actions de lib/actions/documents.ts
   para subir a Storage y listar. Cada card muestra estado (pending/submitted/
   approved) leído de documents. Cuando ambos están subidos, habilita CTA
   "Submit Final Documents" → marca los checklist_items correspondientes como
   submitted → /complete.

3. /complete — celebración sobria: card centrada, "Your business is formalized",
   nombre de la estructura desde roadmaps, resumen de lo logrado, CTA
   "Go to my dashboard" → /dashboard.

4. /dashboard — Server Component, requiere usuario NO anónimo (redirect /login).
   Todo con datos reales, cero placeholders:
   - Saludo con full_name de profiles.
   - Milestones: progreso derivado de checklist_items (approved/total).
   - Document vault: lista de documents con status.
   - Partners: créditos restantes si Enterprise.
   - Subscription card: tier actual + link a /pricing si free.

5. /status, /documents, /support — un solo componente EmptyState reutilizado:
   icono, "This section is on the way", texto breve, CTA "Back to my checklist"
   → /checklist. Nav del header enlaza a estas rutas (nunca href="#").

Checkpoint (Flow A completo e2e): landing → idea → loading → profile → loading
→ roadmap → signup → checklist → pricing → checkout → success → partners →
finalize (sube 2 PDFs de prueba) → complete → dashboard. Sin errores de consola.
```

---

## PROMPT 5 — Fase 5: Endurecer

```
Ejecuta la Fase 5 del MVP Review + Plan.md:

1. middleware/route guards: /checklist, /pricing, /checkout*, /partners,
   /finalize, /complete requieren sesión (anónima o real); /dashboard requiere
   usuario no anónimo. Sin sesión → redirect /login. Hazlo en lib/supabase/proxy.ts
   o con checks server-side por página — elige uno y sé consistente.
2. Comprime public/hero-entrepreneur.png a WebP < 200 KB y actualiza el Image.
3. Rate limiting básico en signUpAction (por ej. verifica que no exista ya el
   email antes de llamar al admin API y devuelve error limpio).
4. Página not-found.tsx con el mismo estilo (logo + "Page not found" + CTA a /).
5. Barre TODO el código: cero href="#", cero console.log, cero strings fuera
   de i18n, cero hex hardcodeados.
6. Script de seed (scripts/seed-demo.ts) que crea:
   - demo-free@albaia.gt / demo1234 — cuenta free con roadmap y checklist
   - demo-pro@albaia.gt / demo1234 — cuenta Enterprise con créditos
   para el demo en vivo del hackathon.
```

---

## PROMPT 6 — Pruebas (al final)

```
Fase de QA. Instala Playwright (pnpm create playwright, config mínima headless)
y escribe e2e tests en tests/ que cubran los criterios de aceptación de
MVP Review + Plan.md §7:

1. flow-b-guest.spec.ts — invitado: idea → profile → roadmap visible. Verifica
   que el h1 del roadmap contiene una estructura recomendada.
2. flow-a-full.spec.ts — el journey completo hasta dashboard, registrándose en
   el camino, comprando Basic en el checkout demo. Verifica que tras success
   los items premium del checklist ya no muestran candado.
3. flow-c-free.spec.ts — cuenta free (usa el seed demo-free@albaia.gt):
   login → checklist → pricing → "Maybe later" vuelve al checklist → los items
   premium siguen bloqueados. Verifica que /login contiene link a /signup.
4. promotion.spec.ts — invitado completa Flow B, se registra, y el roadmap
   sigue presente después del signup (la promoción conservó los datos).
5. gating.spec.ts — unit tests (vitest o node:test) de lib/gating.ts: matriz
   tier × feature completa.
6. a11y.spec.ts — con @axe-core/playwright: landing, checklist y pricing sin
   violaciones serias; verifica hit targets ≥ 44px en los CTAs principales.

Además prueba manualmente (documenta resultados en TESTING.md):
- RLS: con dos usuarios de prueba, intenta leer filas del otro con el anon key
  (debe fallar).
- Responsive: landing, checklist y pricing a 375px.
Corre todo, arregla lo que falle, y deja `pnpm test:e2e` verde.
```

---

## Cómo usarlos

1. Un prompt a la vez, en orden. Espera a que Claude Code termine y **prueba el checkpoint tú mismo**.
2. Si un checkpoint falla: pega el error/screenshot a Claude Code con "arregla esto antes de continuar".
3. Commit al final de cada fase (`git commit -m "fase N: ..."`) — así puedes revertir sin perder todo.
4. No dejes que se adelante: si empieza a construir rutas de fases futuras, dile que se limite a la fase actual.
