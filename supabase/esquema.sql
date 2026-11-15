-- INNER Muebles: cuentas, suscripciones (Hotmart o pago manual) y tiempo de uso.
-- Todo el acceso de la app pasa por funciones; las tablas solo dejan leer lo propio.

create table if not exists public.perfiles (
  id uuid primary key references auth.users on delete cascade,
  correo text not null,
  es_dueno boolean not null default false,
  creado timestamptz not null default now(),
  ultimo_uso timestamptz,
  segundos_uso bigint not null default 0
);
create index if not exists perfiles_correo on public.perfiles (correo);

create table if not exists public.suscripciones (
  correo text primary key,
  nombre text,
  telefono text,
  estado text not null default 'activa', -- activa | atrasada | cancelada | reembolsada
  plan text,
  medio_pago text,
  moneda text,
  valor numeric,
  origen text not null default 'hotmart', -- hotmart | manual
  codigo_suscriptor text,
  transaccion text,
  inicio timestamptz not null default now(),
  ultimo_pago timestamptz,
  proximo_cobro timestamptz,
  notas text,
  actualizado timestamptz not null default now()
);

create table if not exists public.uso_diario (
  usuario uuid not null references auth.users on delete cascade,
  dia date not null,
  segundos integer not null default 0,
  primary key (usuario, dia)
);

create table if not exists public.eventos_hotmart (
  id bigint generated always as identity primary key,
  recibido timestamptz not null default now(),
  evento text,
  correo text,
  datos jsonb
);

create schema if not exists privado;
create table if not exists privado.ajustes (clave text primary key, valor text not null);

alter table public.perfiles enable row level security;
alter table public.suscripciones enable row level security;
alter table public.uso_diario enable row level security;
alter table public.eventos_hotmart enable row level security;

drop policy if exists "leer mi perfil" on public.perfiles;
create policy "leer mi perfil" on public.perfiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists "leer mi suscripcion" on public.suscripciones;
create policy "leer mi suscripcion" on public.suscripciones for select to authenticated using (correo = lower((select auth.email())));
drop policy if exists "leer mi uso" on public.uso_diario;
create policy "leer mi uso" on public.uso_diario for select to authenticated using (usuario = (select auth.uid()));

-- Perfil automático al registrarse
create or replace function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, correo) values (new.id, lower(new.email)) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists al_registrarse on auth.users;
create trigger al_registrarse after insert on auth.users for each row execute function public.crear_perfil();

create or replace function public.es_dueno() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.es_dueno from public.perfiles p where p.id = (select auth.uid())), false);
$$;

-- Lo que la app necesita saber de quien entró
create or replace function public.mi_cuenta() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'correo', lower(auth.email()),
    'es_dueno', public.es_dueno(),
    'estado', s.estado,
    'medio_pago', s.medio_pago,
    'proximo_cobro', s.proximo_cobro,
    'con_acceso', public.es_dueno() or coalesce(s.estado = 'activa' or (s.estado in ('atrasada', 'cancelada') and s.proximo_cobro > now()), false)
  )
  from (select 1) uno left join public.suscripciones s on s.correo = lower(auth.email());
$$;

