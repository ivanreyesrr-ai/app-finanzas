// Tipos de las tablas de Supabase (ver supabase/migrations).

export type AccountType = "corriente" | "ahorro" | "inversion" | "efectivo";
export type TransactionType =
  | "gasto"
  | "ingreso"
  | "transferencia"
  | "saldo_inicial"
  | "devolucion";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: "EUR" | "USD";
  is_daily: boolean;
  sort: number;
};

export type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  kind: "gasto" | "ingreso";
  cycle_limit: number | null;
  sort: number;
};

export type Transaction = {
  id: string;
  account_id: string;
  to_account_id: string | null;
  date: string;
  mes_imputacion: string;
  amount: number;
  type: TransactionType;
  category_id: string | null;
  name: string;
};
