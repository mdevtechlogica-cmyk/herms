export function toErrorMessage(err: unknown): string {
  if (!err) return "Something went wrong";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const e = err as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [e.message, e.details, e.hint].filter(Boolean);
    if (parts.length > 0) return parts.join(" — ");
    if (e.code) return `Error ${e.code}`;
  }
  return "Something went wrong";
}

export function isMissingSchema(err: unknown): boolean {
  const msg = toErrorMessage(err).toLowerCase();
  return (
    msg.includes("could not find") ||
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("column") ||
    (typeof err === "object" && (err as { code?: string }).code === "PGRST204")
  );
}

export function isRlsError(err: unknown): boolean {
  const msg = toErrorMessage(err).toLowerCase();
  return (
    msg.includes("row-level security") ||
    msg.includes("row level security") ||
    (typeof err === "object" && (err as { code?: string }).code === "42501")
  );
}

export function isMissingRpc(err: unknown): boolean {
  const msg = toErrorMessage(err).toLowerCase();
  return (
    msg.includes("admin_create_walk_in") ||
    msg.includes("could not find the function") ||
    (typeof err === "object" && (err as { code?: string }).code === "42883")
  );
}
