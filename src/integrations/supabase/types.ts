export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      educator_profiles: {
        Row: {
          about_business: string | null
          address: string | null
          ai_chatbot: Json | null
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
          name: string
          phone: string | null
          subscription_tier: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
          website: string | null
          youtube_url: string | null
        }
        Insert: {
          about_business?: string | null
          address?: string | null
          ai_chatbot?: Json | null
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
          name: string
          phone?: string | null
          subscription_tier?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          website?: string | null
          youtube_url?: string | null
        }
        Update: {
          about_business?: string | null
          address?: string | null
          ai_chatbot?: Json | null
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
          name?: string
          phone?: string | null
          subscription_tier?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          website?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      educator_profiles_duplicate: {
        Row: {
          about_business: string | null
          address: string | null
          ai_chatbot: Json | null
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
          name: string
          phone: string | null
          subscription_tier: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
          website: string | null
          youtube_url: string | null
        }
        Insert: {
          about_business?: string | null
          address?: string | null
          ai_chatbot?: Json | null
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
          name: string
          phone?: string | null
          subscription_tier?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          website?: string | null
          youtube_url?: string | null
        }
        Update: {
          about_business?: string | null
          address?: string | null
          ai_chatbot?: Json | null
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
          name?: string
          phone?: string | null
          subscription_tier?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          website?: string | null
          youtube_url?: string | null
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
      student_profiles: {
        Row: {
          address: string | null
          created_at: string
          email: string
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
          id?: string
          is_active?: boolean | null
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_profiles_duplicate: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
