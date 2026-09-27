-- Recurrentes: cada uno recuerda hasta que mes ya genero su movimiento.
-- Asi, si se borra un movimiento generado (ese mes no se pago), no vuelve a aparecer.
alter table public.recurring add column last_generated_month date;

-- Los que ya existen se crearon desde "Repetir cada mes" junto con su movimiento:
-- se marcan como generados en el mes de inicio.
update public.recurring
set last_generated_month = date_trunc('month', start_date)::date
where last_generated_month is null;

-- Fecha en la que cae un recurrente en el mes dado, o null si ese mes no le toca.
-- Mensual: todos los meses. Bimestral: cada 2 meses desde el mes de inicio.
-- Anual: el mes de inicio. Dia 31 en un mes mas corto: ultimo dia del mes.
create function public.fecha_recurrente(
  p_start date, p_end date, p_day int, p_frequency text, p_mes date
)
returns date
language sql
immutable
set search_path = ''
as $$
  with x as (
    select
      (extract(year from p_mes) * 12 + extract(month from p_mes))
        - (extract(year from p_start) * 12 + extract(month from p_start)) as diff,
      extract(day from (date_trunc('month', p_mes) + interval '1 month - 1 day'))::int as last_day
  ), f as (
    select make_date(
      extract(year from p_mes)::int, extract(month from p_mes)::int, least(p_day, x.last_day)
    ) as d, x.diff
    from x
  )
  select case
    when f.diff < 0 then null
    when p_frequency = 'bimestral' and mod(f.diff::int, 2) <> 0 then null
    when p_frequency = 'anual' and mod(f.diff::int, 12) <> 0 then null
    when f.d < p_start then null
    when p_end is not null and f.d > p_end then null
    else f.d
  end
  from f;
$$;

-- Genera los movimientos de los recurrentes activos que falten hasta el mes de p_hoy.
-- security invoker: respeta RLS. Devuelve cuantos movimientos creo.
create function public.generar_recurrentes(p_hoy date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r record;
  v_mes date;
  v_hasta date := date_trunc('month', p_hoy)::date;
  v_fecha date;
  v_creados integer := 0;
begin
  for r in
    select * from public.recurring
    where active
      and (last_generated_month is null or last_generated_month < v_hasta)
  loop
    v_mes := coalesce(
      (r.last_generated_month + interval '1 month')::date,
      date_trunc('month', r.start_date)::date
    );
    while v_mes <= v_hasta loop
      -- Reclama el mes de forma atomica: si otra llamada ya lo hizo, no hace nada.
      update public.recurring
      set last_generated_month = v_mes
      where id = r.id
        and (last_generated_month is null or last_generated_month < v_mes);

      if found then
        v_fecha := public.fecha_recurrente(r.start_date, r.end_date, r.day_of_month, r.frequency, v_mes);
        if v_fecha is not null then
          insert into public.transactions
            (user_id, account_id, to_account_id, date, amount, type, category_id, name, recurring_id)
          values
            (r.user_id, r.account_id, r.to_account_id, v_fecha, r.amount, r.type, r.category_id, r.name, r.id);
          v_creados := v_creados + 1;
        end if;
      end if;

      v_mes := (v_mes + interval '1 month')::date;
    end loop;
  end loop;

  return v_creados;
end;
$$;

revoke execute on function public.generar_recurrentes(date) from public, anon;
grant execute on function public.generar_recurrentes(date) to authenticated;
grant execute on function public.fecha_recurrente(date, date, int, text, date) to authenticated;
