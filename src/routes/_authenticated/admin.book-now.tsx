import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { calculateRentalSubtotal, rentalTypeAvailable, type RentalType } from "@/lib/rental-pricing";
import { uploadDataUrl, uploadRentalAssetWithFallback } from "@/lib/storage";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/api/payment.functions";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { SignaturePad } from "@/components/SignaturePad";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toErrorMessage } from "@/lib/errors";
import {
  createWalkInBooking,
  createWalkInShopCustomer,
  recordWalkInPayment,
} from "@/lib/walk-in-booking";
import {
  formatPhoneE164,
  validateNationalPhone,
  validateOptionalEmail,
} from "@/lib/contact-validators";
import {
  formatIdDocumentInput,
  idDocumentPlaceholder,
  normalizeIdDocumentForStorage,
  validateIdDocumentNumber,
  validateIdDocumentNumberLive,
} from "@/lib/id-document-validators";
import { PhoneInput } from "@/components/PhoneInput";
import { markEquipmentBooked } from "@/lib/equipment-status";
import { BookNowEquipmentPicker } from "@/components/BookNowEquipmentPicker";
import type { CountryCode } from "@/lib/locale/countries";
import { toast } from "sonner";
import bookingsFixSql from "../../../supabase/RUN_BOOKINGS_RLS_ONLY.sql?raw";
import walkinFixSql from "../../../supabase/RUN_WALKIN_BOOKING_FIX.sql?raw";
import {
  ArrowLeft, ArrowRight, Check, User, Truck, FileUp, Wallet, Loader2,
} from "lucide-react";
import type { Equipment, PaymentMethod } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/book-now")({
  component: BookNowPage,
});

const STEPS = [
  { id: "customer", label: "Customer", icon: User },
  { id: "equipment", label: "Equipment", icon: Truck },
  { id: "documents", label: "Documents", icon: FileUp },
  { id: "payment", label: "Payment", icon: Wallet },
] as const;

type StepId = (typeof STEPS)[number]["id"];

interface CustomerForm {
  full_name: string;
  phone_country: CountryCode;
  phone: string;
  email: string;
  address: string;
  id_document_type: string;
  id_document_number: string;
}

interface EquipmentForm {
  equipment_id: string;
  start_date: string;
  end_date: string;
  rental_type: RentalType;
  custom_rent_amount: string;
  insurance_required: boolean;
  delivery_address: string;
  notes: string;
}

function BookNowPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { branchId, branch, filterByBranch, formatMoney, calculateTaxAmount, taxLabel, currency, country } = useBranchScope();
  const [step, setStep] = useState<StepId>("customer");
  const [submitting, setSubmitting] = useState(false);

  const [customer, setCustomer] = useState<CustomerForm>({
    full_name: "", phone_country: country, phone: "", email: "", address: "",
    id_document_type: "Aadhaar", id_document_number: "",
  });
  const [customerErrors, setCustomerErrors] = useState<{
    phone?: string;
    email?: string;
    address?: string;
    id_number?: string;
  }>({});
  const [equipmentForm, setEquipmentForm] = useState<EquipmentForm>({
    equipment_id: "", start_date: "", end_date: "",
    rental_type: "daily",
    custom_rent_amount: "",
    insurance_required: false,
    delivery_address: "", notes: "",
  });
  const [idFile, setIdFile] = useState<File | null>(null);
  const [handoverFile, setHandoverFile] = useState<File | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: equipmentList = [] } = useQuery({
    queryKey: ["book-now-equipment", branchId],
    queryFn: async () => {
      const rows = ((await db
        .from("equipment")
        .select("*, category:equipment_categories(category_name)")
        .eq("status", "available")
        .order("equipment_name")).data ?? []) as Equipment[];
      return filterByBranch(rows);
    },
  });

  useEffect(() => {
    setEquipmentForm((prev) => {
      if (!prev.equipment_id) return prev;
      const stillInBranch = equipmentList.some((e) => e.id === prev.equipment_id);
      return stillInBranch ? prev : { ...prev, equipment_id: "" };
    });
  }, [branchId, equipmentList]);

  const selectedEquipment = equipmentList.find((e) => e.id === equipmentForm.equipment_id);

  const pricing = useMemo(() => {
    if (!selectedEquipment || !equipmentForm.start_date || !equipmentForm.end_date) {
      return null;
    }
    if (!rentalTypeAvailable(
      equipmentForm.rental_type,
      selectedEquipment,
      Number(equipmentForm.custom_rent_amount) || 0,
    )) {
      return null;
    }
    const rental = calculateRentalSubtotal(
      equipmentForm.rental_type,
      selectedEquipment,
      equipmentForm.start_date,
      equipmentForm.end_date,
      Number(equipmentForm.custom_rent_amount) || 0,
    );
    const insuranceCost = equipmentForm.insurance_required ? rental.subtotal * 0.05 : 0;
    const transportCost = Number(selectedEquipment.transport_charge) || 0;
    const taxable = rental.subtotal + insuranceCost + transportCost;
    const tax = calculateTaxAmount(taxable);
    const total = taxable + tax;
    return {
      ...rental,
      insuranceCost,
      transportCost,
      tax,
      total,
      rentalType: equipmentForm.rental_type,
    };
  }, [selectedEquipment, equipmentForm, calculateTaxAmount]);

  const customerStepReady = useMemo(() => {
    if (!customer.full_name.trim()) {
      return { ok: false, reason: "Enter customer full name" };
    }
    const phoneError = validateNationalPhone(customer.phone_country, customer.phone);
    if (phoneError) return { ok: false, reason: phoneError };
    const emailError = customer.email.trim() ? validateOptionalEmail(customer.email) : null;
    if (emailError) return { ok: false, reason: emailError };
    if (!customer.address.trim()) {
      return { ok: false, reason: "Enter customer address" };
    }
    const idError = validateIdDocumentNumber(customer.id_document_type, customer.id_document_number);
    if (idError) return { ok: false, reason: idError };
    return { ok: true, reason: null as string | null };
  }, [customer]);

  const equipmentStepReady = useMemo(() => {
    if (!equipmentForm.equipment_id) {
      return { ok: false, reason: "Select equipment from the list" };
    }
    if (!equipmentForm.start_date || !equipmentForm.end_date) {
      return { ok: false, reason: "Choose start and end dates" };
    }
    if (equipmentForm.end_date < equipmentForm.start_date) {
      return { ok: false, reason: "End date must be on or after start date" };
    }
    if (!selectedEquipment) {
      return { ok: false, reason: "Selected equipment is no longer available" };
    }
    if (!rentalTypeAvailable(
      equipmentForm.rental_type,
      selectedEquipment,
      Number(equipmentForm.custom_rent_amount) || 0,
    )) {
      if (equipmentForm.rental_type === "custom") {
        return { ok: false, reason: "Enter a custom rental amount" };
      }
      if (equipmentForm.rental_type === "monthly") {
        return { ok: false, reason: "No monthly rate on this equipment — choose daily or custom rent" };
      }
      return { ok: false, reason: "Complete the rental details" };
    }
    return { ok: true, reason: null as string | null };
  }, [equipmentForm, selectedEquipment]);

  const stepReady = useMemo(() => {
    if (step === "customer") return customerStepReady;
    if (step === "equipment") return equipmentStepReady;
    if (step === "documents") {
      return idFile
        ? { ok: true, reason: null as string | null }
        : { ok: false, reason: "Upload an ID document photo" };
    }
    if (step === "payment") {
      const adv = Number(advanceAmount);
      if (Number.isNaN(adv) || adv < 0) {
        return { ok: false, reason: "Enter a valid advance amount (0 or more)" };
      }
      if ((paymentMethod === "upi" || paymentMethod === "card") && adv > 0 && adv < 1) {
        return { ok: false, reason: "Minimum online payment is ₹1" };
      }
      return { ok: true, reason: null as string | null };
    }
    return { ok: true, reason: null as string | null };
  }, [step, customerStepReady, equipmentStepReady, idFile, advanceAmount, paymentMethod]);

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const customerPhoneE164 = formatPhoneE164(customer.phone_country, customer.phone);

  const validateCustomerStep = (): boolean => {
    const phoneError = validateNationalPhone(customer.phone_country, customer.phone);
    const emailError = customer.email.trim() ? validateOptionalEmail(customer.email) : null;
    const addressError = !customer.address.trim() ? "Address is required" : null;
    const idError = validateIdDocumentNumber(customer.id_document_type, customer.id_document_number);
    const nameError = !customer.full_name.trim() ? "Full name is required" : null;
    setCustomerErrors({
      phone: phoneError ?? undefined,
      email: emailError ?? undefined,
      address: addressError ?? undefined,
      id_number: idError ?? undefined,
    });
    return !phoneError && !emailError && !addressError && !idError && !nameError;
  };

  const livePhoneError = customer.phone
    ? validateNationalPhone(customer.phone_country, customer.phone)
    : null;

  const liveIdError = customer.id_document_number
    ? validateIdDocumentNumberLive(customer.id_document_type, customer.id_document_number)
    : null;

  const pickRentalTypeForEquipment = (equipment: Equipment): RentalType => {
    if (Number(equipment.daily_rate) > 0) return "daily";
    if (Number(equipment.monthly_rate) > 0) return "monthly";
    return "custom";
  };

  const submitBooking = async () => {
    if (!user || !pricing || !selectedEquipment) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const ts = Date.now();
      const prefix = `bookings/${branchId ?? "main"}/${ts}`;

      let idDocUrl: string | null = null;
      let handoverUrl: string | null = null;
      let signatureUrl: string | null = null;

      if (idFile) idDocUrl = await uploadRentalAssetWithFallback(idFile, `${prefix}/id-${idFile.name}`);
      if (handoverFile) handoverUrl = await uploadRentalAssetWithFallback(handoverFile, `${prefix}/handover-${handoverFile.name}`);
      if (signatureData) signatureUrl = await uploadDataUrl(signatureData, `${prefix}/signature.png`);

      const bookingBranchId = selectedEquipment.branch_id ?? branchId;

      const shopCustomerId = await createWalkInShopCustomer({
        branch_id: bookingBranchId,
        full_name: customer.full_name.trim(),
        phone: customerPhoneE164,
        email: customer.email.trim(),
        address: customer.address.trim(),
        id_document_type: customer.id_document_type,
        id_document_number: normalizeIdDocumentForStorage(
          customer.id_document_type,
          customer.id_document_number,
        ),
        id_document_url: idDocUrl,
      });

      const advance = Number(advanceAmount) || 0;
      const needsRazorpay = (paymentMethod === "upi" || paymentMethod === "card") && advance > 0;

      const booking = await createWalkInBooking({
        user_id: user.id,
        shop_customer_id: shopCustomerId,
        equipment_id: equipmentForm.equipment_id,
        branch_id: bookingBranchId,
        start_date: equipmentForm.start_date,
        end_date: equipmentForm.end_date,
        number_of_days: pricing.days,
        insurance_required: equipmentForm.insurance_required,
        delivery_address: equipmentForm.delivery_address || null,
        subtotal: pricing.subtotal,
        insurance_cost: pricing.insuranceCost,
        transport_cost: pricing.transportCost,
        tax: pricing.tax,
        total_amount: pricing.total,
        advance_amount: advance,
        advance_paid: needsRazorpay ? 0 : advance,
        payment_method: paymentMethod,
        booking_status: needsRazorpay ? "pending" : "approved",
        payment_status: needsRazorpay ? "pending" : advance >= pricing.total ? "paid" : "pending",
        notes: equipmentForm.notes || null,
        rental_type: equipmentForm.rental_type,
        custom_rent_amount: equipmentForm.rental_type === "custom"
          ? Number(equipmentForm.custom_rent_amount) || 0
          : null,
        id_document_url: idDocUrl,
        handover_photo_url: handoverUrl,
        customer_signature_url: signatureUrl,
        customer_label: `${customer.full_name} (${customerPhoneE164})`,
      });

      try {
        await markEquipmentBooked(equipmentForm.equipment_id);
      } catch (statusErr) {
        console.warn("[BookNow] equipment status:", toErrorMessage(statusErr));
      }

      if (needsRazorpay) {
        try {
          const order = await createRazorpayOrder({
            data: {
              amount: advance,
              currency: currency || "INR",
              referenceId: booking.id,
              receipt: booking.booking_number,
              purpose: "booking",
            },
          });

          await new Promise<void>((resolve, reject) => {
            void openRazorpayCheckout({
              keyId: order.keyId,
              orderId: order.orderId,
              amount: order.amount,
              currency: order.currency,
              name: "HERMS Rental",
              description: `Advance for ${booking.booking_number}`,
              customerName: customer.full_name,
              customerPhone: customerPhoneE164,
              customerEmail: customer.email || undefined,
              paymentMethod: paymentMethod === "card" ? "card" : "upi",
              onSuccess: async (paymentId, orderId, signature) => {
                try {
                  await verifyRazorpayPayment({
                    data: {
                      orderId,
                      paymentId,
                      signature,
                      referenceId: booking.id,
                      amount: advance,
                    },
                  });
                  await recordWalkInPayment(
                    booking.id,
                    advance,
                    paymentMethod,
                    paymentId,
                    {
                      advance_paid: advance,
                      booking_status: "approved",
                      payment_status: advance >= pricing.total ? "paid" : "pending",
                    },
                  );
                  resolve();
                } catch (e) {
                  reject(e);
                }
              },
              onDismiss: () => reject(new Error("Payment cancelled")),
              onFailure: (message) => reject(new Error(message)),
            });
          });
        } catch (payErr) {
          toast.warning(`Booking ${booking.booking_number} saved. Payment pending — ${toErrorMessage(payErr)}`);
          nav({ to: "/admin/bookings" });
          return;
        }
      } else if (advance > 0) {
        await recordWalkInPayment(booking.id, advance, paymentMethod);
      }

      toast.success(`Booking ${booking.booking_number} created`);
      void qc.invalidateQueries({ queryKey: ["book-now-equipment"] });
      void qc.invalidateQueries({ queryKey: ["admin-equipment-list"] });
      nav({ to: "/admin/bookings" });
    } catch (err) {
      const message = toErrorMessage(err);
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/dashboard"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
      </div>
      <PageHeader
        title="Book Now"
        description={branch ? `New walk-in rental · ${branch.name}` : "New walk-in rental"}
      />

      {/* Step indicator */}
      <div className="mb-6 flex gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = s.id === step;
          const done = i < stepIndex;
          return (
            <div
              key={s.id}
              className={cn(
                "flex flex-1 min-w-[72px] flex-col items-center gap-1 rounded-xl px-2 py-2 text-center text-[10px] font-medium transition-colors",
                active && "bg-primary text-primary-foreground",
                done && !active && "bg-emerald-500/15 text-emerald-700",
                !active && !done && "bg-muted text-muted-foreground",
              )}
            >
              {done && !active ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              <span>{s.label}</span>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border bg-card p-4 sm:p-6 shadow-sm max-w-2xl mx-auto">
        {step === "customer" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Customer details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Full name *</Label>
                <Input value={customer.full_name} onChange={(e) => setCustomer({ ...customer, full_name: e.target.value })} />
              </div>
              <div>
                <Label>Phone *</Label>
                <PhoneInput
                  countryCode={customer.phone_country}
                  value={customer.phone}
                  onCountryChange={(code) => setCustomer({ ...customer, phone_country: code })}
                  onValueChange={(phone) => {
                    setCustomer({ ...customer, phone });
                    if (customerErrors.phone) setCustomerErrors((e) => ({ ...e, phone: undefined }));
                  }}
                  error={customerErrors.phone ?? livePhoneError}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={customer.email}
                  onChange={(e) => {
                    setCustomer({ ...customer, email: e.target.value });
                    if (customerErrors.email) setCustomerErrors((e) => ({ ...e, email: undefined }));
                  }}
                  aria-invalid={!!customerErrors.email}
                />
                {customerErrors.email ? (
                  <p className="text-xs text-destructive mt-1">{customerErrors.email}</p>
                ) : null}
              </div>
              <div className="sm:col-span-2">
                <Label>Address *</Label>
                <Textarea
                  value={customer.address}
                  onChange={(e) => {
                    setCustomer({ ...customer, address: e.target.value });
                    if (customerErrors.address) setCustomerErrors((err) => ({ ...err, address: undefined }));
                  }}
                  rows={2}
                  aria-invalid={!!customerErrors.address}
                />
                {customerErrors.address ? (
                  <p className="text-xs text-destructive mt-1">{customerErrors.address}</p>
                ) : null}
              </div>
              <div>
                <Label>ID type</Label>
                <Select
                  value={customer.id_document_type}
                  onValueChange={(v) => {
                    setCustomer((prev) => ({
                      ...prev,
                      id_document_type: v,
                      id_document_number: formatIdDocumentInput(v, prev.id_document_number),
                    }));
                    if (customerErrors.id_number) {
                      setCustomerErrors((err) => ({ ...err, id_number: undefined }));
                    }
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Aadhaar", "PAN", "Driving License", "Passport", "Voter ID"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ID number *</Label>
                <Input
                  value={customer.id_document_number}
                  onChange={(e) => {
                    setCustomer({
                      ...customer,
                      id_document_number: formatIdDocumentInput(
                        customer.id_document_type,
                        e.target.value,
                      ),
                    });
                    if (customerErrors.id_number) {
                      setCustomerErrors((err) => ({ ...err, id_number: undefined }));
                    }
                  }}
                  placeholder={idDocumentPlaceholder(customer.id_document_type)}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={!!(customerErrors.id_number ?? liveIdError)}
                />
                {(customerErrors.id_number ?? liveIdError) ? (
                  <p className="text-xs text-destructive mt-1">
                    {customerErrors.id_number ?? liveIdError}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    {customer.id_document_type === "Aadhaar"
                      ? "12 digits — spaces added automatically"
                      : customer.id_document_type === "PAN"
                        ? "Format: ABCDE1234F"
                        : customer.id_document_type === "Voter ID"
                          ? "Format: ABC 1234567"
                          : null}
                  </p>
                )}
              </div>
            </div>
            {!customerStepReady.ok && customerStepReady.reason ? (
              <p className="text-xs text-amber-700 dark:text-amber-400 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                {customerStepReady.reason}
              </p>
            ) : null}
          </div>
        )}

        {step === "equipment" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Equipment & rental period</h2>
            <div className="space-y-3">
              <BookNowEquipmentPicker
                equipment={equipmentList}
                value={equipmentForm.equipment_id}
                onChange={(id) => {
                  const picked = equipmentList.find((e) => e.id === id);
                  setEquipmentForm((prev) => ({
                    ...prev,
                    equipment_id: id,
                    rental_type: picked ? pickRentalTypeForEquipment(picked) : prev.rental_type,
                  }));
                }}
                formatMoney={formatMoney}
                emptyMessage={
                  <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-4 text-center">
                    No available equipment for{" "}
                    {branch ? <strong>{branch.name}</strong> : "this branch"}.
                    {" "}Switch branch from the top bar or set equipment status to Available on the Equipment page.
                  </p>
                }
              />

              <div className="space-y-2">
                <Label>Rental option *</Label>
                <RadioGroup
                  value={equipmentForm.rental_type}
                  onValueChange={(v) => setEquipmentForm({ ...equipmentForm, rental_type: v as RentalType })}
                  className="grid gap-2"
                >
                  {[
                    {
                      value: "daily" as const,
                      label: "Daily rent",
                      hint: selectedEquipment
                        ? `${formatMoney(selectedEquipment.daily_rate)} per day`
                        : "Uses equipment daily rate",
                    },
                    {
                      value: "monthly" as const,
                      label: "Monthly rent",
                      hint: selectedEquipment?.monthly_rate
                        ? `${formatMoney(selectedEquipment.monthly_rate)} per month`
                        : "Set monthly rate on equipment first",
                    },
                    {
                      value: "custom" as const,
                      label: "Custom rent",
                      hint: "Enter a negotiated amount for this booking",
                    },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors",
                        equipmentForm.rental_type === opt.value && "border-primary bg-primary/5",
                        opt.value === "monthly" && selectedEquipment && !selectedEquipment.monthly_rate && "opacity-60",
                      )}
                    >
                      <RadioGroupItem value={opt.value} className="mt-0.5" disabled={opt.value === "monthly" && !!selectedEquipment && !selectedEquipment.monthly_rate} />
                      <div>
                        <p className="font-medium text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.hint}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {equipmentForm.rental_type === "custom" && (
                <div>
                  <Label>Custom rental amount *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={equipmentForm.custom_rent_amount}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, custom_rent_amount: e.target.value })}
                    placeholder="Enter agreed rent for this period"
                  />
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Start date *</Label>
                  <Input type="date" value={equipmentForm.start_date} onChange={(e) => setEquipmentForm({ ...equipmentForm, start_date: e.target.value })} />
                </div>
                <div>
                  <Label>End date *</Label>
                  <Input type="date" value={equipmentForm.end_date} min={equipmentForm.start_date} onChange={(e) => setEquipmentForm({ ...equipmentForm, end_date: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label>Insurance</Label>
                <Switch checked={equipmentForm.insurance_required} onCheckedChange={(v) => setEquipmentForm({ ...equipmentForm, insurance_required: v })} />
              </div>
              <div>
                <Label>Delivery address</Label>
                <Input value={equipmentForm.delivery_address} onChange={(e) => setEquipmentForm({ ...equipmentForm, delivery_address: e.target.value })} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={equipmentForm.notes} onChange={(e) => setEquipmentForm({ ...equipmentForm, notes: e.target.value })} rows={2} />
              </div>
            </div>
            {pricing && (
              <div className="rounded-xl bg-muted/50 p-4 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="capitalize">{pricing.rentalType} — {pricing.label}</span>
                  <span>{formatMoney(pricing.subtotal)}</span>
                </div>
                {pricing.rentalType === "monthly" && (
                  <p className="text-xs text-muted-foreground">{pricing.days} days ≈ {pricing.months} month(s)</p>
                )}
                {pricing.insuranceCost > 0 && <div className="flex justify-between"><span>Insurance</span><span>{formatMoney(pricing.insuranceCost)}</span></div>}
                <div className="flex justify-between"><span>{taxLabel}</span><span>{formatMoney(pricing.tax)}</span></div>
                <div className="flex justify-between font-bold text-base pt-2 border-t"><span>Total</span><span>{formatMoney(pricing.total)}</span></div>
              </div>
            )}
            {!equipmentStepReady.ok && equipmentStepReady.reason ? (
              <p className="text-xs text-amber-700 dark:text-amber-400 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                {equipmentStepReady.reason}
              </p>
            ) : null}
          </div>
        )}

        {step === "documents" && (
          <div className="space-y-5">
            <h2 className="font-semibold text-lg">Documents & handover</h2>
            <div>
              <Label>ID document photo *</Label>
              <Input type="file" accept="image/*,.pdf" className="mt-1" onChange={(e) => setIdFile(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <Label>Handover photo (optional)</Label>
              <Input type="file" accept="image/*" className="mt-1" onChange={(e) => setHandoverFile(e.target.files?.[0] ?? null)} />
            </div>
            <SignaturePad onChange={setSignatureData} />
            {!stepReady.ok && stepReady.reason ? (
              <p className="text-xs text-amber-700 dark:text-amber-400 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                {stepReady.reason}
              </p>
            ) : null}
          </div>
        )}

        {step === "payment" && (
          <div className="space-y-5">
            <h2 className="font-semibold text-lg">Advance & payment</h2>
            {submitError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive space-y-2">
                <p>{submitError.replace(/\s*— Fix:.*$/i, "").replace(/\s*— Run supabase\/RUN_BOOK.*$/i, "")}</p>
                {(submitError.toLowerCase().includes("row level security")
                  || submitError.toLowerCase().includes("row-level security")
                  || submitError.includes("SUPABASE_SERVICE_ROLE_KEY")) ? (
                  <div className="text-muted-foreground space-y-2">
                    <p className="font-medium text-foreground">One-time fix (pick one):</p>
                    <p>
                      <strong>A — Lovable (easiest):</strong> On your PC, open the HERMS project in{" "}
                      <a href="https://lovable.dev" target="_blank" rel="noreferrer" className="underline">
                        Lovable
                      </a>
                      . Tap <strong>Copy fix SQL</strong> below, then in Lovable chat paste:{" "}
                      <span className="font-mono text-[10px]">
                        Apply this SQL to fix Book Now bookings
                      </span>
                    </p>
                    <p>
                      <strong>B — service_role key:</strong> In Lovable chat ask:{" "}
                      <span className="font-mono text-[10px]">
                        Add SUPABASE_SERVICE_ROLE_KEY to .env for local dev
                      </span>
                      , then on your PC run <span className="font-mono">npm run setup:book-now</span> with that key
                      and restart <span className="font-mono">npm run dev</span>.
                    </p>
                    <p className="text-[10px]">
                      Do not use keys from your personal Supabase org — HERMS uses Lovable Cloud (
                      <span className="font-mono">nafiagoakklihweizces</span>).
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        void navigator.clipboard.writeText(bookingsFixSql).then(() => {
                          toast.success("SQL copied — paste into Lovable chat and send");
                        });
                      }}
                    >
                      Copy fix SQL
                    </Button>
                  </div>
                ) : submitError.includes("bookings_customer_id_fkey")
                  || submitError.includes("not present in table \"profiles\"") ? (
                  <div className="text-muted-foreground space-y-2">
                    <p className="font-medium text-foreground">One-time database fix:</p>
                    <p>
                      Open Supabase → SQL Editor, paste{" "}
                      <span className="font-mono text-[10px]">RUN_WALKIN_BOOKING_FIX.sql</span>
                      , and Run. Or: <span className="font-mono">npm run apply:walkin-fix</span>
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        void navigator.clipboard.writeText(walkinFixSql).then(() => {
                          toast.success("Walk-in booking fix SQL copied");
                        });
                      }}
                    >
                      Copy fix SQL
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
            {pricing && (
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                <p className="text-sm text-muted-foreground">Total rental amount</p>
                <p className="text-2xl font-bold">{formatMoney(pricing.total)}</p>
              </div>
            )}
            <div>
              <Label>Advance amount</Label>
              <Input
                type="number"
                min={0}
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-3">
              <Label>Payment mode</Label>
              <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)} className="grid gap-2">
                {[
                  { value: "upi", label: "UPI / GPay", hint: "Pay via Razorpay" },
                  { value: "card", label: "Card", hint: "Debit / Credit via Razorpay" },
                  { value: "cash", label: "Cash", hint: "Collected at counter" },
                  { value: "bank_transfer", label: "Bank transfer", hint: "Mark as pending" },
                ].map((m) => (
                  <label
                    key={m.value}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors",
                      paymentMethod === m.value && "border-primary bg-primary/5",
                    )}
                  >
                    <RadioGroupItem value={m.value} />
                    <div>
                      <p className="font-medium text-sm">{m.label}</p>
                      <p className="text-xs text-muted-foreground">{m.hint}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>
            {(paymentMethod === "upi" || paymentMethod === "card") && Number(advanceAmount) > 0 && (
              <p className="text-xs text-muted-foreground rounded-lg bg-muted p-3 space-y-1">
                <span className="block">
                  Tapping &quot;Book now&quot; opens Razorpay to collect ₹{Number(advanceAmount).toLocaleString()} via{" "}
                  {paymentMethod === "upi" ? "UPI / GPay" : "card"}.
                </span>
                {Number(advanceAmount) > 0 && Number(advanceAmount) < 1 && (
                  <span className="block text-amber-700 dark:text-amber-400">
                    Minimum online payment is ₹1.
                  </span>
                )}
                <span className="block text-[11px] opacity-80">
                  Test mode: use Razorpay test UPI/card — payment is simulated, no real charge.
                </span>
              </p>
            )}
            {pricing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setAdvanceAmount(String(Math.round(pricing.total)))}
              >
                Use full amount ({formatMoney(pricing.total)})
              </Button>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-8 pt-4 border-t">
          {stepIndex > 0 && (
            <Button variant="outline" onClick={() => setStep(STEPS[stepIndex - 1].id)} disabled={submitting}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          <div className="flex-1" />
          {step !== "payment" ? (
            <Button
              onClick={() => {
                if (step === "customer" && !validateCustomerStep()) return;
                if (!stepReady.ok) return;
                setStep(STEPS[stepIndex + 1].id);
              }}
              disabled={!stepReady.ok}
            >
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={submitBooking} disabled={submitting || !stepReady.ok}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Processing…</> : "Book now"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
