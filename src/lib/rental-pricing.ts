import { daysBetween } from "@/lib/format";

export type RentalType = "daily" | "monthly" | "custom";

interface RateEquipment {
  daily_rate: number;
  monthly_rate: number | null;
}

export function calculateRentalSubtotal(
  rentalType: RentalType,
  equipment: RateEquipment,
  startDate: string,
  endDate: string,
  customAmount?: number,
): { subtotal: number; days: number; months: number; label: string } {
  const days = daysBetween(startDate, endDate);
  const months = Math.max(1, Math.ceil(days / 30));

  if (rentalType === "custom") {
    const amount = Number(customAmount) || 0;
    return { subtotal: amount, days, months, label: "Custom rental amount" };
  }

  if (rentalType === "monthly") {
    const rate = Number(equipment.monthly_rate) || 0;
    return {
      subtotal: rate * months,
      days,
      months,
      label: `${months} month(s) × ${rate}/month`,
    };
  }

  const rate = Number(equipment.daily_rate) || 0;
  return {
    subtotal: rate * days,
    days,
    months,
    label: `${days} day(s) × ${rate}/day`,
  };
}

export function rentalTypeAvailable(
  rentalType: RentalType,
  equipment: RateEquipment,
  customAmount?: number,
): boolean {
  if (rentalType === "custom") return (Number(customAmount) || 0) > 0;
  if (rentalType === "monthly") return (Number(equipment.monthly_rate) || 0) > 0;
  return true;
}
