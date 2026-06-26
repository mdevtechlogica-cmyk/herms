import type { LucideIcon } from "lucide-react";

import {

  Banknote,

  ClipboardList,

  CreditCard,

  FileText,

  Truck,

  Users,

  Wrench,

} from "lucide-react";



export type ReportCategory = "operations" | "finance" | "fleet";



export interface ReportCatalogItem {

  to: string;

  title: string;

  description: string;

  icon: LucideIcon;

  tone: string;

  category: ReportCategory;

  gradient: string;

}



export const REPORT_CATEGORIES: { id: ReportCategory; label: string; description: string }[] = [

  { id: "operations", label: "Operations", description: "Bookings and rental activity" },

  { id: "finance", label: "Finance", description: "Revenue, payments, and billing" },

  { id: "fleet", label: "Fleet & customers", description: "Equipment, maintenance, and customers" },

];



export const REPORT_CATALOG: ReportCatalogItem[] = [

  {

    to: "/admin/reports/bookings",

    title: "Bookings",

    description: "Rental bookings by status, period, and equipment.",

    icon: ClipboardList,

    tone: "text-blue-600 bg-blue-500/10",

    category: "operations",

    gradient: "from-blue-500/20 via-blue-500/5 to-transparent",

  },

  {

    to: "/admin/reports/revenue",

    title: "Revenue",

    description: "Payments collected, pending balances, and totals.",

    icon: Banknote,

    tone: "text-emerald-600 bg-emerald-500/10",

    category: "finance",

    gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",

  },

  {

    to: "/admin/reports/payments",

    title: "Payments",

    description: "Payment status, methods, advances, and outstanding.",

    icon: CreditCard,

    tone: "text-teal-600 bg-teal-500/10",

    category: "finance",

    gradient: "from-teal-500/20 via-teal-500/5 to-transparent",

  },

  {

    to: "/admin/reports/invoices",

    title: "Invoices",

    description: "Generated invoices, tax breakdown, and totals.",

    icon: FileText,

    tone: "text-indigo-600 bg-indigo-500/10",

    category: "finance",

    gradient: "from-indigo-500/20 via-indigo-500/5 to-transparent",

  },

  {

    to: "/admin/reports/equipment",

    title: "Equipment",

    description: "Fleet status, availability, and categories.",

    icon: Truck,

    tone: "text-violet-600 bg-violet-500/10",

    category: "fleet",

    gradient: "from-violet-500/20 via-violet-500/5 to-transparent",

  },

  {

    to: "/admin/reports/maintenance",

    title: "Maintenance",

    description: "Service history, costs, and upcoming schedules.",

    icon: Wrench,

    tone: "text-amber-600 bg-amber-500/10",

    category: "fleet",

    gradient: "from-amber-500/20 via-amber-500/5 to-transparent",

  },

  {

    to: "/admin/reports/customers",

    title: "Customers",

    description: "Walk-in customers, contacts, and rental history.",

    icon: Users,

    tone: "text-rose-600 bg-rose-500/10",

    category: "fleet",

    gradient: "from-rose-500/20 via-rose-500/5 to-transparent",

  },

];


