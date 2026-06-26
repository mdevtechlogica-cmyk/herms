import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function ReportBackLink() {
  return (
    <Link
      to="/admin/reports"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
    >
      <ArrowLeft className="h-4 w-4" />
      All reports
    </Link>
  );
}
