import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/format";
import type { Account, Category, Transaction } from "@/lib/types";

// CSV con todos los movimientos, para Excel en español: separador ";",
// coma decimal y BOM para que respete los acentos.

const TIPOS: Record<Transaction["type"], string> = {
  gasto: "Gasto",
  ingreso: "Ingreso",
  transferencia: "Transferencia",
  saldo_inicial: "Ajuste de saldo",
  devolucion: "Devolución",
};

const PAGE = 1000; // límite de filas por consulta de la API

function cell(v: string) {
  return /[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function decimal(n: number) {
  return n.toFixed(2).replace(".", ",");
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("accounts").select("id, name").returns<Pick<Account, "id" | "name">[]>(),
    supabase
      .from("categories")
      .select("id, name, parent_id")
      .returns<Pick<Category, "id" | "name" | "parent_id">[]>(),
  ]);

  const txs: (Transaction & { note: string | null })[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, account_id, to_account_id, date, mes_imputacion, amount, type, category_id, name, note")
      .order("date")
      .order("created_at")
      .range(from, from + PAGE - 1)
      .returns<(Transaction & { note: string | null })[]>();
    if (error) return new Response(`No se pudo exportar: ${error.message}`, { status: 500 });
    txs.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }

  const accountName = new Map(accounts?.map((a) => [a.id, a.name]));
  const catById = new Map(categories?.map((c) => [c.id, c]));

  const header = [
    "Fecha",
    "Mes imputación",
    "Cuenta",
    "Hacia cuenta",
    "Tipo",
    "Categoría",
    "Subcategoría",
    "Nombre",
    "Importe",
    "Nota",
  ];
  const lines = txs.map((t) => {
    const cat = t.category_id ? catById.get(t.category_id) : undefined;
    const parent = cat?.parent_id ? catById.get(cat.parent_id) : undefined;
    const amount = Number(t.amount);
    // Con signo desde la cuenta de origen: lo que sale, negativo.
    const signed = t.type === "gasto" || t.type === "transferencia" ? -amount : amount;
    return [
      t.date,
      t.mes_imputacion.slice(0, 7),
      accountName.get(t.account_id) ?? "",
      t.to_account_id ? (accountName.get(t.to_account_id) ?? "") : "",
      TIPOS[t.type],
      parent ? parent.name : (cat?.name ?? ""),
      parent ? (cat?.name ?? "") : "",
      t.name,
      decimal(signed),
      t.note ?? "",
    ]
      .map((v) => cell(String(v)))
      .join(";");
  });

  const csv = "﻿" + [header.join(";"), ...lines].join("\r\n") + "\r\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="finanzas-${todayISO()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
