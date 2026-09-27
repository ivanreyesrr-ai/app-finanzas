-- Saldo de una cuenta con todo lo imputado ANTES del mes dado (el "saldo del mes anterior").
-- Suma en la base para no depender del limite de 1000 filas de la API.
-- security invoker: respeta RLS, cada usuario solo suma sus movimientos.
create function public.saldo_antes_de_mes(p_account_id uuid, p_mes date)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(
    case
      when t.account_id = p_account_id and t.type in ('ingreso', 'devolucion', 'saldo_inicial') then t.amount
      when t.account_id = p_account_id and t.type in ('gasto', 'transferencia') then -t.amount
      when t.to_account_id = p_account_id and t.type = 'transferencia' then t.amount
      else 0
    end), 0)
  from public.transactions t
  where (t.account_id = p_account_id or t.to_account_id = p_account_id)
    and t.mes_imputacion < p_mes;
$$;

revoke execute on function public.saldo_antes_de_mes(uuid, date) from public, anon;
grant execute on function public.saldo_antes_de_mes(uuid, date) to authenticated;
