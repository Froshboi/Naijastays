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
      favorites: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          agent_name: string | null
          agent_phone: string | null
          agent_title: string | null
          amenities: string[] | null
          baths: number | null
          beds: number | null
          city: string | null
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          listing_type: string
          price: number
          price_label: string | null
          status: string | null
          property_type: string
          rating: number | null
          reviews_count: number | null
          size: string | null
          state: string | null
          title: string
          updated_at: string
          user_id: string
          verified: boolean | null
          promoted: boolean | null
          promoted_until: string | null
          promotion_plan: string | null
          video_url: string | null
          writeup: string | null
        }
        Insert: {
          address?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          agent_title?: string | null
          amenities?: string[] | null
          baths?: number | null
          beds?: number | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          listing_type?: string
          price?: number
          price_label?: string | null
          status?: string | null
          property_type?: string
          rating?: number | null
          reviews_count?: number | null
          promoted?: boolean | null
          promoted_until?: string | null
          promotion_plan?: string | null
          size?: string | null
          state?: string | null
          title: string
          updated_at?: string
          user_id: string
          verified?: boolean | null
          video_url?: string | null
          writeup?: string | null
        }
        Update: {
          address?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          agent_title?: string | null
          amenities?: string[] | null
          baths?: number | null
          beds?: number | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          listing_type?: string
          price?: number
          price_label?: string | null
          status?: string | null
          property_type?: string
          rating?: number | null
          reviews_count?: number | null
          promoted?: boolean | null
          promoted_until?: string | null
          promotion_plan?: string | null
          size?: string | null
          state?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          verified?: boolean | null
          video_url?: string | null
          writeup?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      promotion_payments: {
        Row: {
          amount_naira: number
          created_at: string
          id: string
          payment_method: string | null
          payment_reference: string | null
          plan: string
          property_id: string
          screenshot_url: string | null
          status: Database["public"]["Enums"]["promotion_payment_status"]
          user_id: string
        }
        Insert: {
          amount_naira: number
          created_at?: string
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          plan: string
          property_id: string
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["promotion_payment_status"]
          user_id: string
        }
        Update: {
          amount_naira?: number
          created_at?: string
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          plan?: string
          property_id?: string
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["promotion_payment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      landlord_applications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          role_requested: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["landlord_application_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          role_requested?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["landlord_application_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          role_requested?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["landlord_application_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      property_offers: {
        Row: {
          buyer_id: string
          created_at: string
          financing_type: string | null
          id: string
          landlord_id: string
          message: string | null
          offer_amount: number
          phone: string | null
          property_id: string
          status: Database["public"]["Enums"]["property_offer_status"]
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          financing_type?: string | null
          id?: string
          landlord_id: string
          message?: string | null
          offer_amount: number
          phone?: string | null
          property_id: string
          status?: Database["public"]["Enums"]["property_offer_status"]
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          financing_type?: string | null
          id?: string
          landlord_id?: string
          message?: string | null
          offer_amount?: number
          phone?: string | null
          property_id?: string
          status?: Database["public"]["Enums"]["property_offer_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_offers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          booking_type: string
          check_in_date: string
          check_out_date: string | null
          created_at: string
          guest_id: string
          guests_count: number | null
          id: string
          landlord_id: string
          notes: string | null
          phone: string | null
          property_id: string
          requested_term_months: number | null
          status: Database["public"]["Enums"]["booking_request_status"]
          total_quote: number
          updated_at: string
        }
        Insert: {
          booking_type: string
          check_in_date: string
          check_out_date?: string | null
          created_at?: string
          guest_id: string
          guests_count?: number | null
          id?: string
          landlord_id: string
          notes?: string | null
          phone?: string | null
          property_id: string
          requested_term_months?: number | null
          status?: Database["public"]["Enums"]["booking_request_status"]
          total_quote?: number
          updated_at?: string
        }
        Update: {
          booking_type?: string
          check_in_date?: string
          check_out_date?: string | null
          created_at?: string
          guest_id?: string
          guests_count?: number | null
          id?: string
          landlord_id?: string
          notes?: string | null
          phone?: string | null
          property_id?: string
          requested_term_months?: number | null
          status?: Database["public"]["Enums"]["booking_request_status"]
          total_quote?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      protection_cases: {
        Row: {
          category: string
          created_at: string
          details: string | null
          id: string
          landlord_id: string | null
          phone: string | null
          priority: string
          property_id: string | null
          related_booking_id: string | null
          related_offer_id: string | null
          requester_id: string
          resolution_notes: string | null
          status: Database["public"]["Enums"]["protection_case_status"]
          summary: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          details?: string | null
          id?: string
          landlord_id?: string | null
          phone?: string | null
          priority?: string
          property_id?: string | null
          related_booking_id?: string | null
          related_offer_id?: string | null
          requester_id: string
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["protection_case_status"]
          summary: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          details?: string | null
          id?: string
          landlord_id?: string | null
          phone?: string | null
          priority?: string
          property_id?: string | null
          related_booking_id?: string | null
          related_offer_id?: string | null
          requester_id?: string
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["protection_case_status"]
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "protection_cases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_engagement_events: {
        Row: {
          created_at: string
          event_type: Database["public"]["Enums"]["property_engagement_event_type"]
          id: string
          property_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: Database["public"]["Enums"]["property_engagement_event_type"]
          id?: string
          property_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: Database["public"]["Enums"]["property_engagement_event_type"]
          id?: string
          property_id?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_engagement_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_payments: {
        Row: {
          amount_naira: number
          booking_request_id: string | null
          created_at: string
          id: string
          landlord_id: string
          note: string | null
          payer_name: string | null
          payer_phone: string | null
          payment_channel: string
          payment_method: string | null
          payment_reference: string | null
          property_id: string
          release_notes: string | null
          screenshot_url: string | null
          status: Database["public"]["Enums"]["escrow_payment_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_naira: number
          booking_request_id?: string | null
          created_at?: string
          id?: string
          landlord_id: string
          note?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_channel?: string
          payment_method?: string | null
          payment_reference?: string | null
          property_id: string
          release_notes?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["escrow_payment_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_naira?: number
          booking_request_id?: string | null
          created_at?: string
          id?: string
          landlord_id?: string
          note?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_channel?: string
          payment_method?: string | null
          payment_reference?: string | null
          property_id?: string
          release_notes?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["escrow_payment_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_payments_booking_request_id_fkey"
            columns: ["booking_request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      landlord_reviews: {
        Row: {
          booking_request_id: string | null
          created_at: string
          id: string
          landlord_id: string
          property_id: string | null
          rating: number
          review: string | null
          reviewer_id: string
          reviewer_name: string | null
          status: Database["public"]["Enums"]["landlord_review_status"]
          updated_at: string
        }
        Insert: {
          booking_request_id?: string | null
          created_at?: string
          id?: string
          landlord_id: string
          property_id?: string | null
          rating: number
          review?: string | null
          reviewer_id: string
          reviewer_name?: string | null
          status?: Database["public"]["Enums"]["landlord_review_status"]
          updated_at?: string
        }
        Update: {
          booking_request_id?: string | null
          created_at?: string
          id?: string
          landlord_id?: string
          property_id?: string | null
          rating?: number
          review?: string | null
          reviewer_id?: string
          reviewer_name?: string | null
          status?: Database["public"]["Enums"]["landlord_review_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landlord_reviews_booking_request_id_fkey"
            columns: ["booking_request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landlord_reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_dashboard: {
        Row: {
          pending_payments: Json
          pending_applications: Json
          landlords: Json
          admins: Json
          all_users: Json
          application_status_counts: Json
        }
        Insert: never
        Update: never
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "client" | "landlord" | "admin"
      promotion_payment_status: "pending" | "confirmed" | "failed"
      landlord_application_status: "pending" | "approved" | "rejected"
      property_offer_status: "pending" | "accepted" | "rejected" | "withdrawn"
      booking_request_status: "pending" | "confirmed" | "declined" | "cancelled"
      protection_case_status: "open" | "investigating" | "resolved" | "dismissed"
      property_engagement_event_type: "listing_click" | "detail_view"
      escrow_payment_status: "pending" | "confirmed" | "released" | "refunded" | "failed" | "cancelled"
      landlord_review_status: "published" | "hidden"
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
      app_role: ["client", "landlord", "admin"],
      property_offer_status: ["pending", "accepted", "rejected", "withdrawn"],
      booking_request_status: ["pending", "confirmed", "declined", "cancelled"],
      protection_case_status: ["open", "investigating", "resolved", "dismissed"],
      property_engagement_event_type: ["listing_click", "detail_view"],
      escrow_payment_status: ["pending", "confirmed", "released", "refunded", "failed", "cancelled"],
      landlord_review_status: ["published", "hidden"],
    },
  },
} as const
