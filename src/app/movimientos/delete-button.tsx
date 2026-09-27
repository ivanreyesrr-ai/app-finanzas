"use client";

import { deleteTransaction } from "./actions";

export function DeleteButton({ id, label }: { id: string; label: string }) {
  return (
    <form
      action={deleteTransaction}
      onSubmit={(e) => {
        if (!confirm(label)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="h-12 w-full rounded-[14px] border border-red-200 bg-white text-[15px] text-red-700">
        Borrar
      </button>
    </form>
  );
}