-- Latido de uso: la app avisa cada minuto mientras la persona la está usando
create or replace function public.registrar_uso(segundos integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  yo uuid := auth.uid();
  s integer := least(greatest(coalesce(segundos, 0), 0), 120);
begin
  if yo is null or s = 0 then return; end if;
  insert into public.uso_diario (usuario, dia, segundos) values (yo, (now() at time zone 'America/Bogota')::date, s)
    on conflict (usuario, dia) do update set segundos = public.uso_diario.segundos + excluded.segundos;
  update public.perfiles set segundos_uso = segundos_uso + s, ultimo_uso = now() where id = yo;
end $$;

-- Panel de dueños: clientes con pago, registro y uso
create or replace function public.panel_clientes() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_dueno() then raise exception 'Solo para dueños'; end if;
  return coalesce((
    select jsonb_agg(f order by f.orden desc nulls last)
    from (
      select
        coalesce(s.correo, p.correo) as correo, s.nombre, s.telefono, s.estado, s.plan, s.medio_pago, s.moneda, s.valor, s.origen,
        s.inicio, s.ultimo_pago, s.proximo_cobro, s.notas,
        p.creado as registrado, p.ultimo_uso, coalesce(p.segundos_uso, 0) as segundos_uso,
        coalesce((select sum(u.segundos) from public.uso_diario u where u.usuario = p.id and u.dia > current_date - 7), 0) as segundos_7d,
        coalesce((select count(*) from public.uso_diario u where u.usuario = p.id and u.dia > current_date - 30), 0) as dias_30d,
        coalesce(p.es_dueno, false) as es_dueno,
        coalesce(s.inicio, p.creado) as orden
      from public.suscripciones s full outer join public.perfiles p on p.correo = s.correo
    ) f
  ), '[]'::jsonb);
end $$;

-- Activar o renovar a mano (transferencia por Nequi, Bancolombia…)
create or replace function public.panel_activar(p_correo text, p_medio text, p_dias integer, p_nombre text default null, p_notas text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare c text := lower(trim(p_correo));
begin
  if not public.es_dueno() then raise exception 'Solo para dueños'; end if;
  if c = '' or position('@' in c) = 0 then raise exception 'Correo inválido'; end if;
  insert into public.suscripciones (correo, nombre, estado, plan, medio_pago, origen, ultimo_pago, proximo_cobro, notas)
  values (c, p_nombre, 'activa', 'Mensual', p_medio, 'manual', now(), now() + make_interval(days => greatest(p_dias, 1)), p_notas)
  on conflict (correo) do update set
    estado = 'activa', medio_pago = excluded.medio_pago, origen = 'manual', ultimo_pago = now(),
    proximo_cobro = greatest(coalesce(public.suscripciones.proximo_cobro, now()), now()) + make_interval(days => greatest(p_dias, 1)),
    nombre = coalesce(excluded.nombre, public.suscripciones.nombre), notas = coalesce(excluded.notas, public.suscripciones.notas), actualizado = now();
end $$;

create or replace function public.panel_cancelar(p_correo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_dueno() then raise exception 'Solo para dueños'; end if;
  update public.suscripciones set estado = 'cancelada', proximo_cobro = now(), actualizado = now() where correo = lower(trim(p_correo));
end $$;

-- Aviso de Hotmart (webhook 2.0). El token debe coincidir con el guardado en privado.ajustes ('hottok').
create or replace function public.hotmart_evento(token text, carga jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare
  esperado text := (select valor from privado.ajustes where clave = 'hottok');
  evento text := upper(coalesce(carga->>'event', ''));
  d jsonb := coalesce(carga->'data', '{}'::jsonb);
  c text := lower(trim(coalesce(d->'buyer'->>'email', d->'subscriber'->>'email', '')));
  ms text := coalesce(d->'purchase'->>'date_next_charge', d->>'date_next_charge');
  proximo timestamptz := case when ms ~ '^\d+$' then to_timestamp(ms::bigint / 1000.0) end;
  nuevo text;
begin
  if esperado is null or token is null or token <> esperado then raise exception 'Token inválido'; end if;
  insert into public.eventos_hotmart (evento, correo, datos) values (evento, c, carga);
  if c = '' then return 'sin correo'; end if;
  nuevo := case
    when evento in ('PURCHASE_APPROVED', 'PURCHASE_COMPLETE') then 'activa'
    when evento in ('PURCHASE_DELAYED') then 'atrasada'
    when evento in ('SUBSCRIPTION_CANCELLATION', 'PURCHASE_CANCELED') then 'cancelada'
    when evento in ('PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_PROTEST') then 'reembolsada'
  end;
  if nuevo is null then return 'ignorado'; end if;
  if nuevo = 'activa' then
    insert into public.suscripciones (correo, nombre, telefono, estado, plan, medio_pago, moneda, valor, origen, codigo_suscriptor, transaccion, ultimo_pago, proximo_cobro)
    values (c, d->'buyer'->>'name', d->'buyer'->>'checkout_phone', 'activa', d->'subscription'->'plan'->>'name', d->'purchase'->'payment'->>'type',
      d->'purchase'->'price'->>'currency_value', nullif(d->'purchase'->'price'->>'value', '')::numeric, 'hotmart',
      d->'subscription'->'subscriber'->>'code', d->'purchase'->>'transaction', now(), coalesce(proximo, now() + interval '32 days'))
    on conflict (correo) do update set
      estado = 'activa', origen = 'hotmart', ultimo_pago = now(), proximo_cobro = excluded.proximo_cobro,
      nombre = coalesce(excluded.nombre, public.suscripciones.nombre), telefono = coalesce(excluded.telefono, public.suscripciones.telefono),
      plan = coalesce(excluded.plan, public.suscripciones.plan), medio_pago = coalesce(excluded.medio_pago, public.suscripciones.medio_pago),
      moneda = coalesce(excluded.moneda, public.suscripciones.moneda), valor = coalesce(excluded.valor, public.suscripciones.valor),
      codigo_suscriptor = coalesce(excluded.codigo_suscriptor, public.suscripciones.codigo_suscriptor), transaccion = excluded.transaccion, actualizado = now();
  else
    update public.suscripciones set estado = nuevo, actualizado = now(),
      proximo_cobro = case when nuevo = 'reembolsada' then now() else coalesce(proximo, proximo_cobro) end
    where correo = c and origen = 'hotmart';
  end if;
  return nuevo;
end $$;

revoke all on function public.crear_perfil() from public, anon, authenticated;
revoke all on function public.es_dueno(), public.mi_cuenta(), public.registrar_uso(integer), public.panel_clientes(), public.panel_cancelar(text),
  public.panel_activar(text, text, integer, text, text) from public, anon;
grant execute on function public.es_dueno(), public.mi_cuenta(), public.registrar_uso(integer), public.panel_clientes(), public.panel_cancelar(text),
  public.panel_activar(text, text, integer, text, text) to authenticated;
revoke all on function public.hotmart_evento(text, jsonb) from public, authenticated;
grant execute on function public.hotmart_evento(text, jsonb) to anon;
