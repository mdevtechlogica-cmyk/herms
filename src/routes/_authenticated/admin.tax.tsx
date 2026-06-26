import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/lib/locale-context";
import { COUNTRY_LIST, type CountryCode } from "@/lib/locale/countries";
import { db } from "@/lib/db";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/tax")({
  component: AdminTaxPage,
});

function AdminTaxPage() {
  const { t, refreshTaxConfigs } = useLocale();
  const [country, setCountry] = useState<CountryCode>("IN");
  const [form, setForm] = useState({
    tax_name: "GST",
    tax_rate: "18",
    tax_id_label: "GST Number",
    currency_code: "INR",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await db.from("country_tax_configs").select("*").eq("country_code", country).maybeSingle();
      if (data) {
        setForm({
          tax_name: data.tax_name,
          tax_rate: String(Number(data.tax_rate) * 100),
          tax_id_label: data.tax_id_label,
          currency_code: data.currency_code,
        });
      }
    })();
  }, [country]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = Number(form.tax_rate);
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Tax rate must be between 0 and 100");
      return;
    }
    setLoading(true);
    const { error } = await db.from("country_tax_configs").upsert({
      country_code: country,
      tax_name: form.tax_name,
      tax_rate: rate / 100,
      tax_id_label: form.tax_id_label,
      currency_code: form.currency_code.toUpperCase(),
      updated_at: new Date().toISOString(),
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success(t.adminTax.saved);
      await refreshTaxConfigs();
    }
  };

  return (
    <>
      <PageHeader title={t.adminTax.title} description={t.adminTax.description} />
      <form onSubmit={save} className="max-w-xl rounded-xl border bg-card p-6 space-y-4">
        <div>
          <Label>{t.adminTax.country}</Label>
          <Select value={country} onValueChange={(v) => setCountry(v as CountryCode)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COUNTRY_LIST.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div><Label>{t.adminTax.taxName}</Label><Input value={form.tax_name} onChange={(e) => setForm({ ...form, tax_name: e.target.value })} required /></div>
        <div><Label>{t.adminTax.taxRate}</Label><Input type="number" min={0} max={100} step={0.01} value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} required /></div>
        <div><Label>{t.adminTax.taxIdLabel}</Label><Input value={form.tax_id_label} onChange={(e) => setForm({ ...form, tax_id_label: e.target.value })} required /></div>
        <div><Label>{t.adminTax.currency}</Label><Input value={form.currency_code} onChange={(e) => setForm({ ...form, currency_code: e.target.value })} required /></div>
        <Button type="submit" disabled={loading}>{loading ? t.common.saving : t.adminTax.save}</Button>
      </form>
    </>
  );
}
