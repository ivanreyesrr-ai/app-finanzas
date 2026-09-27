-- Saldo actual de cada cuenta: ultimo saldo cargado a mano (balance_snapshots)
-- + movimientos posteriores hasta hoy. Sin saldo cargado: solo movimientos.
-- La cuenta diaria (Santander) ignora los saldos cargados: sale de los movimientos,
-- igual que en Inicio. Un movimiento cuenta si su fecha ya paso y su mes de
-- imputacion no es futuro (un gasto Flex sale de la nomina de su mes de imputacion).
create function public.saldos_cuentas(p_hoy date)
returns table (
  account_id uuid,
  snapshot_date date,
  snapshot_balance numeric,
  snapshot_fx_rate numeric,
  movimientos numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with snap as (
    select distinct on (s.account_id) s.account_id, s.date, s.balance, s.fx_rate
    from public.balance_snapshots s
    join public.accounts a on a.id = s.account_id and not a.is_daily
    where s.date <= p_hoy
    order by s.account_id, s.date desc
  )
  select
    a.id,
    snap.date,
    snap.balance,
    snap.fx_rate,
    coalesce((
      select sum(
        case
          when t.account_id = a.id and t.type in ('ingreso', 'devolucion', 'saldo_inicial') then t.amount
          when t.account_id = a.id and t.type in ('gasto', 'transferencia') then -t.amount
          when t.to_account_id = a.id and t.type = 'transferencia' then t.amount
          else 0
        end)
      from public.transactions t
      where (t.account_id = a.id or t.to_account_id = a.id)
        and t.date <= p_hoy
        and t.mes_imputacion <= date_trunc('month', p_hoy)::date
        and (snap.date is null or t.date > snap.date)
    ), 0)
  from public.accounts a
  left join snap on snap.account_id = a.id;
$$;

revoke execute on function public.saldos_cuentas(date) from public, anon;
grant execute on function public.saldos_cuentas(date) to authenticated;
