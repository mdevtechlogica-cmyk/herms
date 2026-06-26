import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/lib/auth-context";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/api/payment.functions";
import { useLocale } from "@/lib/locale-context";
import { useWorkspace } from "@/lib/workspace-context";
import { usePlan } from "@/lib/plan-context";
import {
  getSubscriptionMonthlyPrice,
  PLAN_LIMITS,
  type SubscriptionPlan,
} from "@/lib/plans";
import { COUNTRIES } from "@/lib/locale/countries";
import { openRazorpayCheckout } from "@/lib/razorpay";
import {
  getRazorpaySubscriptionAmount,
  isRazorpayOnlineSupported,
  RAZORPAY_CURRENCY,
} from "@/lib/razorpay-config";
import { toErrorMessage } from "@/lib/errors";
import { Check, Crown, Loader2, ArrowLeft, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PLANS: SubscriptionPlan[] = ["basic", "intermediate", "premium"];

type SubscriptionPaymentMethod = "upi" | "card" | "bank_transfer";

interface SubscriptionPlansPickerProps {
  compact?: boolean;
}

export function SubscriptionPlansPicker({ compact }: SubscriptionPlansPickerProps) {
  const { user, profile } = useAuth();
  const { plan, setPlan, subscriptionActive } = usePlan();
  const { formatMoney } = useLocale();
  const { country } = useWorkspace();
  const razorpayOnline = isRazorpayOnlineSupported(country);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<SubscriptionPaymentMethod>("upi");
  const [paying, setPaying] = useState(false);

  const startCheckout = (key: SubscriptionPlan) => {
    if (plan === key && subscriptionActive) return;
    setSelectedPlan(key);
    setPaymentMethod("upi");
  };

  const completeSubscription = async () => {
    if (!selectedPlan || !user) return;
    const amount = getSubscriptionMonthlyPrice(country, selectedPlan);
    const razorpayAmount = getRazorpaySubscriptionAmount(selectedPlan);
    const planLabel = PLAN_LIMITS[selectedPlan].label;

    setPaying(true);
    try {
      const needsRazorpay =
        (paymentMethod === "upi" || paymentMethod === "card") && razorpayOnline;

      if ((paymentMethod === "upi" || paymentMethod === "card") && !razorpayOnline) {
        throw new Error("UPI and card are available for India (INR) only. Choose bank transfer or set country to India on the dashboard.");
      }

      if (needsRazorpay) {
        const order = await createRazorpayOrder({
          data: {
            amount: razorpayAmount,
            currency: RAZORPAY_CURRENCY,
            referenceId: user.id,
            receipt: `sub_${selectedPlan}`,
            purpose: "subscription",
          },
        });

        await new Promise<void>((resolve, reject) => {
          void openRazorpayCheckout({
            keyId: order.keyId,
            orderId: order.orderId,
            amount: order.amount,
            currency: order.currency,
            name: "HERMS",
            description: `${planLabel} plan · monthly`,
            customerName: profile?.full_name || undefined,
            customerPhone: profile?.phone || undefined,
            customerEmail: profile?.email || undefined,
            paymentMethod: paymentMethod === "card" ? "card" : "upi",
            onSuccess: async (paymentId, orderId, signature) => {
              try {
                await verifyRazorpayPayment({
                  data: {
                    orderId,
                    paymentId,
                    signature,
                    referenceId: user.id,
                    amount: razorpayAmount,
                  },
                });
                await setPlan(selectedPlan);
                resolve();
              } catch (e) {
                reject(e);
              }
            },
            onDismiss: () => reject(new Error("Payment cancelled")),
            onFailure: (message) => reject(new Error(message)),
          });
        });

        toast.success(`${planLabel} plan activated — payment received`);
      } else {
        await setPlan(selectedPlan);
        toast.success(
          `${planLabel} plan activated. Complete your bank transfer of ${formatMoney(amount)} to finalize payment.`,
        );
      }

      setSelectedPlan(null);
    } catch (e) {
      toast.error(toErrorMessage(e));
    } finally {
      setPaying(false);
    }
  };

  const selectedPrice = selectedPlan ? getSubscriptionMonthlyPrice(country, selectedPlan) : 0;

  return (
    <div className="space-y-6">
      <div className={cn("grid gap-4", compact ? "md:grid-cols-3" : "md:grid-cols-3")}>
        {PLANS.map((key) => {
          const info = PLAN_LIMITS[key];
          const isCurrent = plan === key && subscriptionActive;
          const isSelected = selectedPlan === key;
          const branchLimit = Number.isFinite(info.branches) ? String(info.branches) : "Unlimited";
          const equipLimit = Number.isFinite(info.equipment) ? String(info.equipment) : "Unlimited";
          const monthlyPrice = getSubscriptionMonthlyPrice(country, key);

          return (
            <div
              key={key}
              className={cn(
                "rounded-xl border bg-card p-5 flex flex-col",
                (isCurrent || isSelected) && "border-primary ring-2 ring-primary/20",
                key === "premium" && "relative overflow-hidden",
              )}
            >
              {key === "premium" && (
                <Crown className="absolute top-3 right-3 h-5 w-5 text-amber-500" />
              )}
              <h3 className="text-lg font-semibold">{info.label}</h3>
              <div className="mt-2">
                <p className="text-2xl font-bold tracking-tight">
                  {formatMoney(monthlyPrice)}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {COUNTRIES[country].currency} · {COUNTRIES[country].name}
                </p>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{info.description}</p>
              <ul className="mt-4 space-y-2 text-sm flex-1">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  {branchLimit} branch{branchLimit === "1" ? "" : "es"}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  {equipLimit} equipment
                </li>
              </ul>
              <Button
                className="mt-5 w-full"
                variant={isCurrent ? "secondary" : isSelected ? "secondary" : "default"}
                disabled={paying || isCurrent}
                onClick={() => startCheckout(key)}
              >
                {isCurrent
                  ? "Current plan"
                  : isSelected
                    ? "Selected"
                    : `Choose ${info.label}`}
              </Button>
            </div>
          );
        })}
      </div>

      {selectedPlan && (
        <div className="rounded-xl border bg-card p-5 sm:p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Pay for {PLAN_LIMITS[selectedPlan].label}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {formatMoney(selectedPrice)}/month · {COUNTRIES[country].name}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={paying}
              onClick={() => setSelectedPlan(null)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Change plan
            </Button>
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <p className="text-sm text-muted-foreground">Amount due today</p>
            <p className="text-2xl font-bold">{formatMoney(selectedPrice)}</p>
          </div>

          <div className="space-y-3">
            <Label>Payment method</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as SubscriptionPaymentMethod)}
              className="grid gap-2 sm:grid-cols-3"
            >
              {[
                { value: "upi" as const, label: "UPI / GPay", hint: "Pay via Razorpay (INR)", online: true },
                { value: "card" as const, label: "Card", hint: "Debit / Credit (INR)", online: true },
                { value: "bank_transfer" as const, label: "Bank transfer", hint: "Activate now, pay offline", online: false },
              ].map((m) => {
                const disabled = m.online && !razorpayOnline;
                return (
                <label
                  key={m.value}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 transition-colors",
                    disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                    paymentMethod === m.value && !disabled && "border-primary bg-primary/5",
                  )}
                >
                  <RadioGroupItem value={m.value} className="mt-0.5" disabled={disabled} />
                  <div>
                    <p className="font-medium text-sm">{m.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {disabled ? "India only (INR)" : m.hint}
                    </p>
                  </div>
                </label>
              );})}
            </RadioGroup>
          </div>

          {(paymentMethod === "upi" || paymentMethod === "card") && razorpayOnline && (
            <p className="text-xs text-muted-foreground rounded-lg bg-muted p-3">
              Razorpay checkout opens for{" "}
              {formatMoney(getRazorpaySubscriptionAmount(selectedPlan))} (INR) via{" "}
              {paymentMethod === "upi" ? "UPI / GPay" : "card"}. Payments appear under{" "}
              <strong>Transactions</strong> in your Razorpay dashboard (use Test mode while testing).
            </p>
          )}

          {!razorpayOnline && (
            <p className="text-xs text-amber-800 dark:text-amber-300 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
              Online Razorpay payments are in <strong>INR</strong> for India. Set dashboard country to
              India for UPI/card, or use bank transfer.
            </p>
          )}

          {paymentMethod === "bank_transfer" && (
            <p className="text-xs text-muted-foreground rounded-lg bg-muted p-3">
              Your plan will activate immediately. Transfer {formatMoney(selectedPrice)} to your registered
              business account and keep the payment reference for your records.
            </p>
          )}

          <Button
            className="w-full sm:w-auto"
            disabled={paying}
            onClick={() => void completeSubscription()}
          >
            {paying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing…
              </>
            ) : paymentMethod === "bank_transfer" ? (
              `Activate ${PLAN_LIMITS[selectedPlan].label}`
            ) : (
              `Pay ${formatMoney(selectedPrice)} & subscribe`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
