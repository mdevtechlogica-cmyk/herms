import { useAuth } from "@/lib/auth-context";
import { SubscriptionPlansPicker } from "@/components/SubscriptionPlansPicker";
import { Button } from "@/components/ui/button";
import { Construction, Lock } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export function TrialPaywall() {
  const { signOut } = useAuth();
  const nav = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    nav({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-svh bg-muted/30 flex flex-col">
      <header className="border-b bg-background px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-accent">
            <Construction className="h-5 w-5" />
          </div>
          <span className="font-bold font-heading">HERMS</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void handleSignOut()}>
          Sign out
        </Button>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
        <div className="rounded-xl border bg-card p-6 md:p-8 mb-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-amber-500/10 text-amber-600">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Your free trial has ended</h1>
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
            Choose a subscription plan to continue using HERMS. Basic, Intermediate, and Premium
            are all available — pick the one that fits your fleet.
          </p>
        </div>

        <SubscriptionPlansPicker />
      </main>
    </div>
  );
}
