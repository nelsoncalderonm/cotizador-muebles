-- INNER Muebles: datos del taller en la nube y cotizaciones enviadas (historial y aviso de "la abrió").

create table if not exists inner_muebles.datos_usuario (
  usuario uuid primary key references auth.users (id) on delete cascade,
  estado jsonb,
  estado_actualizado timestamptz,
  fotos jsonb,
  fotos_actualizado timestamptz
);
alter table inner_muebles.datos_usuario enable row level security;

create table if not exists inner_muebles.cotizaciones (
  id uuid primary key, -- el mismo id del link /c/<id>
  usuario uuid not null references auth.users (id) on delete cascade,
  numero text,
  cliente text,
  telefono text,
  proyecto text,
  total numeric not null default 0,
  anticipo numeric not null default 0,
  moneda jsonb,
  estado text not null default 'enviada' check (estado in ('enviada', 'aprobada', 'perdida')),
  datos jsonb, -- muebles y condiciones para volver a cargarla en el cotizador
  creada timestamptz not null default now(),
  estado_cambiado timestamptz,
  vistas integer not null default 0,
  vista_primera timestamptz,
  vista_ultima timestamptz
);
create index if not exists cotizaciones_usuario_idx on inner_muebles.cotizaciones (usuario, creada desc);
alter table inner_muebles.cotizaciones enable row level security;

-- Datos del taller: proyecto, precios, configuración, logo y fotos
create or replace function public.im_leer_datos() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('estado', d.estado, 'estado_actualizado', d.estado_actualizado, 'fotos', d.fotos, 'fotos_actualizado', d.fotos_actualizado)
  from inner_muebles.datos_usuario d where d.usuario = auth.uid();
$$;

create or replace function public.im_guardar_datos(p_estado jsonb default null, p_fotos jsonb default null) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  yo uuid := auth.uid();
  ahora timestamptz := now();
begin
  if yo is null then raise exception 'sin sesión'; end if;
  if pg_column_size(p_estado) > 2000000 or pg_column_size(p_fotos) > 6000000 then raise exception 'datos muy grandes'; end if;
  insert into inner_muebles.datos_usuario (usuario) values (yo) on conflict (usuario) do nothing;
  update inner_muebles.datos_usuario set
    estado = coalesce(p_estado, estado),
    estado_actualizado = case when p_estado is null then estado_actualizado else ahora end,
    fotos = coalesce(p_fotos, fotos),
    fotos_actualizado = case when p_fotos is null then fotos_actualizado else ahora end
  where usuario = yo;
  return ahora;
end $$;

-- Cotizaciones enviadas
create or replace function public.im_registrar_cotizacion(p_id uuid, p_numero text, p_cliente text, p_telefono text, p_proyecto text,
  p_total numeric, p_anticipo numeric, p_moneda jsonb, p_datos jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  if pg_column_size(p_datos) > 1000000 then raise exception 'datos muy grandes'; end if;
  insert into inner_muebles.cotizaciones (id, usuario, numero, cliente, telefono, proyecto, total, anticipo, moneda, datos)
  values (p_id, auth.uid(), left(p_numero, 40), left(p_cliente, 200), left(p_telefono, 40), left(p_proyecto, 200),
    coalesce(p_total, 0), coalesce(p_anticipo, 0), p_moneda, p_datos)
  on conflict (id) do nothing;
end $$;

create or replace function public.im_mis_cotizaciones() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'numero', c.numero, 'cliente', c.cliente, 'telefono', c.telefono, 'proyecto', c.proyecto,
    'total', c.total, 'anticipo', c.anticipo, 'moneda', c.moneda, 'estado', c.estado, 'datos', c.datos,
    'creada', c.creada, 'estado_cambiado', c.estado_cambiado,
    'vistas', c.vistas, 'vista_primera', c.vista_primera, 'vista_ultima', c.vista_ultima
  ) order by c.creada desc), '[]'::jsonb)
  from (select * from inner_muebles.cotizaciones where usuario = auth.uid() order by creada desc limit 300) c;
$$;

create or replace function public.im_estado_cotizacion(p_id uuid, p_estado text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_estado not in ('enviada', 'aprobada', 'perdida') then raise exception 'estado no válido'; end if;
  update inner_muebles.cotizaciones set estado = p_estado, estado_cambiado = now() where id = p_id and usuario = auth.uid();
end $$;

create or replace function public.im_borrar_cotizacion(p_id uuid) returns void
language sql security definer set search_path = '' as $$
  delete from inner_muebles.cotizaciones where id = p_id and usuario = auth.uid();
$$;

-- El link público /c/<id> avisa cuando alguien abre la cotización (una vista por cada 10 minutos)
create or replace function public.im_cotizacion_vista(p_id uuid) returns void
language sql security definer set search_path = '' as $$
  update inner_muebles.cotizaciones set
    vistas = vistas + 1,
    vista_primera = coalesce(vista_primera, now()),
    vista_ultima = now()
  where id = p_id and (vista_ultima is null or vista_ultima < now() - interval '10 minutes');
$$;

revoke all on function public.im_leer_datos(), public.im_guardar_datos(jsonb, jsonb),
  public.im_registrar_cotizacion(uuid, text, text, text, text, numeric, numeric, jsonb, jsonb),
  public.im_mis_cotizaciones(), public.im_estado_cotizacion(uuid, text), public.im_borrar_cotizacion(uuid) from public, anon;
grant execute on function public.im_leer_datos(), public.im_guardar_datos(jsonb, jsonb),
  public.im_registrar_cotizacion(uuid, text, text, text, text, numeric, numeric, jsonb, jsonb),
  public.im_mis_cotizaciones(), public.im_estado_cotizacion(uuid, text), public.im_borrar_cotizacion(uuid) to authenticated;
revoke all on function public.im_cotizacion_vista(uuid) from public, authenticated;
grant execute on function public.im_cotizacion_vista(uuid) to anon;

-- Clientes (seguimiento): ver la migración inner_muebles_clientes aplicada el 2026-11-16.
-- Tabla inner_muebles.clientes (usuario, clave = WhatsApp o "n:nombre", nombre, telefono, nota, proximo date, ultimo_contacto),
-- RPCs im_mis_clientes, im_guardar_cliente, im_borrar_cliente; im_registrar_cotizacion crea el cliente con recordatorio a 2 días.
