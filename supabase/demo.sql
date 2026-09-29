-- Usuario demo: carga (o reinicia) datos inventados para mostrar la app.
-- Antes: crear el usuario demo@finanzas.app en Authentication > Users.
-- Se puede correr cuantas veces se quiera: borra lo del demo y lo vuelve a cargar.
-- Las fechas son relativas a hoy: 3 meses cerrados + el mes actual hasta hoy.
-- Los recurrentes los genera la app al entrar (desde el primer mes de la demo).
-- Sin acentos literales: se usan escapes U&'' para que el pegado no los rompa.

do $$
declare
  uid uuid;
  m0 date := (date_trunc('month', current_date) - interval '3 months')::date; -- primer mes
  mi int;
  mes date;
  parent uuid;
  cat record;
  sub record;
  a_nomina uuid; a_ahorro uuid; a_inversion uuid; a_usd uuid;
  c_super uuid; c_delivery uuid; c_bares uuid; c_renta uuid; c_servicios uuid;
  c_tpublico uuid; c_taxi uuid; c_apps uuid; c_membresias uuid; c_farmacia uuid;
  c_ropa uuid; c_ocio uuid; c_flex uuid; c_salario uuid; c_regalos uuid;
  it record;
  d date;
begin
  select id into uid from auth.users where email = 'demo@finanzas.app';
  if uid is null then
    raise exception 'No existe el usuario demo@finanzas.app: crealo antes en Authentication > Users';
  end if;

  -- 1. Borrar lo que haya del demo (en orden por las referencias).
  delete from public.transactions where user_id = uid;
  delete from public.recurring where user_id = uid;
  delete from public.balance_snapshots where user_id = uid;
  delete from public.categories where user_id = uid and parent_id is not null;
  delete from public.categories where user_id = uid;
  delete from public.accounts where user_id = uid;

  -- 2. Cuentas
  insert into public.accounts (user_id, name, type, currency, is_daily, sort)
    values (uid, U&'Cuenta n\00F3mina', 'corriente', 'EUR', true, 1) returning id into a_nomina;
  insert into public.accounts (user_id, name, type, currency, is_daily, sort)
    values (uid, 'Ahorro', 'ahorro', 'EUR', false, 2) returning id into a_ahorro;
  insert into public.accounts (user_id, name, type, currency, is_daily, sort)
    values (uid, U&'Inversi\00F3n', 'inversion', 'EUR', false, 3) returning id into a_inversion;
  insert into public.accounts (user_id, name, type, currency, is_daily, sort)
    values (uid, U&'Efectivo USD', 'efectivo', 'USD', false, 4) returning id into a_usd;

  -- 3. Categorias (mismas que la app real)
  for cat in
    select * from (values
      (1,  'Comida',                         'gasto',   array[U&'S\00FAper', 'Delivery', 'Bares y restaurantes']),
      (2,  'Vivienda',                       'gasto',   array['Renta', 'Servicios', 'Hogar']),
      (3,  'Transporte',                     'gasto',   array[U&'Transporte p\00FAblico', 'Taxi/VTC', 'Coche']),
      (4,  'Suscripciones',                  'gasto',   array['Apps y servicios digitales', U&'Membres\00EDas']),
      (5,  'Salud y belleza',                'gasto',   array['Tratamiento capilar', 'Farmacia', U&'Peluquer\00EDa', 'Salud']),
      (6,  'Compras',                        'gasto',   array[U&'Tecnolog\00EDa', 'Ropa', 'Varios online']),
      (7,  U&'Retribuci\00F3n flexible',     'gasto',   array['Comida|220', 'Transporte|120']),
      (8,  'Ocio',                           'gasto',   array[]::text[]),
      (9,  'Regalos',                        'gasto',   array[]::text[]),
      (10, 'Vacaciones',                     'gasto',   array[]::text[]),
      (11, 'Otros',                          'gasto',   array[]::text[]),
      (12, 'Ingresos',                       'ingreso', array['Salario', 'Venta', 'Otros ingresos'])
    ) as t(sort, name, kind, subs)
  loop
    insert into public.categories (user_id, name, kind, sort)
    values (uid, cat.name, cat.kind, cat.sort)
    returning id into parent;

    for sub in select s, ord from unnest(cat.subs) with ordinality as u(s, ord) loop
      insert into public.categories (user_id, name, parent_id, kind, cycle_limit, sort)
      values (uid, split_part(sub.s, '|', 1), parent, cat.kind,
              nullif(split_part(sub.s, '|', 2), '')::numeric, sub.ord);
    end loop;
  end loop;

  select c.id into c_super from public.categories c join public.categories p on p.id = c.parent_id
    where c.user_id = uid and p.name = 'Comida' and c.name = U&'S\00FAper';
  select c.id into c_delivery from public.categories c join public.categories p on p.id = c.parent_id
    where c.user_id = uid and p.name = 'Comida' and c.name = 'Delivery';
  select c.id into c_bares from public.categories c join public.categories p on p.id = c.parent_id
    where c.user_id = uid and p.name = 'Comida' and c.name = 'Bares y restaurantes';
  select c.id into c_renta from public.categories c join public.categories p on p.id = c.parent_id
    where c.user_id = uid and p.name = 'Vivienda' and c.name = 'Renta';
  select c.id into c_servicios from public.categories c join public.categories p on p.id = c.parent_id
    where c.user_id = uid and p.name = 'Vivienda' and c.name = 'Servicios';
  select c.id into c_tpublico from public.categories c join public.categories p on p.id = c.parent_id
    where c.user_id = uid and p.name = 'Transporte' and c.name = U&'Transporte p\00FAblico';
  select c.id into c_taxi from public.categories c join public.categories p on p.id = c.parent_id
    where c.user_id = uid and p.name = 'Transporte' and c.name = 'Taxi/VTC';
  select c.id into c_apps from public.categories c join public.categories p on p.id = c.parent_id
    where c.user_id = uid and p.name = 'Suscripciones' and c.name = 'Apps y servicios digitales';
  select c.id into c_membresias from public.categories c join public.categories p on p.id = c.parent_id
    where c.user_id = uid and p.name = 'Suscripciones' and c.name = U&'Membres\00EDas';
  select c.id into c_farmacia from public.categories c join public.categories p on p.id = c.parent_id
    where c.user_id = uid and p.name = 'Salud y belleza' and c.name = 'Farmacia';
  select c.id into c_ropa from public.categories c join public.categories p on p.id = c.parent_id
    where c.user_id = uid and p.name = 'Compras' and c.name = 'Ropa';
  select c.id into c_flex from public.categories c join public.categories p on p.id = c.parent_id
    where c.user_id = uid and p.name = U&'Retribuci\00F3n flexible' and c.name = 'Comida';
  select c.id into c_salario from public.categories c join public.categories p on p.id = c.parent_id
    where c.user_id = uid and p.name = 'Ingresos' and c.name = 'Salario';
  select id into c_ocio from public.categories
    where user_id = uid and parent_id is null and name = 'Ocio';
  select id into c_regalos from public.categories
    where user_id = uid and parent_id is null and name = 'Regalos';

  -- 4. Saldos de partida (el dia antes del primer mes)
  insert into public.transactions (user_id, account_id, date, amount, type, name)
    values (uid, a_nomina, m0 - 1, 1350.00, 'saldo_inicial', 'Saldo inicial');
  insert into public.balance_snapshots (user_id, account_id, date, balance, fx_rate) values
    (uid, a_ahorro,    m0 - 1, 4800.00, null),
    (uid, a_inversion, m0 - 1, 9500.00, null),
    (uid, a_usd,       m0 - 1, 300.00,  0.920000),
    -- La inversion se actualiza a mano cada mes (sube y baja con el mercado)
    (uid, a_inversion, (m0 + interval '1 month' - interval '1 day')::date, 9830.00, null),
    (uid, a_inversion, (m0 + interval '2 months' - interval '1 day')::date, 9790.00, null),
    (uid, a_inversion, (m0 + interval '3 months' - interval '1 day')::date, 10160.00, null);

  -- 5. Recurrentes: la app crea sus movimientos desde el primer mes al entrar.
  insert into public.recurring
    (user_id, name, amount, type, category_id, account_id, to_account_id, day_of_month, frequency, start_date)
  values
    (uid, 'Salario',            2150.00, 'ingreso',       c_salario,     a_nomina, null,        1,  'mensual',   m0),
    (uid, 'Alquiler',            850.00, 'gasto',         c_renta,       a_nomina, null,        5,  'mensual',   m0),
    (uid, 'Luz',                  58.40, 'gasto',         c_servicios,   a_nomina, null,        12, 'bimestral', m0),
    (uid, U&'Internet y m\00F3vil', 35.00, 'gasto',       c_servicios,   a_nomina, null,        15, 'mensual',   m0),
    (uid, 'Gimnasio',             39.90, 'gasto',         c_membresias,  a_nomina, null,        3,  'mensual',   m0),
    (uid, 'Spotify',              11.99, 'gasto',         c_apps,        a_nomina, null,        8,  'mensual',   m0),
    (uid, 'Ahorro del mes',      250.00, 'transferencia', null,          a_nomina, a_ahorro,    25, 'mensual',   m0),
    (uid, U&'Aportaci\00F3n ETF', 150.00, 'transferencia', null,         a_nomina, a_inversion, 26, 'mensual',   m0);

  -- 6. Gastos variables: la misma plantilla cada mes con importes que cambian un poco.
  for mi in 0..3 loop
    mes := (m0 + make_interval(months => mi))::date;
    for it in
      select * from (values
        (2,  62.35, c_super,    'Mercadona'),
        (4,  18.50, c_bares,    U&'Ca\00F1as con amigos'),
        (6,  40.00, c_tpublico, 'Abono transporte'),
        (7,  11.50, c_flex,     U&'Men\00FA del d\00EDa'),
        (9,  48.90, c_super,    'Lidl'),
        (10, 24.80, c_delivery, 'Glovo'),
        (11, 11.50, c_flex,     U&'Men\00FA del d\00EDa'),
        (13, 34.00, c_bares,    'Cena'),
        (14, 12.40, c_farmacia, 'Farmacia'),
        (16, 71.20, c_super,    'Mercadona'),
        (17, 11.50, c_flex,     U&'Men\00FA del d\00EDa'),
        (18, 15.60, c_taxi,     'Cabify'),
        (19, 27.00, c_ocio,     'Cine'),
        (21, 11.50, c_flex,     U&'Men\00FA del d\00EDa'),
        (22, 22.90, c_bares,    'Brunch'),
        (23, 59.95, c_ropa,     'Zara'),
        (24, 11.50, c_flex,     U&'Men\00FA del d\00EDa'),
        (26, 54.10, c_super,    'Mercadona'),
        (27, 19.90, c_delivery, 'Just Eat'),
        (28, 11.50, c_flex,     U&'Men\00FA del d\00EDa'),
        (29, 42.00, c_ocio,     'Concierto')
      ) as t(dia, importe, categoria, nombre)
    loop
      d := mes + least(it.dia, extract(day from (mes + interval '1 month - 1 day'))::int) - 1;
      continue when d > current_date;
      -- Ropa, concierto y cine no todos los meses
      continue when it.nombre in ('Zara', 'Concierto') and mod(mi, 2) = 1;
      continue when it.nombre = 'Cine' and mi = 2;
      insert into public.transactions (user_id, account_id, date, amount, type, category_id, name)
      values (uid, a_nomina, d,
              round((it.importe * (1 + (mod(mi * 7 + it.dia, 5) - 2) * 0.06))::numeric, 2),
              'gasto', it.categoria, it.nombre);
    end loop;
  end loop;

  -- Algun extra suelto
  d := m0 + 17;
  insert into public.transactions (user_id, account_id, date, amount, type, category_id, name)
    values (uid, a_nomina, d, 45.00, 'gasto', c_regalos, U&'Cumplea\00F1os Marta');
  d := (m0 + interval '2 months')::date + 8;
  insert into public.transactions (user_id, account_id, date, amount, type, category_id, name)
    values (uid, a_nomina, d, 120.00, 'ingreso',
            (select c.id from public.categories c join public.categories p on p.id = c.parent_id
             where c.user_id = uid and p.name = 'Ingresos' and c.name = 'Venta'),
            'Venta bici vieja');
end;
$$;
