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
      badges: {
        Row: {
          created_at: string
          criteria_json: Json
          description: string
          icon: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          criteria_json: Json
          description: string
          icon: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          criteria_json?: Json
          description?: string
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          category: string
          created_at: string
          device: string | null
          email: string | null
          id: string
          ip_hash: string
          message: string
          rating: number
          status: string | null
          user_agent: string | null
          version: string | null
        }
        Insert: {
          category: string
          created_at?: string
          device?: string | null
          email?: string | null
          id?: string
          ip_hash: string
          message: string
          rating: number
          status?: string | null
          user_agent?: string | null
          version?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          device?: string | null
          email?: string | null
          id?: string
          ip_hash?: string
          message?: string
          rating?: number
          status?: string | null
          user_agent?: string | null
          version?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          annual_saving_eur: number | null
          cta_clicked_at: string
          current_annual_cost_eur: number | null
          device: string | null
          id: string
          ip_hash: string | null
          offer_annual_cost_eur: number | null
          offer_id: string | null
          provider: string | null
          redirect_url: string | null
          status: string | null
          upload_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          annual_saving_eur?: number | null
          cta_clicked_at?: string
          current_annual_cost_eur?: number | null
          device?: string | null
          id?: string
          ip_hash?: string | null
          offer_annual_cost_eur?: number | null
          offer_id?: string | null
          provider?: string | null
          redirect_url?: string | null
          status?: string | null
          upload_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          annual_saving_eur?: number | null
          cta_clicked_at?: string
          current_annual_cost_eur?: number | null
          device?: string | null
          id?: string
          ip_hash?: string | null
          offer_annual_cost_eur?: number | null
          offer_id?: string | null
          provider?: string | null
          redirect_url?: string | null
          status?: string | null
          upload_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          clicked_at: string | null
          data: Json | null
          id: string
          message: string
          opened_at: string | null
          sent_at: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          clicked_at?: string | null
          data?: Json | null
          id?: string
          message: string
          opened_at?: string | null
          sent_at?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          clicked_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          opened_at?: string | null
          sent_at?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      ocr_results: {
        Row: {
          annual_kwh: number | null
          created_at: string
          gas_smc: number | null
          id: string
          quality_score: number | null
          raw_json: Json | null
          total_cost_eur: number | null
          unit_price_eur_kwh: number | null
          upload_id: string
        }
        Insert: {
          annual_kwh?: number | null
          created_at?: string
          gas_smc?: number | null
          id?: string
          quality_score?: number | null
          raw_json?: Json | null
          total_cost_eur?: number | null
          unit_price_eur_kwh?: number | null
          upload_id: string
        }
        Update: {
          annual_kwh?: number | null
          created_at?: string
          gas_smc?: number | null
          id?: string
          quality_score?: number | null
          raw_json?: Json | null
          total_cost_eur?: number | null
          unit_price_eur_kwh?: number | null
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocr_results_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          fixed_fee_eur_mo: number
          id: string
          plan_name: string
          provider: string
          terms_json: Json | null
          unit_price_eur_kwh: number
          updated_at: string
        }
        Insert: {
          fixed_fee_eur_mo: number
          id?: string
          plan_name: string
          provider: string
          terms_json?: Json | null
          unit_price_eur_kwh: number
          updated_at?: string
        }
        Update: {
          fixed_fee_eur_mo?: number
          id?: string
          plan_name?: string
          provider?: string
          terms_json?: Json | null
          unit_price_eur_kwh?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          device_tokens: Json | null
          display_name: string | null
          email: string | null
          id: string
          is_premium: boolean | null
          notification_preferences: Json | null
          premium_expires_at: string | null
          total_savings_eur: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_tokens?: Json | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_premium?: boolean | null
          notification_preferences?: Json | null
          premium_expires_at?: string | null
          total_savings_eur?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_tokens?: Json | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_premium?: boolean | null
          notification_preferences?: Json | null
          premium_expires_at?: string | null
          total_savings_eur?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          annual_cost_offer: number
          annual_saving_eur: number
          created_at: string
          id: string
          offer_id: string
          upload_id: string
        }
        Insert: {
          annual_cost_offer: number
          annual_saving_eur: number
          created_at?: string
          id?: string
          offer_id: string
          upload_id: string
        }
        Update: {
          annual_cost_offer?: number
          annual_saving_eur?: number
          created_at?: string
          id?: string
          offer_id?: string
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          bonus_eur: number | null
          completed_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_email: string | null
          referred_user_id: string | null
          referrer_user_id: string
          status: string
        }
        Insert: {
          bonus_eur?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_user_id: string
          status?: string
        }
        Update: {
          bonus_eur?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_user_id?: string
          status?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan_type: string
          price_eur: number | null
          started_at: string
          status: string
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_type: string
          price_eur?: number | null
          started_at?: string
          status: string
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_type?: string
          price_eur?: number | null
          started_at?: string
          status?: string
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      uploads: {
        Row: {
          created_at: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
