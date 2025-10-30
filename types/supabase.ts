export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      attendance_records: {
        Row: {
          id: string;
          recorded_date: string;
          recorded_time: string;
          status: "check-in" | "check-out";
          employee_name: string;
          store_name: string | null;
          note: string | null;
          latitude: number | null;
          longitude: number | null;
          accuracy: number | null;
          location_display: string | null;
          photo_public_url: string | null;
          storage_path: string | null;
          submitted_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          recorded_date: string;
          recorded_time: string;
          status: "check-in" | "check-out";
          employee_name: string;
          store_name?: string | null;
          note?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          accuracy?: number | null;
          location_display?: string | null;
          photo_public_url?: string | null;
          storage_path?: string | null;
          submitted_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          recorded_date?: string;
          recorded_time?: string;
          status?: "check-in" | "check-out";
          employee_name?: string;
          store_name?: string | null;
          note?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          accuracy?: number | null;
          location_display?: string | null;
          photo_public_url?: string | null;
          storage_path?: string | null;
          submitted_at?: string;
          created_at?: string;
        };
      };
      employees: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          employee_code: string | null;
          regular_day_off: string | null;
          province: string | null;
          region: string | null;
          default_store_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          employee_code?: string | null;
          regular_day_off?: string | null;
          province?: string | null;
          region?: string | null;
          default_store_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          employee_code?: string | null;
          regular_day_off?: string | null;
          province?: string | null;
          region?: string | null;
          default_store_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      stores: {
        Row: {
          id: string;
          name: string;
          province: string | null;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          radius: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          province?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          radius?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          province?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          radius?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sales_records: {
        Row: {
          id: string;
          recorded_date: string;
          recorded_time: string;
          employee_name: string;
          store_name: string | null;
          product_code: string;
          product_name: string;
          unit_name: string | null;
          quantity: number;
          unit_price: number;
          total: number;
          assignment_id: string | null;
          unit_id: string | null;
          submitted_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          recorded_date: string;
          recorded_time: string;
          employee_name: string;
          store_name?: string | null;
          product_code: string;
          product_name: string;
          unit_name?: string | null;
          quantity: number;
          unit_price: number;
          total: number;
          assignment_id?: string | null;
          unit_id?: string | null;
          submitted_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          recorded_date?: string;
          recorded_time?: string;
          employee_name?: string;
          store_name?: string | null;
          product_code?: string;
          product_name?: string;
          unit_name?: string | null;
          quantity?: number;
          unit_price?: number;
          total?: number;
          assignment_id?: string | null;
          unit_id?: string | null;
          submitted_at?: string;
          created_at?: string;
        };
      };
      employee_store_assignments: {
        Row: {
          id: string;
          employee_id: string;
          store_id: string;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          store_id: string;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          store_id?: string;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      product_units: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          sku: string | null;
          is_base: boolean;
          multiplier_to_base: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          sku?: string | null;
          is_base?: boolean;
          multiplier_to_base?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          name?: string;
          sku?: string | null;
          is_base?: boolean;
          multiplier_to_base?: number;
          created_at?: string;
        };
      };
      product_assignments: {
        Row: {
          id: string;
          product_id: string;
          employee_id: string;
          store_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          employee_id: string;
          store_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          employee_id?: string;
          store_id?: string | null;
          created_at?: string;
        };
      };
      product_assignment_units: {
        Row: {
          id: string;
          assignment_id: string;
          unit_id: string;
          price_pc: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          unit_id: string;
          price_pc: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          unit_id?: string;
          price_pc?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      pc_daily_reports: {
        Row: {
          id: string;
          report_date: string;
          employee_id: string;
          employee_name: string;
          store_id: string;
          store_name: string;
          customer_activities: string | null;
          competitor_promo_photos: string[];
          competitor_promo_notes: string | null;
          store_promo_photos: string[];
          store_promo_notes: string | null;
          status: "draft" | "submitted";
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          report_date: string;
          employee_id: string;
          employee_name: string;
          store_id: string;
          store_name: string;
          customer_activities?: string | null;
          competitor_promo_photos?: string[];
          competitor_promo_notes?: string | null;
          store_promo_photos?: string[];
          store_promo_notes?: string | null;
          status?: "draft" | "submitted";
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          report_date?: string;
          employee_id?: string;
          employee_name?: string;
          store_id?: string;
          store_name?: string;
          customer_activities?: string | null;
          competitor_promo_photos?: string[];
          competitor_promo_notes?: string | null;
          store_promo_photos?: string[];
          store_promo_notes?: string | null;
          status?: "draft" | "submitted";
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      pc_shelf_photos: {
        Row: {
          id: string;
          report_id: string;
          photo_url: string;
          storage_path: string;
          caption: string | null;
          uploaded_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          photo_url: string;
          storage_path: string;
          caption?: string | null;
          uploaded_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          photo_url?: string;
          storage_path?: string;
          caption?: string | null;
          uploaded_at?: string;
          created_at?: string;
        };
      };
      pc_stock_usage: {
        Row: {
          id: string;
          report_id: string;
          product_id: string;
          product_code: string;
          product_name: string;
          quantities: Json;
          total_base_units: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          product_id: string;
          product_code: string;
          product_name: string;
          quantities?: Json;
          total_base_units?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          product_id?: string;
          product_code?: string;
          product_name?: string;
          quantities?: Json;
          total_base_units?: number;
          created_at?: string;
        };
      };
      stock_inventory: {
        Row: {
          id: string;
          employee_id: string;
          store_id: string;
          product_id: string;
          unit_id: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          store_id: string;
          product_id: string;
          unit_id: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          store_id?: string;
          product_id?: string;
          unit_id?: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      stock_transactions: {
        Row: {
          id: string;
          employee_id: string;
          employee_name: string;
          store_id: string;
          store_name: string;
          product_id: string;
          product_code: string;
          product_name: string;
          unit_id: string;
          unit_name: string;
          transaction_type: "receive" | "sale" | "return" | "adjustment";
          quantity: number;
          balance_after: number;
          note: string | null;
          sales_record_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          employee_name: string;
          store_id: string;
          store_name: string;
          product_id: string;
          product_code: string;
          product_name: string;
          unit_id: string;
          unit_name: string;
          transaction_type: "receive" | "sale" | "return" | "adjustment";
          quantity: number;
          balance_after: number;
          note?: string | null;
          sales_record_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          employee_name?: string;
          store_id?: string;
          store_name?: string;
          product_id?: string;
          product_code?: string;
          product_name?: string;
          unit_id?: string;
          unit_name?: string;
          transaction_type?: "receive" | "sale" | "return" | "adjustment";
          quantity?: number;
          balance_after?: number;
          note?: string | null;
          sales_record_id?: string | null;
          created_at?: string;
        };
      };
      monthly_sales_targets: {
        Row: {
          id: string;
          employee_id: string;
          employee_name: string;
          target_month: string;
          target_revenue_pc: number | null;
          target_quantity: number | null;
          target_type: "revenue" | "quantity" | "both";
          status: "active" | "completed" | "cancelled";
          notes: string | null;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          employee_id: string;
          employee_name: string;
          target_month: string;
          target_revenue_pc?: number | null;
          target_quantity?: number | null;
          target_type: "revenue" | "quantity" | "both";
          status?: "active" | "completed" | "cancelled";
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          employee_id?: string;
          employee_name?: string;
          target_month?: string;
          target_revenue_pc?: number | null;
          target_quantity?: number | null;
          target_type?: "revenue" | "quantity" | "both";
          status?: "active" | "completed" | "cancelled";
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
      };
      app_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_at?: string;
        };
      };
      user_pins: {
        Row: {
          id: string;
          employee_id: string;
          employee_name: string;
          pin_hash: string;
          role: "employee" | "sales" | "admin" | "super_admin";
          is_active: boolean;
          created_at: string;
          updated_at: string;
          last_login_at: string | null;
        };
        Insert: {
          id?: string;
          employee_id: string;
          employee_name: string;
          pin_hash: string;
          role: "employee" | "sales" | "admin" | "super_admin";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
        Update: {
          id?: string;
          employee_id?: string;
          employee_name?: string;
          pin_hash?: string;
          role?: "employee" | "sales" | "admin" | "super_admin";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
      };
      auth_audit_logs: {
        Row: {
          id: string;
          employee_id: string | null;
          employee_name: string | null;
          pin_provided: string | null;
          success: boolean;
          failure_reason: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_id?: string | null;
          employee_name?: string | null;
          pin_provided?: string | null;
          success: boolean;
          failure_reason?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string | null;
          employee_name?: string | null;
          pin_provided?: string | null;
          success?: boolean;
          failure_reason?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      auth_rate_limits: {
        Row: {
          employee_id: string;
          failed_attempts: number;
          last_failed_at: string | null;
          locked_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          employee_id: string;
          failed_attempts?: number;
          last_failed_at?: string | null;
          locked_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          employee_id?: string;
          failed_attempts?: number;
          last_failed_at?: string | null;
          locked_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      add_stock_transaction: {
        Args: {
          p_employee_id: string;
          p_store_id: string;
          p_product_id: string;
          p_unit_id: string;
          p_transaction_type: "receive" | "sale" | "return" | "adjustment";
          p_quantity: number;
          p_note?: string | null;
          p_sales_record_id?: string | null;
        };
        Returns: {
          transaction_id: string | null;
          balance_after: number;
          success: boolean;
          message: string;
        }[];
      };
      calculate_target_progress: {
        Args: {
          p_employee_id: string;
          p_target_month: string;
        };
        Returns: {
          actual_revenue_pc: number;
          actual_quantity: number;
          revenue_achievement_percent: number | null;
          quantity_achievement_percent: number | null;
          overall_achievement_percent: number;
          is_achieved: boolean;
          days_elapsed: number;
          days_remaining: number;
        }[];
      };
      auto_complete_past_targets: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
    Enums: {
      attendance_status: "check-in" | "check-out";
      stock_transaction_type: "receive" | "sale" | "return" | "adjustment";
      monthly_target_type: "revenue" | "quantity" | "both";
      monthly_target_status: "active" | "completed" | "cancelled";
    };
    CompositeTypes: Record<string, never>;
  };
};

// ============================================================================
// Monthly Sales Targets - Helper Types
// ============================================================================

export type MonthlyTargetType = Database["public"]["Enums"]["monthly_target_type"];
export type MonthlyTargetStatus = Database["public"]["Enums"]["monthly_target_status"];

export type MonthlyTargetRecord = Database["public"]["Tables"]["monthly_sales_targets"]["Row"];
export type MonthlyTargetInsert = Database["public"]["Tables"]["monthly_sales_targets"]["Insert"];
export type MonthlyTargetUpdate = Database["public"]["Tables"]["monthly_sales_targets"]["Update"];

/**
 * Monthly sales target with calculated progress metrics.
 * Extends the base target record with runtime-calculated fields.
 */
export interface MonthlyTargetWithProgress extends MonthlyTargetRecord {
  actual_revenue_pc: number;
  actual_quantity: number;
  revenue_achievement_percent: number | null;
  quantity_achievement_percent: number | null;
  overall_achievement_percent: number;
  is_achieved: boolean;
  days_remaining: number | null;
  days_elapsed: number;
}
