-- INNER Muebles: cuentas, suscripciones (Hotmart o pago manual) y tiempo de uso.
-- Vive en el esquema inner_muebles (no expuesto por la API) dentro de un proyecto compartido.
-- La app solo entra por las funciones public.im_*; nada toca los otros esquemas del proyecto.

create schema if not exists inner_muebles;

create table if not exists inner_muebles.perfiles (
  id uuid primary key references auth.users on delete cascade,
  correo text not null,
  es_dueno boolean not null default false,
  creado timestamptz not null default now(),
  ultimo_uso timestamptz,
  segundos_uso bigint not null default 0
);
create index if not exists perfiles_correo on inner_muebles.perfiles (correo);

create table if not exists inner_muebles.suscripciones (
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

create table if not exists inner_muebles.uso_diario (
  usuario uuid not null references auth.users on delete cascade,
  dia date not null,
  segundos integer not null default 0,
  primary key (usuario, dia)
);

create table if not exists inner_muebles.eventos_hotmart (
  id bigint generated always as identity primary key,
  recibido timestamptz not null default now(),
  evento text,
  correo text,
  datos jsonb
);

create table if not exists inner_muebles.ajustes (clave text primary key, valor text not null);

alter table inner_muebles.perfiles enable row level security;
alter table inner_muebles.suscripciones enable row level security;
alter table inner_muebles.uso_diario enable row level security;
alter table inner_muebles.eventos_hotmart enable row level security;
alter table inner_muebles.ajustes enable row level security;

create or replace function public.im_es_dueno() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.es_dueno from inner_muebles.perfiles p where p.id = (select auth.uid())), false);
$$;

-- Lo que la app necesita saber de quien entró
create or replace function public.im_mi_cuenta() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return null; end if;
  -- el perfil se crea la primera vez que la persona abre INNER Muebles
  insert into inner_muebles.perfiles (id, correo) values (auth.uid(), lower(auth.email())) on conflict (id) do nothing;
  return (select jsonb_build_object(
    'correo', lower(auth.email()),
    'es_dueno', public.im_es_dueno(),
    'estado', s.estado,
    'medio_pago', s.medio_pago,
    'proximo_cobro', s.proximo_cobro,
    'con_acceso', public.im_es_dueno() or coalesce(s.estado = 'activa' or (s.estado in ('atrasada', 'cancelada') and s.proximo_cobro > now()), false)
  )
  from (select 1) uno left join inner_muebles.suscripciones s on s.correo = lower(auth.email()));
end $$;

