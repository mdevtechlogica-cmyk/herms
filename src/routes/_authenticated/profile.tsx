import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { useWorkspace } from "@/lib/workspace-context";
import {
  COUNTRY_LIST,
  COUNTRIES,
  resolveLanguageForCountry,
  type CountryCode,
  type LanguageCode,
} from "@/lib/locale/countries";
import { db, supabase } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toErrorMessage } from "@/lib/errors";
import { toast } from "sonner";
import {
  formatPhoneE164,
  parseStoredPhone,
  validateNationalPhone,
} from "@/lib/contact-validators";
import { PhoneInput } from "@/components/PhoneInput";

const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: "English",
  hi: "हिन्दी",
  ar: "العربية",
};

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { profile } = useAuth();
  const { country, language, t, taxIdLabel, saving, savePreferences, setLanguage, setCountry } = useLocale();
  const { setCountry: setWorkspaceCountry } = useWorkspace();
  const [form, setForm] = useState({
    full_name: "",
    company_name: "",
    phone_country: "IN" as CountryCode,
    phone: "",
    address: "",
    gst_number: "",
    country_code: "IN" as CountryCode,
    preferred_language: "en" as LanguageCode,
  });
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const parsed = parseStoredPhone(profile.phone || "", country);
    setForm((prev) => ({
      ...prev,
      full_name: profile.full_name || "",
      company_name: profile.company_name || "",
      phone_country: parsed.countryCode,
      phone: parsed.national,
      address: profile.address || "",
      gst_number: profile.gst_number || "",
    }));
  }, [
    profile?.id,
    profile?.full_name,
    profile?.company_name,
    profile?.phone,
    profile?.address,
    profile?.gst_number,
    country,
  ]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      country_code: country,
      preferred_language: language,
    }));
  }, [country, language]);

  const availableLanguages = COUNTRIES[form.country_code].languages.includes(form.preferred_language)
    ? COUNTRIES[form.country_code].languages
    : [form.preferred_language, ...COUNTRIES[form.country_code].languages];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const phoneValidation = form.phone.trim()
      ? validateNationalPhone(form.phone_country, form.phone)
      : null;
    if (phoneValidation) {
      setPhoneError(phoneValidation);
      return;
    }
    setPhoneError(null);

    const phoneStored = form.phone.trim()
      ? formatPhoneE164(form.phone_country, form.phone)
      : "";

    setSavingProfile(true);
    try {
      const { error } = await db.from("profiles").update({
        full_name: form.full_name,
        company_name: form.company_name,
        phone: phoneStored || null,
        address: form.address,
        gst_number: form.gst_number,
      }).eq("id", profile.id);
      if (error) throw error;

      await savePreferences(form.country_code, form.preferred_language);
      setWorkspaceCountry(form.country_code);
      toast.success(t.profile.updated);
    } catch (err) {
      toast.error(toErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const changePw = async () => {
    if (pw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast.error(error.message); else { toast.success("Password updated"); setPw(""); }
  };

  return (
    <>
      <PageHeader title={t.profile.title} description={t.profile.description} />
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={save} className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">{t.profile.personalInfo}</h2>
          <div><Label>{t.profile.fullName}</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>{t.profile.companyName}</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
          <div>
            <Label>{t.profile.phone}</Label>
            <PhoneInput
              countryCode={form.phone_country}
              value={form.phone}
              onCountryChange={(code) => setForm({ ...form, phone_country: code })}
              onValueChange={(phone) => {
                setForm({ ...form, phone });
                if (phoneError) setPhoneError(null);
              }}
              error={phoneError}
            />
          </div>
          <div><Label>{t.profile.address}</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><Label>{taxIdLabel}</Label><Input value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} /></div>

          <h2 className="font-semibold pt-2">{t.profile.regionalSettings}</h2>
          <div>
            <Label>{t.profile.country}</Label>
            <Select
              value={form.country_code}
              onValueChange={(v) => {
                const code = v as CountryCode;
                const nextLang = resolveLanguageForCountry(
                  code,
                  form.preferred_language,
                  form.preferred_language,
                );
                setForm((prev) => ({
                  ...prev,
                  country_code: code,
                  preferred_language: nextLang,
                }));
                setCountry(code);
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRY_LIST.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.name} ({c.currency})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t.profile.language}</Label>
            <Select
              value={form.preferred_language}
              onValueChange={(v) => {
                const lang = v as LanguageCode;
                setForm((prev) => ({ ...prev, preferred_language: lang }));
                setLanguage(lang);
              }}
            >
              <SelectTrigger><SelectValue placeholder={t.profile.language} /></SelectTrigger>
              <SelectContent>
                {availableLanguages.map((lang) => (
                  <SelectItem key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={savingProfile || saving}>
            {savingProfile || saving ? t.common.saving : t.common.save}
          </Button>
        </form>
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">{t.profile.changePassword}</h2>
          <div><Label>{t.profile.newPassword}</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          <Button onClick={changePw} variant="outline">{t.profile.updatePassword}</Button>
          <div className="pt-6 border-t mt-6">
            <div className="text-xs text-muted-foreground">{t.profile.email}</div>
            <div className="font-medium">{profile?.email}</div>
          </div>
        </div>
      </div>
    </>
  );
}
