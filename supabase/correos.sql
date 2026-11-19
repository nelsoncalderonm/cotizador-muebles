-- INNER Muebles: correos semanales a suscriptores (se aplica después de esquema.sql).
-- La ruta /api/correos entra solo por estas funciones, con el token guardado en inner_muebles.ajustes ('correos_token').

create table if not exists inner_muebles.correos_enviados (
  correo text not null,
  clave text not null, -- bienvenida | semana-1 … | rescate-<fecha>
  enviado timestamptz not null default now(),
  primary key (correo, clave)
);

create table if not exists inner_muebles.correos_bajas (
  correo text primary key,
  fecha timestamptz not null default now()
);

alter table inner_muebles.correos_enviados enable row level security;
alter table inner_muebles.correos_bajas enable row level security;

create or replace function inner_muebles.correos_token_ok(token text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select a.valor from inner_muebles.ajustes a where a.clave = 'correos_token') = token, false);
$$;

-- Suscriptores con acceso que no se dieron de baja, con su uso y los correos que ya recibieron
create or replace function public.im_correos_pendientes(token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not inner_muebles.correos_token_ok(token) then raise exception 'Token inválido'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'correo', s.correo,
      'nombre', s.nombre,
      'inicio', s.inicio,
      'ultimo_uso', p.ultimo_uso,
      'segundos_uso', coalesce(p.segundos_uso, 0),
      'enviados', coalesce((select jsonb_agg(jsonb_build_object('clave', e.clave, 'enviado', e.enviado) order by e.enviado)
                            from inner_muebles.correos_enviados e where e.correo = s.correo), '[]'::jsonb)
    ))
    from inner_muebles.suscripciones s
    left join inner_muebles.perfiles p on p.correo = s.correo
    where (s.estado = 'activa' or (s.estado in ('atrasada', 'cancelada') and s.proximo_cobro > now()))
      and not exists (select 1 from inner_muebles.correos_bajas b where b.correo = s.correo)
  ), '[]'::jsonb);
end $$;

-- Anota un envío. Devuelve false si ese correo ya se había enviado (así nadie lo recibe dos veces).
create or replace function public.im_correo_registrar(token text, p_correo text, p_clave text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not inner_muebles.correos_token_ok(token) then raise exception 'Token inválido'; end if;
  insert into inner_muebles.correos_enviados (correo, clave) values (lower(trim(p_correo)), p_clave) on conflict do nothing;
  return found;
end $$;

-- Si el envío falla, se borra la anotación para reintentar mañana
create or replace function public.im_correo_desanotar(token text, p_correo text, p_clave text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not inner_muebles.correos_token_ok(token) then raise exception 'Token inválido'; end if;
  delete from inner_muebles.correos_enviados where correo = lower(trim(p_correo)) and clave = p_clave;
end $$;

create or replace function public.im_correo_baja(token text, p_correo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not inner_muebles.correos_token_ok(token) then raise exception 'Token inválido'; end if;
  insert into inner_muebles.correos_bajas (correo) values (lower(trim(p_correo))) on conflict do nothing;
end $$;

revoke all on function inner_muebles.correos_token_ok(text) from public, anon, authenticated;
revoke all on function public.im_correos_pendientes(text), public.im_correo_registrar(text, text, text),
  public.im_correo_desanotar(text, text, text), public.im_correo_baja(text, text) from public, authenticated;
grant execute on function public.im_correos_pendientes(text), public.im_correo_registrar(text, text, text),
  public.im_correo_desanotar(text, text, text), public.im_correo_baja(text, text) to anon;

-- Token (cámbialo por uno largo y aleatorio, y pon el mismo en Vercel como CORREOS_TOKEN):
-- insert into inner_muebles.ajustes (clave, valor) values ('correos_token', '<token>') on conflict (clave) do update set valor = excluded.valor;