-- Latido de uso: la app avisa cada minuto mientras la persona la está usando
create or replace function public.im_registrar_uso(segundos integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  yo uuid := auth.uid();
  s integer := least(greatest(coalesce(segundos, 0), 0), 120);
begin
  if yo is null or s = 0 then return; end if;
  insert into inner_muebles.uso_diario (usuario, dia, segundos) values (yo, (now() at time zone 'America/Bogota')::date, s)
    on conflict (usuario, dia) do update set segundos = inner_muebles.uso_diario.segundos + excluded.segundos;
  update inner_muebles.perfiles set segundos_uso = segundos_uso + s, ultimo_uso = now() where id = yo;
end $$;

-- Panel de dueños: clientes con pago, registro y uso
create or replace function public.im_panel_clientes() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.im_es_dueno() then raise exception 'Solo para dueños'; end if;
  return coalesce((
    select jsonb_agg(f order by f.orden desc nulls last)
    from (
      select
        coalesce(s.correo, p.correo) as correo, s.nombre, s.telefono, s.estado, s.plan, s.medio_pago, s.moneda, s.valor, s.origen,
        s.inicio, s.ultimo_pago, s.proximo_cobro, s.notas,
        p.creado as registrado, p.ultimo_uso, coalesce(p.segundos_uso, 0) as segundos_uso,
        coalesce((select sum(u.segundos) from inner_muebles.uso_diario u where u.usuario = p.id and u.dia > current_date - 7), 0) as segundos_7d,
        coalesce((select count(*) from inner_muebles.uso_diario u where u.usuario = p.id and u.dia > current_date - 30), 0) as dias_30d,
        coalesce(p.es_dueno, false) as es_dueno,
        coalesce(s.inicio, p.creado) as orden
      from inner_muebles.suscripciones s full outer join inner_muebles.perfiles p on p.correo = s.correo
    ) f
  ), '[]'::jsonb);
end $$;

-- Activar o renovar a mano (transferencia por Nequi, Bancolombia…)
create or replace function public.im_panel_activar(p_correo text, p_medio text, p_dias integer, p_nombre text default null, p_notas text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare c text := lower(trim(p_correo));
begin
  if not public.im_es_dueno() then raise exception 'Solo para dueños'; end if;
  if c = '' or position('@' in c) = 0 then raise exception 'Correo inválido'; end if;
  insert into inner_muebles.suscripciones (correo, nombre, estado, plan, medio_pago, origen, ultimo_pago, proximo_cobro, notas)
  values (c, p_nombre, 'activa', 'Mensual', p_medio, 'manual', now(), now() + make_interval(days => greatest(p_dias, 1)), p_notas)
  on conflict (correo) do update set
    estado = 'activa', medio_pago = excluded.medio_pago, origen = 'manual', ultimo_pago = now(),
    proximo_cobro = greatest(coalesce(inner_muebles.suscripciones.proximo_cobro, now()), now()) + make_interval(days => greatest(p_dias, 1)),
    nombre = coalesce(excluded.nombre, inner_muebles.suscripciones.nombre), notas = coalesce(excluded.notas, inner_muebles.suscripciones.notas), actualizado = now();
end $$;

create or replace function public.im_panel_cancelar(p_correo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.im_es_dueno() then raise exception 'Solo para dueños'; end if;
  update inner_muebles.suscripciones set estado = 'cancelada', proximo_cobro = now(), actualizado = now() where correo = lower(trim(p_correo));
end $$;

-- Aviso de Hotmart (webhook 2.0). El token debe coincidir con el guardado en inner_muebles.ajustes ('hottok').
create or replace function public.im_hotmart_evento(token text, carga jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare
  esperado text := (select valor from inner_muebles.ajustes where clave = 'hottok');
  evento text := upper(coalesce(carga->>'event', ''));
  d jsonb := coalesce(carga->'data', '{}'::jsonb);
  c text := lower(trim(coalesce(d->'buyer'->>'email', d->'subscriber'->>'email', '')));
  ms text := coalesce(d->'purchase'->>'date_next_charge', d->>'date_next_charge');
  proximo timestamptz := case when ms ~ '^\d+$' then to_timestamp(ms::bigint / 1000.0) end;
  nuevo text;
begin
  if esperado is null or token is null or token <> esperado then raise exception 'Token inválido'; end if;
  insert into inner_muebles.eventos_hotmart (evento, correo, datos) values (evento, c, carga);
  if c = '' then return 'sin correo'; end if;
  nuevo := case
    when evento in ('PURCHASE_APPROVED', 'PURCHASE_COMPLETE') then 'activa'
    when evento in ('PURCHASE_DELAYED') then 'atrasada'
    when evento in ('SUBSCRIPTION_CANCELLATION', 'PURCHASE_CANCELED') then 'cancelada'
    when evento in ('PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_PROTEST') then 'reembolsada'
  end;
  if nuevo is null then return 'ignorado'; end if;
  if nuevo = 'activa' then
    insert into inner_muebles.suscripciones (correo, nombre, telefono, estado, plan, medio_pago, moneda, valor, origen, codigo_suscriptor, transaccion, ultimo_pago, proximo_cobro)
    values (c, d->'buyer'->>'name', d->'buyer'->>'checkout_phone', 'activa', d->'subscription'->'plan'->>'name', d->'purchase'->'payment'->>'type',
      d->'purchase'->'price'->>'currency_value', nullif(d->'purchase'->'price'->>'value', '')::numeric, 'hotmart',
      d->'subscription'->'subscriber'->>'code', d->'purchase'->>'transaction', now(), coalesce(proximo, now() + interval '32 days'))
    on conflict (correo) do update set
      estado = 'activa', origen = 'hotmart', ultimo_pago = now(), proximo_cobro = excluded.proximo_cobro,
      nombre = coalesce(excluded.nombre, inner_muebles.suscripciones.nombre), telefono = coalesce(excluded.telefono, inner_muebles.suscripciones.telefono),
      plan = coalesce(excluded.plan, inner_muebles.suscripciones.plan), medio_pago = coalesce(excluded.medio_pago, inner_muebles.suscripciones.medio_pago),
      moneda = coalesce(excluded.moneda, inner_muebles.suscripciones.moneda), valor = coalesce(excluded.valor, inner_muebles.suscripciones.valor),
      codigo_suscriptor = coalesce(excluded.codigo_suscriptor, inner_muebles.suscripciones.codigo_suscriptor), transaccion = excluded.transaccion, actualizado = now();
  else
    update inner_muebles.suscripciones set estado = nuevo, actualizado = now(),
      proximo_cobro = case when nuevo = 'reembolsada' then now() else coalesce(proximo, proximo_cobro) end
    where correo = c and origen = 'hotmart';
  end if;
  return nuevo;
end $$;

revoke all on function public.im_es_dueno(), public.im_mi_cuenta(), public.im_registrar_uso(integer), public.im_panel_clientes(), public.im_panel_cancelar(text),
  public.im_panel_activar(text, text, integer, text, text) from public, anon;
grant execute on function public.im_es_dueno(), public.im_mi_cuenta(), public.im_registrar_uso(integer), public.im_panel_clientes(), public.im_panel_cancelar(text),
  public.im_panel_activar(text, text, integer, text, text) to authenticated;
revoke all on function public.im_hotmart_evento(text, jsonb) from public, authenticated;
grant execute on function public.im_hotmart_evento(text, jsonb) to anon;
