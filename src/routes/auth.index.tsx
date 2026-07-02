import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  AUTH_ACCESS_DENIED_MESSAGE,
  getPostLoginPath,
  isAllowedAppUser,
  signInSchema,
  signUpSchema,
} from "@/lib/auth-access";
import { finishAppAuth } from "@/lib/finish-app-auth";
import { isNativeApp } from "@/lib/native";
import { supabase } from "@/lib/db";
import {
  signInWithGoogle,
  readOAuthErrorFromUrl,
  clearOAuthParamsFromUrl,
  getWebOAuthRedirectUrl,
} from "@/lib/google-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Construction, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/lib/locale-context";
import { buildPageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

const AUTH_IMAGES = [
  {
    src: "/images/hero-equipment.jpg",
    alt: "Excavators silhouetted against a sunset at a construction site",
    label: "Fleet dispatch",
  },
  {
    src: "/images/fleet-night.jpg",
    alt: "Komatsu excavator with work lights on at night",
    label: "Night operations",
  },
  {
    src: "/images/fleet-yard.jpg",
    alt: "Yellow excavator on a gravel rental yard",
    label: "Yard management",
  },
] as const;

type AuthMode = "signin" | "signup";
type AuthSearch = { mode?: AuthMode };

export const Route = createFileRoute("/auth/")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    mode: search.mode === "signup" ? "signup" : undefined,
  }),
  head: () =>
    buildPageHead({
      title: "Sign in — HERMS",
      description: "Sign in or create a HERMS account to manage your heavy equipment rental fleet.",
      path: "/auth",
      noindex: true,
    }),
  component: AuthPage,
});

function AuthPage() {
  const { user, role, loading } = useAuth();
  const { t } = useLocale();
  const nav = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<AuthMode>(search.mode ?? "signin");
  const [completingAuth, setCompletingAuth] = useState(false);

  useEffect(() => {
    const oauthError = readOAuthErrorFromUrl();
    if (oauthError) {
      toast.error(oauthError);
      clearOAuthParamsFromUrl();
    }
  }, []);

  useEffect(() => {
    if (completingAuth || loading || !user || role === null) return;
    if (isAllowedAppUser(role)) {
      nav({ to: getPostLoginPath(), replace: true });
    }
  }, [user, role, loading, completingAuth, nav]);

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="min-h-screen grid lg:grid-cols-2">
        {!isNativeApp && (
          <div className="hidden lg:flex relative overflow-hidden min-h-screen">
            <img
              src="/images/hero-equipment.jpg"
              alt="Excavator silhouetted at a construction site during sunset"
              className="absolute inset-0 h-full w-full object-cover object-[68%_40%]"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[oklch(0.16_0.015_265/0.95)] via-[oklch(0.18_0.015_265/0.82)] to-[oklch(0.18_0.015_265/0.45)]" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[oklch(0.13_0.01_265/0.55)] to-transparent" />

            <div className="relative z-10 flex flex-col justify-between p-10 xl:p-12 w-full min-h-screen">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-sidebar text-accent">
                  <Construction className="h-5 w-5" />
                </div>
                <span className="font-bold font-heading text-lg text-foreground">HERMS</span>
              </div>

              <div className="space-y-5 max-w-lg">
                <p className="text-xs font-bold text-accent uppercase tracking-widest">Heavy equipment rental OS</p>
                <h1 className="text-4xl xl:text-5xl font-bold font-heading leading-tight text-foreground">
                  Enterprise rental management for{" "}
                  <span className="bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">
                    heavy equipment.
                  </span>
                </h1>
                <p className="text-foreground/80 text-lg leading-relaxed">
                  Manage fleet, bookings, maintenance, and invoices — all in one place.
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  {AUTH_IMAGES.map((photo) => (
                    <div
                      key={photo.src}
                      className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/15 shadow-lg"
                    >
                      <img
                        src={photo.src}
                        alt={photo.alt}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.13_0.01_265/0.85)] to-transparent" />
                      <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[9px] font-semibold text-foreground leading-tight">
                        {photo.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-foreground/50">© {new Date().getFullYear()} HERMS</p>
            </div>
          </div>
        )}

        <div className="relative flex items-center justify-center min-h-screen p-4 sm:p-8 lg:p-12">
          <img
            src="/images/fleet-night.jpg"
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover object-center opacity-25 lg:opacity-35"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-background via-background/96 to-background/88" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-background/40" />

          {!isNativeApp && (
            <div className="absolute top-2 left-4 sm:top-3 sm:left-6 lg:top-4 lg:left-8 z-20">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-foreground/75 hover:text-accent hover:bg-white/5 gap-1"
              >
                <Link to="/">
                  <ArrowLeft className="h-4 w-4" /> Back to Home
                </Link>
              </Button>
            </div>
          )}

          <div className="relative z-10 w-full max-w-md mt-14 sm:mt-0">
            {!isNativeApp && (
              <div className="lg:hidden mb-5 overflow-hidden rounded-xl border border-white/10 relative aspect-[21/9]">
                <img
                  src="/images/fleet-yard.jpg"
                  alt="Heavy equipment on a rental yard"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.16_0.015_265/0.9)] to-[oklch(0.18_0.015_265/0.5)]" />
                <div className="relative z-10 flex items-center gap-2 p-4 h-full">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sidebar text-accent">
                    <Construction className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold font-heading text-sm text-foreground">HERMS</p>
                    <p className="text-[11px] text-foreground/75">Heavy equipment rental management</p>
                  </div>
                </div>
              </div>
            )}

            {isNativeApp && (
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-sidebar text-accent">
                  <Construction className="h-6 w-6" />
                </div>
                <h1 className="text-xl font-bold font-heading text-foreground">{t.auth.appTitle}</h1>
                <p className="text-sm text-foreground/75 mt-1">{t.auth.appSubtitle}</p>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-card/90 backdrop-blur-md p-6 sm:p-8 shadow-2xl shadow-black/20">
              <AuthForm mode={mode} onModeChange={setMode} onCompletingAuthChange={setCompletingAuth} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleButton() {
  const [loading, setLoading] = useState(false);
  const onClick = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error.message || "Google sign-in failed");
      setLoading(false);
    }
  };
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={loading}
      className="w-full border-white/15 bg-transparent text-foreground hover:bg-white/5 hover:text-foreground"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 mr-2" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
      </svg>
      Continue with Google
    </Button>
  );
}

