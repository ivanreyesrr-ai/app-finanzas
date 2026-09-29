"use client";

import { groupRow } from "@/components/ios";
import { deleteTransaction } from "./actions";

// Fila roja "Borrar" para usar dentro de un Group.
export function DeleteButton({ id, label }: { id: string; label: string }) {
  return (
    <form
      action={deleteTransaction}
      onSubmit={(e) => {
        if (!confirm(label)) e.preventDefault();
      }}
      className={groupRow}
    >
      <input type="hidden" name="id" value={id} />
      <button className="w-full text-left text-[17px] text-negative">Borrar</button>
    </form>
  );
}
