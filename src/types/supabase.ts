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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          details: string | null
          id: string
          metadata: Json | null
          scope: string
          timestamp: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: string | null
          id?: string
          metadata?: Json | null
          scope: string
          timestamp?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: string | null
          id?: string
          metadata?: Json | null
          scope?: string
          timestamp?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          accuracy: number | null
          created_at: string
          employee_name: string
          id: string
          latitude: number | null
          location_display: string | null
          longitude: number | null
          note: string | null
          photo_public_url: string | null
          recorded_date: string
          recorded_time: string
          status: Database["public"]["Enums"]["attendance_status"]
          storage_path: string | null
          store_name: string | null
          submitted_at: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          employee_name: string
          id?: string
          latitude?: number | null
          location_display?: string | null
          longitude?: number | null
          note?: string | null
          photo_public_url?: string | null
          recorded_date: string
          recorded_time: string
          status: Database["public"]["Enums"]["attendance_status"]
          storage_path?: string | null
          store_name?: string | null
          submitted_at?: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          employee_name?: string
          id?: string
          latitude?: number | null
          location_display?: string | null
          longitude?: number | null
          note?: string | null
          photo_public_url?: string | null
          recorded_date?: string
          recorded_time?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          storage_path?: string | null
          store_name?: string | null
          submitted_at?: string
        }
        Relationships: []
      }
      auth_audit_logs: {
        Row: {
          created_at: string
          employee_id: string | null
          employee_name: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          pin_provided: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          employee_name?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          pin_provided?: string | null
          success: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          employee_name?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          pin_provided?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      auth_rate_limits: {
        Row: {
          created_at: string
          employee_id: string
          failed_attempts: number
          last_failed_at: string | null
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          failed_attempts?: number
          last_failed_at?: string | null
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          failed_attempts?: number
          last_failed_at?: string | null
          locked_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      branding_settings: {
        Row: {
          created_at: string
          id: string
          logo_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_store_assignments: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          is_primary: boolean
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          is_primary?: boolean
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          is_primary?: boolean
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_store_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_store_assignments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          default_store_id: string | null
          employee_code: string | null
          id: string
          name: string
          phone: string | null
          province: string | null
          region: string | null
          regular_day_off: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_store_id?: string | null
          employee_code?: string | null
          id?: string
          name: string
          phone?: string | null
          province?: string | null
          region?: string | null
          regular_day_off?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_store_id?: string | null
          employee_code?: string | null
          id?: string
          name?: string
          phone?: string | null
          province?: string | null
          region?: string | null
          regular_day_off?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_default_store_id_fkey"
            columns: ["default_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          employee_id: string
          employee_name: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          employee_name: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          employee_name?: string
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      monthly_sales_targets: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string
          employee_name: string
          id: string
          notes: string | null
          status: string
          target_month: string
          target_quantity: number | null
          target_revenue_pc: number | null
          target_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id: string
          employee_name: string
          id?: string
          notes?: string | null
          status?: string
          target_month: string
          target_quantity?: number | null
          target_revenue_pc?: number | null
          target_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string
          employee_name?: string
          id?: string
          notes?: string | null
          status?: string
          target_month?: string
          target_quantity?: number | null
          target_revenue_pc?: number | null
          target_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_sales_targets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      pc_daily_reports: {
        Row: {
          competitor_promo_notes: string | null
          competitor_promo_photos: string[] | null
          created_at: string
          customer_activities: string | null
          employee_id: string
          employee_name: string
          id: string
          report_date: string
          status: string
          store_id: string
          store_name: string
          store_promo_notes: string | null
          store_promo_photos: string[] | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          competitor_promo_notes?: string | null
          competitor_promo_photos?: string[] | null
          created_at?: string
          customer_activities?: string | null
          employee_id: string
          employee_name: string
          id?: string
          report_date: string
          status?: string
          store_id: string
          store_name: string
          store_promo_notes?: string | null
          store_promo_photos?: string[] | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          competitor_promo_notes?: string | null
          competitor_promo_photos?: string[] | null
          created_at?: string
          customer_activities?: string | null
          employee_id?: string
          employee_name?: string
          id?: string
          report_date?: string
          status?: string
          store_id?: string
          store_name?: string
          store_promo_notes?: string | null
          store_promo_photos?: string[] | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pc_daily_reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pc_daily_reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      pc_shelf_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          photo_url: string
          report_id: string
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_url: string
          report_id: string
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_url?: string
          report_id?: string
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pc_shelf_photos_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "pc_daily_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      pc_stock_usage: {
        Row: {
          created_at: string
          id: string
          product_code: string
          product_id: string
          product_name: string
          quantities: Json
          report_id: string
          total_base_units: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_code: string
          product_id: string
          product_name: string
          quantities?: Json
          report_id: string
          total_base_units?: number
        }
        Update: {
          created_at?: string
          id?: string
          product_code?: string
          product_id?: string
          product_name?: string
          quantities?: Json
          report_id?: string
          total_base_units?: number
        }
        Relationships: [
          {
            foreignKeyName: "pc_stock_usage_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pc_stock_usage_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "pc_daily_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      pin_change_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          changed_by_role: string | null
          created_at: string
          employee_id: string
          employee_name: string
          id: string
          ip_address: string | null
          new_pin_encrypted: string | null
          new_pin_hash: string
          old_pin_encrypted: string | null
          old_pin_hash: string
          user_agent: string | null
          user_pin_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          changed_by_role?: string | null
          created_at?: string
          employee_id: string
          employee_name: string
          id?: string
          ip_address?: string | null
          new_pin_encrypted?: string | null
          new_pin_hash: string
          old_pin_encrypted?: string | null
          old_pin_hash: string
          user_agent?: string | null
          user_pin_id: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          changed_by_role?: string | null
          created_at?: string
          employee_id?: string
          employee_name?: string
          id?: string
          ip_address?: string | null
          new_pin_encrypted?: string | null
          new_pin_hash?: string
          old_pin_encrypted?: string | null
          old_pin_hash?: string
          user_agent?: string | null
          user_pin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pin_change_history_user_pin_id_fkey"
            columns: ["user_pin_id"]
            isOneToOne: false
            referencedRelation: "user_pins"
            referencedColumns: ["id"]
          },
        ]
      }
      product_assignment_units: {
        Row: {
          assignment_id: string
          created_at: string
          id: string
          is_active: boolean
          price_pc: number
          unit_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          price_pc?: number
          unit_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          price_pc?: number
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_assignment_units_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "product_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_assignment_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "product_units"
            referencedColumns: ["id"]
          },
        ]
      }
      product_assignments: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          product_id: string
          store_id: string | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          product_id: string
          store_id?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          product_id?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_assignments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_units: {
        Row: {
          created_at: string
          id: string
          is_base: boolean
          multiplier_to_base: number
          name: string
          product_id: string
          sku: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_base?: boolean
          multiplier_to_base: number
          name: string
          product_id: string
          sku?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_base?: boolean
          multiplier_to_base?: number
          name?: string
          product_id?: string
          sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_units_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      recoverable_pins: {
        Row: {
          created_at: string
          employee_id: string
          employee_name: string
          last_viewed_at: string | null
          last_viewed_by: string | null
          pin_hash: string
          pin_plain: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          employee_name: string
          last_viewed_at?: string | null
          last_viewed_by?: string | null
          pin_hash: string
          pin_plain: string
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          employee_name?: string
          last_viewed_at?: string | null
          last_viewed_by?: string | null
          pin_hash?: string
          pin_plain?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_records: {
        Row: {
          assignment_id: string | null
          created_at: string
          employee_name: string
          id: string
          price_pc: number | null
          product_code: string
          product_name: string
          quantity: number
          recorded_date: string
          recorded_time: string
          store_name: string | null
          submitted_at: string
          total: number
          total_pc: number | null
          unit_id: string | null
          unit_name: string | null
          unit_price: number
          unit_price_company: number | null
          unit_type: string | null
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string
          employee_name: string
          id?: string
          price_pc?: number | null
          product_code: string
          product_name: string
          quantity: number
          recorded_date: string
          recorded_time: string
          store_name?: string | null
          submitted_at?: string
          total: number
          total_pc?: number | null
          unit_id?: string | null
          unit_name?: string | null
          unit_price: number
          unit_price_company?: number | null
          unit_type?: string | null
        }
        Update: {
          assignment_id?: string | null
          created_at?: string
          employee_name?: string
          id?: string
          price_pc?: number | null
          product_code?: string
          product_name?: string
          quantity?: number
          recorded_date?: string
          recorded_time?: string
          store_name?: string | null
          submitted_at?: string
          total?: number
          total_pc?: number | null
          unit_id?: string | null
          unit_name?: string | null
          unit_price?: number
          unit_price_company?: number | null
          unit_type?: string | null
        }
        Relationships: []
      }
      stock_inventory: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          product_id: string
          quantity: number
          store_id: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          product_id: string
          quantity?: number
          store_id: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          product_id?: string
          quantity?: number
          store_id?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_inventory_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_inventory_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "product_units"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          balance_after: number
          created_at: string
          employee_id: string
          employee_name: string
          id: string
          note: string | null
          product_code: string
          product_id: string
          product_name: string
          quantity: number
          sales_record_id: string | null
          store_id: string
          store_name: string
          transaction_type: string
          unit_id: string
          unit_name: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          employee_id: string
          employee_name: string
          id?: string
          note?: string | null
          product_code: string
          product_id: string
          product_name: string
          quantity: number
          sales_record_id?: string | null
          store_id: string
          store_name: string
          transaction_type: string
          unit_id: string
          unit_name: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          employee_id?: string
          employee_name?: string
          id?: string
          note?: string | null
          product_code?: string
          product_id?: string
          product_name?: string
          quantity?: number
          sales_record_id?: string | null
          store_id?: string
          store_name?: string
          transaction_type?: string
          unit_id?: string
          unit_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_sales_record_id_fkey"
            columns: ["sales_record_id"]
            isOneToOne: false
            referencedRelation: "sales_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "product_units"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          province: string | null
          radius: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          province?: string | null
          radius?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          province?: string | null
          radius?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_pins: {
        Row: {
          created_at: string
          employee_id: string
          employee_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          pin_hash: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          employee_name: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          pin_hash: string
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          employee_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          pin_hash?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_stock_transaction: {
        Args: {
          p_employee_id: string
          p_note?: string
          p_product_id: string
          p_quantity: number
          p_sales_record_id?: string
          p_store_id: string
          p_transaction_type: string
          p_unit_id: string
        }
        Returns: {
          balance_after: number
          message: string
          success: boolean
          transaction_id: string
        }[]
      }
      auto_complete_past_targets: { Args: never; Returns: number }
      calculate_stock_base_units: {
        Args: { p_product_id: string; p_quantities: Json }
        Returns: number
      }
      calculate_target_progress: {
        Args: { p_employee_id: string; p_target_month: string }
        Returns: {
          actual_quantity: number
          actual_revenue_pc: number
          days_elapsed: number
          days_remaining: number
          is_achieved: boolean
          overall_achievement_percent: number
          quantity_achievement_percent: number
          revenue_achievement_percent: number
        }[]
      }
      cleanup_old_audit_logs: { Args: never; Returns: number }
      get_recoverable_pin: {
        Args: { p_employee_id: string; p_requesting_role: string }
        Returns: {
          created_at: string
          employee_id: string
          employee_name: string
          pin_plain: string
          role: string
          updated_at: string
        }[]
      }
      is_account_locked: { Args: { p_employee_id: string }; Returns: boolean }
      reset_rate_limit: { Args: { p_employee_id: string }; Returns: undefined }
      sync_recoverable_pin: {
        Args: {
          p_employee_id: string
          p_employee_name: string
          p_pin_hash: string
          p_pin_plain: string
          p_role: string
        }
        Returns: undefined
      }
      validate_pin_format: { Args: { p_pin: string }; Returns: boolean }
    }
    Enums: {
      attendance_status: "check-in" | "check-out"
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
      attendance_status: ["check-in", "check-out"],
    },
  },
} as const
