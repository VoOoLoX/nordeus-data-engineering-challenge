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
      logins: {
        Row: {
          event_id: number
          timestamp: string
          user_id: string
        }
        Insert: {
          event_id: number
          timestamp?: string
          user_id: string
        }
        Update: {
          event_id?: number
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["user_id"]
          }
        ]
      }
      logouts: {
        Row: {
          event_id: number
          timestamp: string
          user_id: string
        }
        Insert: {
          event_id: number
          timestamp?: string
          user_id: string
        }
        Update: {
          event_id?: number
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["user_id"]
          }
        ]
      }
      registrations: {
        Row: {
          country: string
          device_os: string
          event_id: number
          marketing_campaign: string | null
          name: string
          timestamp: string
          user_id: string
        }
        Insert: {
          country: string
          device_os: string
          event_id: number
          marketing_campaign?: string | null
          name: string
          timestamp?: string
          user_id?: string
        }
        Update: {
          country?: string
          device_os?: string
          event_id?: number
          marketing_campaign?: string | null
          name?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          duration: number
          end_date: string
          session_id: number
          start_date: string
          user_id: string
        }
        Insert: {
          duration: number
          end_date: string
          session_id?: number
          start_date: string
          user_id: string
        }
        Update: {
          duration?: number
          end_date?: string
          session_id?: number
          start_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["user_id"]
          }
        ]
      }
      transactions: {
        Row: {
          amount: number
          event_id: number
          timestamp: string
          user_id: string
        }
        Insert: {
          amount: number
          event_id: number
          timestamp?: string
          user_id: string
        }
        Update: {
          amount?: number
          event_id?: number
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["user_id"]
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
