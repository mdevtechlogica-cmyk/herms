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

export const Route = createFileRoute("/auth/")({
  head: () => ({
    meta: [
      { title: "Sign in — HERMS" },
      { name: "description", content: "Sign in or create a HERMS account." },
    ],
  }),
  component: AuthPage,
});

type AuthMode = "signin" | "signup";

function AuthPage() {
  const { user, role, loading } = useAuth();
  const { t } = useLocale();
  const nav = useNavigate();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [completingAuth, setCompletingAuth] = useState(false);

  useEffect(() => {
    const oauthError = readOAuthErrorFromUrl();
    if (oauthError) {
      toast.error(oauthError);
      clearOAuthParamsFromUrl();
    }
  }, []);

  // Only redirect when already signed in with a valid role — never sign out here
  // (sign-out during submit raced with bootstrap and caused false "could not sign in")
  useEffect(() => {
    if (completingAuth || loading || !user || role === null) return;
    if (isAllowedAppUser(role)) {
      nav({ to: getPostLoginPath(), replace: true });
    }
  }, [user, role, loading, completingAuth, nav]);

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {!isNativeApp && (
        <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Construction className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg">HERMS</span>
          </div>
          <div className="relative z-10 space-y-4">
            <h1 className="text-4xl font-bold leading-tight">
              Enterprise rental management for heavy equipment.
            </h1>
            <p className="text-sidebar-foreground/70 text-lg">
              Manage fleet, bookings, maintenance, and invoices — all in one place.
            </p>
          </div>
          <div className="text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} HERMS</div>
          <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-sidebar-primary/20 blur-3xl" />
        </div>
      )}
      <div className="flex items-center justify-center p-6 sm:p-12 relative">
        {!isNativeApp && (
          <div className="absolute top-6 left-6 sm:left-12">
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-primary gap-1">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" /> Back to Home
              </Link>
            </Button>
          </div>
        )}
        <div className="w-full max-w-md mt-8 sm:mt-0">
          {isNativeApp && (
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Construction className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold">{t.auth.appTitle}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t.auth.appSubtitle}</p>
            </div>
          )}
          <AuthForm mode={mode} onModeChange={setMode} onCompletingAuthChange={setCompletingAuth} />
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
    <Button type="button" variant="outline" onClick={onClick} disabled={loading} className="w-full">
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
      <h2 className="text-2xl font-bold">{isSignUp ? t.auth.createAccount : t.auth.welcomeBack}</h2>
      <p className="text-sm text-muted-foreground">
        {isSignUp ? t.auth.signUpDescription : t.auth.signInDescription}
      </p>

      <GoogleButton />

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      {isSignUp && (
        <div className="space-y-2">
          <Label htmlFor="su-name">{t.auth.fullName}</Label>
          <Input
            id="su-name"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="auth-email">{t.auth.email}</Label>
        <Input
          id="auth-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="auth-pw">Password</Label>
        <PasswordInput
          id="auth-pw"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (isSignUp ? "Creating account…" : "Signing in…") : isSignUp ? t.auth.signUp : t.auth.signIn}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isSignUp ? t.auth.hasAccount : t.auth.noAccount}{" "}
        <button
          type="button"
          className="text-primary font-medium hover:underline"
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
