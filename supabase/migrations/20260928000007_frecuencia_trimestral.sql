-- Recurrentes: suma la frecuencia trimestral (cada 3 meses desde el mes de inicio).
alter table public.recurring drop constraint recurring_frequency_check;
alter table public.recurring add constraint recurring_frequency_check
  check (frequency in ('mensual', 'bimestral', 'trimestral', 'anual'));

create or replace function public.fecha_recurrente(
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
    when p_frequency = 'trimestral' and mod(f.diff::int, 3) <> 0 then null
    when p_frequency = 'anual' and mod(f.diff::int, 12) <> 0 then null
    when f.d < p_start then null
    when p_end is not null and f.d > p_end then null
    else f.d
  end
  from f;
$$;
