import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { accountRole } from "@/lib/patrimonio";
import type { Account } from "@/lib/types";
import { Chevron, Group, groupRow, plusIcon, RoundButton, SubPageHeader } from "@/components/ios";

export default async function CuentasPage() {
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, type, currency, is_daily, sort")
    .order("sort")
    .order("id")
    .returns<Account[]>();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-10">
      <SubPageHeader
        back="/cuenta"
        backLabel="Mi cuenta"
        title="Cuentas"
        actions={
          <RoundButton href="/cuenta/cuentas/nueva" label="Nueva cuenta">
            {plusIcon}
          </RoundButton>
        }
      />
      <div className="mt-5">
        <Group>
          {(accounts ?? []).map((a) => (
            <Link key={a.id} href={`/cuenta/cuentas/${a.id}`} className={groupRow}>
              <div className="flex min-w-0 grow flex-col">
                <div className="text-[17px]">{a.name}</div>
                <div className="text-[13px] text-muted">
                  {accountRole(a)} · {a.currency}
                  {a.is_daily && " · día a día"}
                </div>
              </div>
              <Chevron />
            </Link>
          ))}
        </Group>
      </div>
    </main>
  );
}
