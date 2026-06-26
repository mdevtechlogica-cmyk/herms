export type AppRole = "admin" | "employee" | "customer";
export type SubscriptionPlan = "basic" | "intermediate" | "premium";

export type EquipmentStatus = "available" | "booked" | "under_maintenance" | "out_of_service";
export type BookingStatus =
  | "pending" | "approved" | "rejected" | "assigned" | "dispatched"
  | "active" | "returned" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type OperatorStatus = "available" | "assigned" | "on_leave";
export type MaintenanceType = "preventive" | "breakdown" | "scheduled";
export type MaintenanceStatus = "scheduled" | "in_progress" | "completed";

export interface Profile {
  id: string;
  full_name: string;
  company_name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  gst_number: string | null;
  country_code?: string | null;
  preferred_language?: string | null;
  subscription_plan?: SubscriptionPlan | string | null;
  subscription_active?: boolean | null;
  trial_ends_at?: string | null;
  blocked: boolean;
  created_at: string;
}

export interface Branch {
  id: string;
  owner_id: string;
  name: string;
  country_code: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CountryTaxConfig {
  country_code: string;
  tax_name: string;
  tax_rate: number;
  tax_id_label: string;
  currency_code: string;
  updated_at?: string;
}

export interface EquipmentCategory {
  id: string;
  category_name: string;
  description: string | null;
  icon: string | null;
}

export interface Equipment {
  id: string;
  equipment_name: string;
  category_id: string | null;
  brand: string | null;
  model: string | null;
  manufacture_year: number | null;
  serial_number: string | null;
  registration_number: string | null;
  daily_rate: number;
  weekly_rate: number | null;
  monthly_rate: number | null;
  operator_charge: number;
  transport_charge: number;
  fuel_type: string | null;
  capacity: string | null;
  description: string | null;
  status: EquipmentStatus;
  location: string | null;
  branch_id: string | null;
  main_image: string | null;
  gallery_images: string[] | null;
  category?: EquipmentCategory | null;
}

export type PaymentMethod = "cash" | "upi" | "card" | "bank_transfer";
export type RentalType = "daily" | "monthly" | "custom";

export interface ShopCustomer {
  id: string;
  branch_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  id_document_type: string | null;
  id_document_number: string | null;
  id_document_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface Operator {
  id: string;
  operator_name: string;
  license_number: string | null;
  experience: number | null;
  phone: string | null;
  status: OperatorStatus;
  assigned_booking: string | null;
}

export interface Booking {
  id: string;
  booking_number: string;
  customer_id: string;
  equipment_id: string;
  operator_id: string | null;
  start_date: string;
  end_date: string;
  number_of_days: number;
  operator_required: boolean;
  insurance_required: boolean;
  delivery_address: string | null;
  subtotal: number;
  operator_cost: number;
  insurance_cost: number;
  transport_cost: number;
  tax: number;
  total_amount: number;
  booking_status: BookingStatus;
  payment_status: PaymentStatus;
  notes: string | null;
  branch_id: string | null;
  shop_customer_id: string | null;
  advance_amount: number;
  advance_paid: number;
  payment_method: PaymentMethod | string | null;
  rental_type: RentalType | string | null;
  custom_rent_amount: number | null;
  id_document_url: string | null;
  handover_photo_url: string | null;
  customer_signature_url: string | null;
  return_document_url?: string | null;
  advance_refunded?: number | null;
  refund_method?: PaymentMethod | string | null;
  collected_at?: string | null;
  collection_notes?: string | null;
  created_at: string;
  equipment?: Equipment | null;
  customer?: Profile | null;
  shop_customer?: ShopCustomer | null;
  operator?: Operator | null;
}

export interface MaintenanceLog {
  id: string;
  equipment_id: string;
  service_date: string;
  maintenance_type: MaintenanceType;
  vendor: string | null;
  cost: number | null;
  remarks: string | null;
  next_service_date: string | null;
  status: MaintenanceStatus;
  equipment?: Equipment | null;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  booking_id: string;
  customer_id: string;
  amount: number;
  tax: number;
  total: number;
  invoice_date: string;
  pdf_url: string | null;
}

export interface Payment {
  id: string;
  booking_id: string;
  transaction_id: string | null;
  amount: number;
  payment_method: string | null;
  payment_status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
}
