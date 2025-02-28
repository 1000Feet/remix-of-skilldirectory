export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      reviews: {
        Row: {
          id: string
          educator_id: string
          student_id: string
          rating: number
          review_text: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          educator_id: string
          student_id: string
          rating: number
          review_text: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          educator_id?: string
          student_id?: string
          rating?: number
          review_text?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_educator_id_fkey"
            columns: ["educator_id"]
            referencedRelation: "educator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_student_id_fkey"
            columns: ["student_id"]
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      student_profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      educator_profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          image: string | null
          categories: string[]
          created_at: string
          is_active: boolean
          is_featured: boolean
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          image?: string | null
          categories?: string[]
          created_at?: string
          is_active?: boolean
          is_featured?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          image?: string | null
          categories?: string[]
          created_at?: string
          is_active?: boolean
          is_featured?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "educator_profiles_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
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