function AuthForm({
  mode,
  onModeChange,
  onCompletingAuthChange,
}: {
  mode: AuthMode;
  onModeChange: (m: AuthMode) => void;
  onCompletingAuthChange: (v: boolean) => void;
}) {
  const { t } = useLocale();
  const { refresh } = useAuth();
  const nav = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isSignUp = mode === "signup";

  const afterAuth = async (userId: string, welcome: string) => {
    onCompletingAuthChange(true);
    try {
      const result = await finishAppAuth(userId);
      if (!result.ok) {
        toast.error(result.message);
        return false;
      }
      await refresh();
      toast.success(welcome);
      nav({ to: getPostLoginPath(), replace: true });
      return true;
    } finally {
      onCompletingAuthChange(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (isSignUp) {
      const parsed = signUpSchema.safeParse({ email, password, full_name: fullName });
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") fieldErrors[key] = issue.message;
        }
        setErrors(fieldErrors);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: { full_name: parsed.data.full_name },
          emailRedirectTo: getWebOAuthRedirectUrl(),
        },
      });

      if (error) {
        setLoading(false);
        toast.error(error.message);
        return;
      }

      if (!data.user) {
        setLoading(false);
        toast.error("Sign-up failed. Please try again.");
        return;
      }

      if (!data.session) {
        setLoading(false);
        toast.success(t.auth.checkEmail);
        onModeChange("signin");
        return;
      }

      try {
        await afterAuth(data.user.id, t.auth.accountCreated);
      } catch (err) {
        const msg = err instanceof Error ? err.message : AUTH_ACCESS_DENIED_MESSAGE;
        toast.error(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    if (!data.user) {
      setLoading(false);
      toast.error("Sign-in failed");
      return;
    }

    try {
      await afterAuth(data.user.id, "Welcome back");
    } catch (err) {
      const msg = err instanceof Error ? err.message : AUTH_ACCESS_DENIED_MESSAGE;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold font-heading text-foreground">
          {isSignUp ? t.auth.createAccount : t.auth.welcomeBack}
        </h2>
        <p className="text-sm text-foreground/75 mt-1">
          {isSignUp ? t.auth.signUpDescription : t.auth.signInDescription}
        </p>
      </div>

      <GoogleButton />

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-foreground/55">or</span>
        </div>
      </div>

      {isSignUp && (
        <div className="space-y-2">
          <Label htmlFor="su-name" className="text-foreground/90">{t.auth.fullName}</Label>
          <Input
            id="su-name"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="border-white/15 bg-background/50"
          />
          {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="auth-email" className="text-foreground/90">{t.auth.email}</Label>
        <Input
          id="auth-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-white/15 bg-background/50"
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="auth-pw" className="text-foreground/90">Password</Label>
        <PasswordInput
          id="auth-pw"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border-white/15 bg-background/50"
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className={cn(
          "w-full bg-accent hover:bg-accent/95 text-accent-foreground font-semibold shadow-lg shadow-accent/15",
        )}
      >
        {loading ? (isSignUp ? "Creating account…" : "Signing in…") : isSignUp ? t.auth.signUp : t.auth.signIn}
      </Button>

      <p className="text-center text-sm text-foreground/70">
        {isSignUp ? t.auth.hasAccount : t.auth.noAccount}{" "}
        <button
          type="button"
          className="text-accent font-medium hover:underline"
          onClick={() => {
            setErrors({});
            onModeChange(isSignUp ? "signin" : "signup");
          }}
        >
          {isSignUp ? t.auth.signIn : t.auth.signUp}
        </button>
      </p>
    </form>
  );
}
