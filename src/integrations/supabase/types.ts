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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          id: number
          key: string | null
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          key?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          key?: string | null
          value?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          display_order: number | null
          icon_name: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          icon_name: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          icon_name?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          deleted_at: string | null
          id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      educator_profiles: {
        Row: {
          about_business: string | null
          address: string | null
          ai_chatbot: string | null
          ai_voice_agent: Json | null
          categories: string[] | null
          created_at: string
          description: string | null
          email: string
          facebook_url: string | null
          id: string
          image: string | null
          instagram_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          last_active: string | null
          name: string
          phone: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
          website: string | null
          youtube_url: string | null
        }
        Insert: {
          about_business?: string | null
          address?: string | null
          ai_chatbot?: string | null
          ai_voice_agent?: Json | null
          categories?: string[] | null
          created_at?: string
          description?: string | null
          email: string
          facebook_url?: string | null
          id?: string
          image?: string | null
          instagram_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          last_active?: string | null
          name: string
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          website?: string | null
          youtube_url?: string | null
        }
        Update: {
          about_business?: string | null
          address?: string | null
          ai_chatbot?: string | null
          ai_voice_agent?: Json | null
          categories?: string[] | null
          created_at?: string
          description?: string | null
          email?: string
          facebook_url?: string | null
          id?: string
          image?: string | null
          instagram_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          last_active?: string | null
          name?: string
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          website?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      environment_variables: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_encrypted: boolean | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_encrypted?: boolean | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_encrypted?: boolean | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      field_permissions: {
        Row: {
          created_at: string
          id: number
          permissions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: number
          permissions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      lesson_requests: {
        Row: {
          created_at: string
          educator_id: string
          educator_profile_id: string
          id: string
          message: string | null
          message_from_educator: string | null
          proposed_date: string
          proposed_time: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          educator_id: string
          educator_profile_id: string
          id?: string
          message?: string | null
          message_from_educator?: string | null
          proposed_date: string
          proposed_time?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          educator_id?: string
          educator_profile_id?: string
          id?: string
          message?: string | null
          message_from_educator?: string | null
          proposed_date?: string
          proposed_time?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_requests_business_profile_id_fkey"
            columns: ["educator_profile_id"]
            isOneToOne: false
            referencedRelation: "educator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_requests_educator_id_fkey"
            columns: ["educator_id"]
            isOneToOne: false
            referencedRelation: "educator_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lesson_requests_educator_profile_id_fkey"
            columns: ["educator_profile_id"]
            isOneToOne: false
            referencedRelation: "educator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      membership_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          membership_id: string
          metadata: Json | null
          payment_date: string
          payment_method: string
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          membership_id: string
          metadata?: Json | null
          payment_date?: string
          payment_method: string
          status: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          membership_id?: string
          metadata?: Json | null
          payment_date?: string
          payment_method?: string
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          auto_renew: boolean
          created_at: string
          current_period_end: string
          current_period_start: string
          educator_id: string
          end_date: string | null
          id: string
          metadata: Json | null
          start_date: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          current_period_end: string
          current_period_start?: string
          educator_id: string
          end_date?: string | null
          id?: string
          metadata?: Json | null
          start_date?: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          educator_id?: string
          end_date?: string | null
          id?: string
          metadata?: Json | null
          start_date?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_educator_id_fkey"
            columns: ["educator_id"]
            isOneToOne: false
            referencedRelation: "educator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_views: {
        Row: {
          educator_profile_id: string
          id: string
          ip_address: string | null
          viewed_at: string | null
          viewer_id: string | null
        }
        Insert: {
          educator_profile_id: string
          id?: string
          ip_address?: string | null
          viewed_at?: string | null
          viewer_id?: string | null
        }
        Update: {
          educator_profile_id?: string
          id?: string
          ip_address?: string | null
          viewed_at?: string | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_educator_profile_id_fkey"
            columns: ["educator_profile_id"]
            isOneToOne: false
            referencedRelation: "educator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          review_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: string
          review_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          review_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_reactions_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_replies: {
        Row: {
          created_at: string
          id: string
          reply_text: string
          review_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          reply_text: string
          review_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          reply_text?: string
          review_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string | null
          educator_id: string
          id: string
          rating: number
          review_text: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          educator_id: string
          id?: string
          rating: number
          review_text?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          educator_id?: string
          id?: string
          rating?: number
          review_text?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_educator_id_fkey"
            columns: ["educator_id"]
            isOneToOne: false
            referencedRelation: "educator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          id: string
          metadata: Json | null
          payment_method: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_email: string
          customer_name: string
          id: string
          metadata?: Json | null
          payment_method: string
          status: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          id?: string
          metadata?: Json | null
          payment_method?: string
          status?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          address: string | null
          created_at: string
          email: string
          favorites: Json | null
          id: string
          is_active: boolean | null
          name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email: string
          favorites?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string
          favorites?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_submissions: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          issue_type: string
          last_name: string
          message: string
          reference_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          issue_type: string
          last_name: string
          message: string
          reference_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          issue_type?: string
          last_name?: string
          message?: string
          reference_id?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_environment_variables: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          key: string | null
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          key?: string | null
          updated_at?: string | null
          value?: never
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          key?: string | null
          updated_at?: string | null
          value?: never
        }
        Relationships: []
      }
    }
    Functions: {
      get_config_value: { Args: { config_key: string }; Returns: string }
      get_environment_variables: { Args: never; Returns: Json[] }
      get_profile_view_count: {
        Args: { educator_id: string }
        Returns: {
          last_24h_views: number
          total_views: number
          unique_views: number
        }[]
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
    }
    Enums: {
      service_status: "draft" | "published" | "archived"
      user_type: "student" | "educator"
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
      service_status: ["draft", "published", "archived"],
      user_type: ["student", "educator"],
    },
  },
} as const
