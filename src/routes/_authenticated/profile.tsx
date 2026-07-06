import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { useWorkspace } from "@/lib/workspace-context";
import {
  COUNTRY_LIST,
  COUNTRIES,
  LANGUAGE_LABELS,
  isCountryCode,
  normalizeLanguageCode,
  resolveLanguageForCountry,
  type CountryCode,
  type LanguageCode,
} from "@/lib/locale/countries";
import { writeLocalePrefs } from "@/lib/locale/locale-store";
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
import { TechlogicaAbout } from "@/components/TechlogicaAbout";
import { ThemeToggle } from "@/components/ThemeToggle";
import { db, supabase } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, patchProfile } = useAuth();
  const { t } = useLocale();
  const { setCountry: setWorkspaceCountry } = useWorkspace();
  const hydratedProfileId = useRef<string | null>(null);
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
    if (!profile) {
      hydratedProfileId.current = null;
      return;
    }
    if (hydratedProfileId.current === profile.id) return;
    hydratedProfileId.current = profile.id;

    const profileCountry =
      profile.country_code && isCountryCode(profile.country_code) ? profile.country_code : "IN";
    const profileLanguage =
      normalizeLanguageCode(profile.preferred_language)
      ?? COUNTRIES[profileCountry].defaultLanguage;
    const parsed = parseStoredPhone(profile.phone || "", profileCountry);

    setForm({
      full_name: profile.full_name || "",
      company_name: profile.company_name || "",
      phone_country: parsed.countryCode,
      phone: parsed.national,
      address: profile.address || "",
      gst_number: profile.gst_number || "",
      country_code: profileCountry,
      preferred_language: profileLanguage,
    });
  }, [profile]);

  const taxIdLabel = COUNTRIES[form.country_code].taxIdLabel;

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
      const { data, error } = await db.from("profiles").update({
        full_name: form.full_name.trim(),
        company_name: form.company_name.trim() || null,
        phone: phoneStored || null,
        address: form.address.trim() || null,
        gst_number: form.gst_number.trim() || null,
        country_code: form.country_code,
        preferred_language: form.preferred_language,
      }).eq("id", profile.id).select().maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error("Profile could not be updated. Please sign in again.");
      }

      writeLocalePrefs({
        country: form.country_code,
        language: form.preferred_language,
        userSet: true,
      });
      patchProfile(data);
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

          <Button type="submit" disabled={savingProfile}>
            {savingProfile ? t.common.saving : t.common.save}
          </Button>
        </form>
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">{t.profile.appearance}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t.profile.appearanceDescription}</p>
            </div>
            <ThemeToggle variant="menu" />
          </div>
          <div className="pt-6 border-t">
            <h2 className="font-semibold">{t.profile.changePassword}</h2>
            <div className="mt-4"><Label>{t.profile.newPassword}</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
            <Button onClick={changePw} variant="outline" className="mt-4">{t.profile.updatePassword}</Button>
          </div>
          <div className="pt-6 border-t">
            <div className="text-xs text-muted-foreground">{t.profile.email}</div>
            <div className="font-medium">{profile?.email}</div>
          </div>
        </div>
      </div>
      <div className="mt-8">
        <TechlogicaAbout variant="page" />
      </div>
    </>
  );
}
