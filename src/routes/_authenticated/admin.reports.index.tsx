import { createFileRoute } from "@tanstack/react-router";
import { ReportsHub } from "@/components/reports/ReportsHub";

export const Route = createFileRoute("/_authenticated/admin/reports/")({
  component: ReportsHub,
});
