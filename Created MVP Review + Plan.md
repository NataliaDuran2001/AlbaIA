# AlbaIA — Revisión del código v0 + plan MVP

Revisión del repo `NataliaDuran2001/AlbaIA@main` contra los flujos validados (Flow Map) y el `V0 Prompt.md`. Fecha: 2026-07-08.

---

## 1. Veredicto general

**La fundación es sólida — pero está incompleta.** v0 construyó una capa `lib/` excelente que cumple casi todo el prompt, y solo **2 de las ~15 rutas** de UI. Es un esqueleto correcto: no reescribas nada, completa las rutas que faltan.

## 2. Lo que está BIEN (validado ✓, no tocar)

- **Design tokens ✓** `globals.css` tiene exactamente nuestra paleta (#0052ff, #0b1c30, #c3c5d9, #f8f9ff…), radios 4/8px, sombra hover, Inter 400–700, label-caps 12px/0.05em. Coincide 1:1 con el Flow Map.
- **G7 resuelto ✓** `funnel.ts → ensureSession()` crea sesión anónima de Supabase en la primera acción, y `auth.ts → signUpAction` **promueve el mismo uid** al crear cuenta (conserva idea + perfil + roadmap). Exactamente lo especificado.
- **Detalle #5 ✓** `LoadingPass` avanza cuando la promesa resuelve, no por timeout ciego; con estado de error + "Start over".
- **Gating ✓** `lib/gating.ts` con `can(tier, feature)` y ranking de tiers — gate por feature, no por ruta.
- **Tipos ✓** `lib/types.ts` refleja el modelo de datos del prompt; sin `any`.
- **Planes ✓** Basic $15 / Professional $25 / Enterprise $100 con features correctas.
- **i18n ✓** diccionario `lib/i18n/en.ts` desde el día uno.
- **Billing abstraído ✓** `getBillingProvider()` permite cambiar Stripe → Recurrente.
- **Checklist seed ✓** idempotente, deriva items del roadmap.

## 3. Lo que FALTA (bloqueante para MVP)

El árbol de rutas del prompt tiene 15 rutas; el repo tiene **2** (`/` y `/analyzing`). Faltan, en orden del flujo:

| Ruta | Referencia de diseño |
|---|---|
| `/profile` | `guided_business_analysis/code.html` |
| `/analyzing/roadmap` | reusar `LoadingPass` (pass 2, llama `buildRoadmapStep`) |
| `/roadmap` | `recommended_roadmap/code.html` |
| `/signup` | `account_creation_fixed/code.html` |
| `/login` | `returning_user_login/code.html` (link "Create your account" → /signup) |
| `/checklist` | `progress_subscription_wall/code.html` |
| `/pricing` | `pricing_subscription_tiers/code.html` (+ "Maybe later") |
| `/checkout?plan=` | `Checkout Payment.dc.html` |
| `/checkout/success` | `Payment Confirmation.dc.html` |
| `/partners` | `associate_partner_catalog/code.html` |
| `/finalize` | `legal_accounting_finalization/code.html` |
| `/complete` | `formalization_complete/code.html` |
| `/dashboard` | `user_dashboard_milestones/code.html` |
| `/status`, `/documents`, `/support` | `coming_soon/code.html` (empty states) |

Las server actions que estas pantallas necesitan **ya existen** (`submitProfile`, `buildRoadmapStep`, `signUpAction`, `confirmCheckout`, checklist/documents actions) — solo falta la UI que las llame.

**También falta en el repo:**
- **SQL de Supabase**: no hay migraciones. Sin las tablas + RLS + trigger de `profiles`, nada funciona (ver §5).
- **Login action**: existe `signUpAction` y `signOutAction`, pero no vi `signInAction`.
- **Falta el flujo B/C completo**: sin `/roadmap` ni `/checklist` no se puede demostrar ninguno de los 3 flujos.

## 4. Riesgos a corregir (no bloqueantes, pero antes del pitch)

1. **`confirmCheckout` es un server action llamado desde el navegador** que escribe `subscriptions` con service-role. Para demo/hackathon está bien (está bien aislado y comentado), pero cualquier usuario autenticado puede llamarlo y auto-otorgarse Enterprise sin pagar. MVP real: mover esa escritura a un webhook de Stripe (`/api/webhooks/stripe`) verificando la firma.
2. **`signUpAction` usa el admin API con `email_confirm: true`** — sin verificación de email ni rate limiting. OK para demo; añade captcha/rate-limit de Supabase antes de exponerlo público.
3. **Password mínimo 6** — sube a 8 y valida en el cliente también.
4. **`hero-entrepreneur.png` pesa 2.1 MB** — comprímelo (WebP ~150 KB) o el LCP del landing sufrirá.
5. **`middleware.ts` no protege rutas** — solo refresca la sesión. Decide: `/checklist`+ requieren usuario (anónimo o real); `/dashboard` requiere usuario real. Redirige en el middleware.

## 5. SQL que falta (pégalo en el SQL Editor de Supabase)

```sql
-- Tablas
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text, full_name text, created_at timestamptz default now()
);
create table public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  idea_text text, size text, industry text, city text,
  created_at timestamptz default now()
);
create table public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  recommended_structure text, steps jsonb, created_at timestamptz default now()
);
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  key text, title text, status text default 'pending',
  premium boolean default false, sort_order int default 0
);
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  checklist_item_id uuid references checklist_items,
  storage_path text, status text default 'pending', uploaded_at timestamptz default now()
);
create table public.subscriptions (
  user_id uuid primary key references auth.users on delete cascade,
  tier text default 'free', stripe_customer_id text,
  status text, current_period_end timestamptz, updated_at timestamptz default now()
);
create table public.consultation_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text, remaining int default 0
);

-- Trigger: fila en profiles al crear usuario (incluye anónimos)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS: cada usuario solo ve lo suyo
alter table public.profiles enable row level security;
alter table public.business_profiles enable row level security;
alter table public.roadmaps enable row level security;
alter table public.checklist_items enable row level security;
alter table public.documents enable row level security;
alter table public.subscriptions enable row level security;
alter table public.consultation_credits enable row level security;

create policy "own profile" on public.profiles for all using (id = auth.uid());
create policy "own bp" on public.business_profiles for all using (user_id = auth.uid());
create policy "own roadmap" on public.roadmaps for all using (user_id = auth.uid());
create policy "own checklist" on public.checklist_items for all using (user_id = auth.uid());
create policy "own docs" on public.documents for all using (user_id = auth.uid());
create policy "read own sub" on public.subscriptions for select using (user_id = auth.uid());
create policy "read own credits" on public.consultation_credits for select using (user_id = auth.uid());

-- Storage: bucket privado de documentos
insert into storage.buckets (id, name, public) values ('documents', 'documents', false);
create policy "own storage" on storage.objects for all
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
```

Además: en Supabase → Authentication → Providers, **activa "Anonymous sign-ins"** (sin esto `ensureSession()` falla).

## 6. Paso a paso para llegar al MVP

**Fase 0 — Infraestructura (30 min)**
1. Crea el proyecto Supabase, corre el SQL de §5, activa anonymous sign-ins.
2. `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. `pnpm install && pnpm dev` — verifica que landing → analyzing funciona y crea el usuario anónimo (míralo en Auth → Users).

**Fase 1 — Completar Flow B (guest hasta roadmap)**
4. `/profile`: formulario size/industry/city → `submitProfile` → `/analyzing/roadmap`. Copia el layout de `guided_business_analysis/code.html`.
5. `/analyzing/roadmap`: reusa `<LoadingPass action={buildRoadmapStep} nextHref="/roadmap">`.
6. `/roadmap`: lee `roadmaps` del usuario, muestra estructura recomendada + pasos; CTA "Save my progress" → `/signup`.
   ✅ Checkpoint: Flow B completo como invitado.

**Fase 2 — Cuenta (Flow A hasta checklist)**
7. `/signup`: formulario → `signUpAction` → `/checklist`. Copia `account_creation_fixed/code.html`.
8. Agrega `signInAction` (supabase.auth.signInWithPassword) y `/login` con link a `/signup` (detalle #1 del prompt).
9. `/checklist`: llama `seedChecklistIfEmpty`, lista items, los premium visible-but-locked con `can()`; CTA "Subscribe to Unlock" → `/pricing`.
   ✅ Checkpoint: registrarse tras Flow B conserva idea/perfil/roadmap (verifica el uid en Supabase — debe ser el mismo).

**Fase 3 — Monetización**
10. `/pricing`: 3 planes desde `PLANS`, cada CTA → `/checkout?plan=<tier>`, + "Maybe later" → `/checklist` (detalles #2 y #3).
11. `/checkout`: usa `Checkout Payment.dc.html` como referencia; "Pay" → `confirmCheckout(plan)` → `/checkout/success`.
12. `/checkout/success`: usa `Payment Confirmation.dc.html`; CTA → `/partners`.
    ✅ Checkpoint: Flow C — usuario free entra a pricing, puede salir con "Maybe later", y al comprar se desbloquean features sin cambiar la navegación.

**Fase 4 — Post-pago**
13. `/partners`: catálogo con créditos desde `consultation_credits`; gate con `can(tier,'partner_scheduling')`.
14. `/finalize`: uploads a Storage vía `documents.ts` actions; al aprobar → `/complete`.
15. `/complete` y `/dashboard`: certificado + milestones leyendo checklist/documents reales (detalle #7: nada de placeholders).
16. `/status`, `/documents`, `/support`: empty state tipo `coming_soon/code.html` (detalle #6).

**Fase 5 — Endurecer antes del pitch**
17. Middleware: proteger rutas (§4.5). 18. Comprimir hero. 19. Webhook Stripe real o dejar `confirmCheckout` claramente marcado "demo mode". 20. Seed de cuenta demo (free) + cuenta Enterprise test para el demo en vivo.

## 7. Criterios de aceptación (del prompt — verificar al final)

- [ ] Flujos A, B y C completables clickeando la UI
- [ ] Promoción guest→cuenta conserva datos (mismo uid)
- [ ] RLS: usuario A no lee filas/archivos de usuario B
- [ ] Login enlaza a /signup; pricing sin botones muertos y con salida "Maybe later"
- [ ] Confirmación de pago antes de continuar
- [ ] Sin placeholders en dashboard; empty states intencionales en Status/Documents/Support
- [ ] Hit targets ≥44px, formularios navegables por teclado
