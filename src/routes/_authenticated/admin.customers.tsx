import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { shortDate } from "@/lib/format";
import { toast } from "sonner";
import type { Profile } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/customers")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { data: customers = [] } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => ((await db.from("profiles").select("*").order("created_at", { ascending: false })).data ?? []) as Profile[],
  });
  const toggle = useMutation({
    mutationFn: async ({ id, blocked }: { id: string; blocked: boolean }) => {
      const { error } = await db.from("profiles").update({ blocked }).eq("id", id); if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-customers"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Customers" description={`${customers.length} registered users`} />
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground"><tr className="text-left">
            <th className="px-5 py-3 font-medium">Name</th>
            <th className="px-5 py-3 font-medium">Company</th>
            <th className="px-5 py-3 font-medium">Email</th>
            <th className="px-5 py-3 font-medium">Phone</th>
            <th className="px-5 py-3 font-medium">Joined</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium text-right">Action</th>
          </tr></thead>
          <tbody>{customers.map(c => (
            <tr key={c.id} className="border-t">
              <td className="px-5 py-3 font-medium">{c.full_name || "—"}</td>
              <td className="px-5 py-3 text-muted-foreground">{c.company_name || "—"}</td>
              <td className="px-5 py-3">{c.email}</td>
              <td className="px-5 py-3 text-muted-foreground">{c.phone || "—"}</td>
              <td className="px-5 py-3 text-muted-foreground">{shortDate(c.created_at)}</td>
              <td className="px-5 py-3">{c.blocked ? <Badge variant="destructive">Blocked</Badge> : <Badge variant="secondary">Active</Badge>}</td>
              <td className="px-5 py-3 text-right">
                <Button size="sm" variant="outline" onClick={() => toggle.mutate({ id: c.id, blocked: !c.blocked })}>
                  {c.blocked ? "Unblock" : "Block"}
                </Button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
