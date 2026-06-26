import { db } from "@/lib/db";
import { toErrorMessage } from "@/lib/errors";
import type { EquipmentStatus } from "@/lib/types";

export const EQUIPMENT_STATUSES: EquipmentStatus[] = [
  "available",
  "booked",
  "under_maintenance",
  "out_of_service",
];

type DbLike = Pick<typeof db, "from">;

export async function updateEquipmentStatus(
  equipmentId: string,
  status: EquipmentStatus,
  client: DbLike = db,
): Promise<void> {
  const { error } = await client.from("equipment").update({ status }).eq("id", equipmentId);
  if (error) throw new Error(toErrorMessage(error));
}

export async function markEquipmentBooked(
  equipmentId: string,
  client: DbLike = db,
): Promise<void> {
  await updateEquipmentStatus(equipmentId, "booked", client);
}

export async function markEquipmentAvailable(
  equipmentId: string,
  client: DbLike = db,
): Promise<void> {
  await updateEquipmentStatus(equipmentId, "available", client);
}
