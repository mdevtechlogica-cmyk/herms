export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          booking_number: string | null
          booking_status: Database["public"]["Enums"]["booking_status"]
          created_at: string
          customer_id: string
          delivery_address: string | null
          end_date: string
          equipment_id: string
          id: string
          insurance_cost: number
          insurance_required: boolean
          notes: string | null
          number_of_days: number
          operator_cost: number
          operator_id: string | null
          operator_required: boolean
          payment_status: Database["public"]["Enums"]["payment_status"]
          start_date: string
          subtotal: number
          tax: number
          total_amount: number
          transport_cost: number
          updated_at: string
        }
        Insert: {
          booking_number?: string | null
          booking_status?: Database["public"]["Enums"]["booking_status"]
          created_at?: string
          customer_id: string
          delivery_address?: string | null
          end_date: string
          equipment_id: string
          id?: string
          insurance_cost?: number
          insurance_required?: boolean
          notes?: string | null
          number_of_days: number
          operator_cost?: number
          operator_id?: string | null
          operator_required?: boolean
          payment_status?: Database["public"]["Enums"]["payment_status"]
          start_date: string
          subtotal?: number
          tax?: number
          total_amount?: number
          transport_cost?: number
          updated_at?: string
        }
        Update: {
          booking_number?: string | null
          booking_status?: Database["public"]["Enums"]["booking_status"]
          created_at?: string
          customer_id?: string
          delivery_address?: string | null
          end_date?: string
          equipment_id?: string
          id?: string
          insurance_cost?: number
          insurance_required?: boolean
          notes?: string | null
          number_of_days?: number
          operator_cost?: number
          operator_id?: string | null
          operator_required?: boolean
          payment_status?: Database["public"]["Enums"]["payment_status"]
          start_date?: string
          subtotal?: number
          tax?: number
          total_amount?: number
          transport_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_profile_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          brand: string | null
          capacity: string | null
          category_id: string | null
          created_at: string
          daily_rate: number
          description: string | null
          equipment_name: string
          fuel_type: string | null
          gallery_images: string[] | null
          id: string
          location: string | null
          main_image: string | null
          manufacture_year: number | null
          model: string | null
          monthly_rate: number | null
          operator_charge: number
          registration_number: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["equipment_status"]
          transport_charge: number
          updated_at: string
          weekly_rate: number | null
        }
        Insert: {
          brand?: string | null
          capacity?: string | null
          category_id?: string | null
          created_at?: string
          daily_rate?: number
          description?: string | null
          equipment_name: string
          fuel_type?: string | null
          gallery_images?: string[] | null
          id?: string
          location?: string | null
          main_image?: string | null
          manufacture_year?: number | null
          model?: string | null
          monthly_rate?: number | null
          operator_charge?: number
          registration_number?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          transport_charge?: number
          updated_at?: string
          weekly_rate?: number | null
        }
        Update: {
          brand?: string | null
          capacity?: string | null
          category_id?: string | null
          created_at?: string
          daily_rate?: number
          description?: string | null
          equipment_name?: string
          fuel_type?: string | null
          gallery_images?: string[] | null
          id?: string
          location?: string | null
          main_image?: string | null
          manufacture_year?: number | null
          model?: string | null
          monthly_rate?: number | null
          operator_charge?: number
          registration_number?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          transport_charge?: number
          updated_at?: string
          weekly_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "equipment_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_categories: {
        Row: {
          category_name: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
        }
        Insert: {
          category_name: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
        }
        Update: {
          category_name?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          customer_id: string
          id: string
          invoice_date: string
          invoice_number: string | null
          pdf_url: string | null
          tax: number
          total: number
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          customer_id: string
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          pdf_url?: string | null
          tax?: number
          total: number
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          pdf_url?: string | null
          tax?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_logs: {
        Row: {
          cost: number | null
          created_at: string
          equipment_id: string
          id: string
          maintenance_type: Database["public"]["Enums"]["maintenance_type"]
          next_service_date: string | null
          remarks: string | null
          service_date: string
          status: Database["public"]["Enums"]["maintenance_status"]
          vendor: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          equipment_id: string
          id?: string
          maintenance_type: Database["public"]["Enums"]["maintenance_type"]
          next_service_date?: string | null
          remarks?: string | null
          service_date: string
          status?: Database["public"]["Enums"]["maintenance_status"]
          vendor?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          equipment_id?: string
          id?: string
          maintenance_type?: Database["public"]["Enums"]["maintenance_type"]
          next_service_date?: string | null
          remarks?: string | null
          service_date?: string
          status?: Database["public"]["Enums"]["maintenance_status"]
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read_status: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_status?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_status?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      operators: {
        Row: {
          assigned_booking: string | null
          created_at: string
          experience: number | null
          id: string
          license_number: string | null
          operator_name: string
          phone: string | null
          status: Database["public"]["Enums"]["operator_status"]
        }
        Insert: {
          assigned_booking?: string | null
          created_at?: string
          experience?: number | null
          id?: string
          license_number?: string | null
          operator_name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["operator_status"]
        }
        Update: {
          assigned_booking?: string | null
          created_at?: string
          experience?: number | null
          id?: string
          license_number?: string | null
          operator_name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["operator_status"]
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          paid_at: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          transaction_id: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          blocked: boolean
          company_name: string | null
          created_at: string
          email: string
          full_name: string
          gst_number: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          blocked?: boolean
          company_name?: string | null
          created_at?: string
          email: string
          full_name?: string
          gst_number?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          blocked?: boolean
          company_name?: string | null
          created_at?: string
          email?: string
          full_name?: string
          gst_number?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string | null
          created_at: string
          customer_id: string
          equipment_id: string
          id: string
          rating: number
          review: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          customer_id: string
          equipment_id: string
          id?: string
          rating: number
          review?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          customer_id?: string
          equipment_id?: string
          id?: string
          rating?: number
          review?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_app_access: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "customer" | "employee"
      booking_status:
        | "pending"
        | "approved"
        | "rejected"
        | "assigned"
        | "dispatched"
        | "active"
        | "returned"
        | "completed"
        | "cancelled"
      equipment_status:
        | "available"
        | "booked"
        | "under_maintenance"
        | "out_of_service"
      maintenance_status: "scheduled" | "in_progress" | "completed"
      maintenance_type: "preventive" | "breakdown" | "scheduled"
      operator_status: "available" | "assigned" | "on_leave"
      payment_status: "pending" | "paid" | "failed" | "refunded"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "customer"],
      booking_status: [
        "pending",
        "approved",
        "rejected",
        "assigned",
        "dispatched",
        "active",
        "returned",
        "completed",
        "cancelled",
      ],
      equipment_status: [
        "available",
        "booked",
        "under_maintenance",
        "out_of_service",
      ],
      maintenance_status: ["scheduled", "in_progress", "completed"],
      maintenance_type: ["preventive", "breakdown", "scheduled"],
      operator_status: ["available", "assigned", "on_leave"],
      payment_status: ["pending", "paid", "failed", "refunded"],
    },
  },
} as const
