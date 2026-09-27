-- Datos iniciales: cuentas y categorías.
-- Se asignan al único usuario del proyecto. Si ya hay cuentas, no hace nada.

do $$
declare
  uid uuid;
  n_users int;
  parent uuid;
  cat record;
  sub record;
begin
  select count(*) into n_users from auth.users;
  if n_users <> 1 then
    raise exception 'Se esperaba 1 usuario en auth.users y hay %', n_users;
  end if;
  select id into uid from auth.users;

  if exists (select 1 from public.accounts where user_id = uid) then
    raise notice 'Ya hay datos iniciales, no se carga nada.';
    return;
  end if;

  -- Cuentas
  insert into public.accounts (user_id, name, type, currency, is_daily, sort) values
    (uid, 'Santander',    'corriente', 'EUR', true,  1),
    (uid, 'Wise',         'ahorro',    'EUR', false, 2),
    (uid, 'MyInvestor',   'inversion', 'EUR', false, 3),
    (uid, 'Efectivo USD', 'efectivo',  'USD', false, 4);

  -- Categorías: (orden, nombre, tipo, subcategorías como "nombre" o "nombre|límite")
  for cat in
    select * from (values
      (1,  'Vivienda',             'gasto',   array['Renta', 'Servicios', 'Hogar']),
      (2,  'Comida',               'gasto',   array['Súper', 'Delivery', 'Bares y restaurantes']),
      (3,  'Transporte',           'gasto',   array['Transporte público', 'Taxi/VTC', 'Coche']),
      (4,  'Suscripciones',        'gasto',   array['Apps y servicios digitales', 'Membresías']),
      (5,  'Salud y belleza',      'gasto',   array['Tratamiento capilar', 'Farmacia', 'Peluquería', 'Salud']),
      (6,  'Compras',              'gasto',   array['Tecnología', 'Ropa', 'Varios online']),
      (7,  'Retribución flexible', 'gasto',   array['Comida|220', 'Transporte|120']),
      (8,  'Ocio',                 'gasto',   array[]::text[]),
      (9,  'Regalos',              'gasto',   array[]::text[]),
      (10, 'Vacaciones',           'gasto',   array[]::text[]),
      (11, 'Otros',                'gasto',   array[]::text[]),
      (12, 'Ingresos',             'ingreso', array['Salario', 'Venta', 'Otros ingresos'])
    ) as t(sort, name, kind, subs)
  loop
    insert into public.categories (user_id, name, kind, sort)
    values (uid, cat.name, cat.kind, cat.sort)
    returning id into parent;

    for sub in select s, ord from unnest(cat.subs) with ordinality as u(s, ord) loop
      insert into public.categories (user_id, name, parent_id, kind, cycle_limit, sort)
      values (
        uid,
        split_part(sub.s, '|', 1),
        parent,
        cat.kind,
        nullif(split_part(sub.s, '|', 2), '')::numeric,
        sub.ord
      );
    end loop;
  end loop;
end;
$$;
