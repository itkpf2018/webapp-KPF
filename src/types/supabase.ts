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
      product_assignment_units: {
        Row: {
          assignment_id: string
          created_at: string
          id: string
          is_active: boolean
          price_company: number
          price_pc: number
          unit_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          price_company?: number
          price_pc?: number
          unit_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          price_company?: number
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
      sales_records: {
        Row: {
          assignment_id: string | null
          created_at: string
          employee_name: string
          id: string
          price_company: number | null
          price_pc: number | null
          product_code: string
          product_name: string
          quantity: number
          recorded_date: string
          recorded_time: string
          store_name: string | null
          submitted_at: string
          total: number
          total_company: number | null
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
          price_company?: number | null
          price_pc?: number | null
          product_code: string
          product_name: string
          quantity: number
          recorded_date: string
          recorded_time: string
          store_name?: string | null
          submitted_at?: string
          total: number
          total_company?: number | null
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
          price_company?: number | null
          price_pc?: number | null
          product_code?: string
          product_name?: string
          quantity?: number
          recorded_date?: string
          recorded_time?: string
          store_name?: string | null
          submitted_at?: string
          total?: number
          total_company?: number | null
          total_pc?: number | null
          unit_id?: string | null
          unit_name?: string | null
          unit_price?: number
          unit_price_company?: number | null
          unit_type?: string | null
        }
        Relationships: []
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
      app_logs: {
        Row: {
          id: string
          timestamp: string
          action: string
          scope: string
          actor_name: string | null
          actor_id: string | null
          details: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          timestamp?: string
          action: string
          scope: string
          actor_name?: string | null
          actor_id?: string | null
          details?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          timestamp?: string
          action?: string
          scope?: string
          actor_name?: string | null
          actor_id?: string | null
          details?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      branding_settings: {
        Row: {
          id: string
          logo_path: string | null
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          logo_path?: string | null
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          logo_path?: string | null
          updated_at?: string
          created_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          color: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          id: string
          employee_id: string
          employee_name: string
          type: string
          start_date: string
          end_date: string
          reason: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          employee_name: string
          type: string
          start_date: string
          end_date: string
          reason?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          employee_name?: string
          type?: string
          start_date?: string
          end_date?: string
          reason?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
