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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          mode: string | null
          role: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          mode?: string | null
          role: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          mode?: string | null
          role?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_recommendations: {
        Row: {
          content: Json
          created_at: string
          id: string
          type: string | null
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          type?: string | null
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_user_memory: {
        Row: {
          category: string
          confidence: number | null
          created_at: string
          id: string
          key: string
          memory_type: string
          source: string | null
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          category: string
          confidence?: number | null
          created_at?: string
          id?: string
          key: string
          memory_type?: string
          source?: string | null
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          category?: string
          confidence?: number | null
          created_at?: string
          id?: string
          key?: string
          memory_type?: string
          source?: string | null
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          badge_emoji: string
          badge_name: string
          badge_type: string
          description: string | null
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_emoji?: string
          badge_name: string
          badge_type: string
          description?: string | null
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_emoji?: string
          badge_name?: string
          badge_type?: string
          description?: string | null
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      behavioral_snapshots: {
        Row: {
          ai_notes: string | null
          avg_session_length: number | null
          burnout_risk: number | null
          consistency_score: number | null
          created_at: string
          emotional_signals: Json | null
          id: string
          motivation_score: number | null
          sessions_count: number | null
          sessions_skipped: number | null
          snapshot_date: string
          study_minutes: number | null
          subjects_studied: Json | null
          user_id: string
        }
        Insert: {
          ai_notes?: string | null
          avg_session_length?: number | null
          burnout_risk?: number | null
          consistency_score?: number | null
          created_at?: string
          emotional_signals?: Json | null
          id?: string
          motivation_score?: number | null
          sessions_count?: number | null
          sessions_skipped?: number | null
          snapshot_date?: string
          study_minutes?: number | null
          subjects_studied?: Json | null
          user_id: string
        }
        Update: {
          ai_notes?: string | null
          avg_session_length?: number | null
          burnout_risk?: number | null
          consistency_score?: number | null
          created_at?: string
          emotional_signals?: Json | null
          id?: string
          motivation_score?: number | null
          sessions_count?: number | null
          sessions_skipped?: number | null
          snapshot_date?: string
          study_minutes?: number | null
          subjects_studied?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          display_name: string | null
          group_id: string
          id: string
          joined_at: string
          role: string
          total_xp: number
          user_id: string
          weekly_minutes: number
        }
        Insert: {
          display_name?: string | null
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          total_xp?: number
          user_id: string
          weekly_minutes?: number
        }
        Update: {
          display_name?: string | null
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          total_xp?: number
          user_id?: string
          weekly_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string
          created_at: string
          display_name: string | null
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          display_name?: string | null
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          display_name?: string | null
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          folder: string | null
          id: string
          pinned: boolean
          session_id: string | null
          subject_id: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          folder?: string | null
          id?: string
          pinned?: boolean
          session_id?: string | null
          subject_id?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          folder?: string | null
          id?: string
          pinned?: boolean
          session_id?: string | null
          subject_id?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      performance_logs: {
        Row: {
          completion_rate: number | null
          created_at: string
          date: string
          id: string
          streak_count: number | null
          subjects_studied: Json | null
          total_minutes: number | null
          user_id: string
        }
        Insert: {
          completion_rate?: number | null
          created_at?: string
          date: string
          id?: string
          streak_count?: number | null
          subjects_studied?: Json | null
          total_minutes?: number | null
          user_id: string
        }
        Update: {
          completion_rate?: number | null
          created_at?: string
          date?: string
          id?: string
          streak_count?: number | null
          subjects_studied?: Json | null
          total_minutes?: number | null
          user_id?: string
        }
        Relationships: []
      }
      plan_items: {
        Row: {
          duration_minutes: number | null
          end_time: string | null
          id: string
          plan_id: string
          sort_order: number | null
          start_time: string | null
          status: string | null
          subject_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          plan_id: string
          sort_order?: number | null
          start_time?: string | null
          status?: string | null
          subject_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          plan_id?: string
          sort_order?: number | null
          start_time?: string | null
          status?: string | null
          subject_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          date: string
          id: string
          is_ai_generated: boolean | null
          plan_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_ai_generated?: boolean | null
          plan_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_ai_generated?: boolean | null
          plan_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          average_grades: number | null
          avg_daily_study_hours: number | null
          best_study_time: string | null
          biggest_challenge: string | null
          biggest_fear: string | null
          city: string | null
          color_theme: string | null
          created_at: string
          current_gpa: number | null
          current_semester: number | null
          daily_hours: number | null
          display_name: string | null
          education_level: string | null
          exam_date: string | null
          field_of_study: string | null
          fixed_commitments: Json | null
          gender: string | null
          goal_timeline: string | null
          grade_level: string | null
          id: string
          konkur_year: number | null
          last_exam_rank: number | null
          learning_style: string | null
          main_goal: string | null
          motivation_reason: string | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          plan_adherence: number | null
          planning_experience: string | null
          preferred_tone: string | null
          reminder_intensity: string | null
          reminder_type: string | null
          semester_credits: number | null
          study_environment: string | null
          subject_priorities: Json | null
          target_gpa: number | null
          target_rank: number | null
          university_major: string | null
          updated_at: string
          user_id: string
          weekly_schedule: Json | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          average_grades?: number | null
          avg_daily_study_hours?: number | null
          best_study_time?: string | null
          biggest_challenge?: string | null
          biggest_fear?: string | null
          city?: string | null
          color_theme?: string | null
          created_at?: string
          current_gpa?: number | null
          current_semester?: number | null
          daily_hours?: number | null
          display_name?: string | null
          education_level?: string | null
          exam_date?: string | null
          field_of_study?: string | null
          fixed_commitments?: Json | null
          gender?: string | null
          goal_timeline?: string | null
          grade_level?: string | null
          id?: string
          konkur_year?: number | null
          last_exam_rank?: number | null
          learning_style?: string | null
          main_goal?: string | null
          motivation_reason?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          plan_adherence?: number | null
          planning_experience?: string | null
          preferred_tone?: string | null
          reminder_intensity?: string | null
          reminder_type?: string | null
          semester_credits?: number | null
          study_environment?: string | null
          subject_priorities?: Json | null
          target_gpa?: number | null
          target_rank?: number | null
          university_major?: string | null
          updated_at?: string
          user_id: string
          weekly_schedule?: Json | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          average_grades?: number | null
          avg_daily_study_hours?: number | null
          best_study_time?: string | null
          biggest_challenge?: string | null
          biggest_fear?: string | null
          city?: string | null
          color_theme?: string | null
          created_at?: string
          current_gpa?: number | null
          current_semester?: number | null
          daily_hours?: number | null
          display_name?: string | null
          education_level?: string | null
          exam_date?: string | null
          field_of_study?: string | null
          fixed_commitments?: Json | null
          gender?: string | null
          goal_timeline?: string | null
          grade_level?: string | null
          id?: string
          konkur_year?: number | null
          last_exam_rank?: number | null
          learning_style?: string | null
          main_goal?: string | null
          motivation_reason?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          plan_adherence?: number | null
          planning_experience?: string | null
          preferred_tone?: string | null
          reminder_intensity?: string | null
          reminder_type?: string | null
          semester_credits?: number | null
          study_environment?: string | null
          subject_priorities?: Json | null
          target_gpa?: number | null
          target_rank?: number | null
          university_major?: string | null
          updated_at?: string
          user_id?: string
          weekly_schedule?: Json | null
        }
        Relationships: []
      }
      resources: {
        Row: {
          created_at: string
          id: string
          subject_id: string
          title: string
          type: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subject_id: string
          title: string
          type?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subject_id?: string
          title?: string
          type?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      session_edits: {
        Row: {
          action: string
          after: Json | null
          before: Json | null
          changed_fields: Json | null
          created_at: string
          id: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          after?: Json | null
          before?: Json | null
          changed_fields?: Json | null
          created_at?: string
          id?: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          after?: Json | null
          before?: Json | null
          changed_fields?: Json | null
          created_at?: string
          id?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      study_groups: {
        Row: {
          created_at: string
          description: string | null
          emoji: string
          field_of_study: string | null
          id: string
          invite_code: string
          is_public: boolean | null
          max_members: number | null
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string
          field_of_study?: string | null
          id?: string
          invite_code?: string
          is_public?: boolean | null
          max_members?: number | null
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string
          field_of_study?: string | null
          id?: string
          invite_code?: string
          is_public?: boolean | null
          max_members?: number | null
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          client_session_id: string | null
          completed: boolean | null
          created_at: string
          deleted_at: string | null
          duration_minutes: number
          duration_seconds: number
          edited_at: string | null
          ended_at: string | null
          id: string
          mode: string
          notes: string | null
          productivity_rating: number | null
          quality: string | null
          session_type: string | null
          source: string
          started_at: string
          subject_id: string | null
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          client_session_id?: string | null
          completed?: boolean | null
          created_at?: string
          deleted_at?: string | null
          duration_minutes?: number
          duration_seconds: number
          edited_at?: string | null
          ended_at?: string | null
          id?: string
          mode?: string
          notes?: string | null
          productivity_rating?: number | null
          quality?: string | null
          session_type?: string | null
          source?: string
          started_at?: string
          subject_id?: string | null
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          client_session_id?: string | null
          completed?: boolean | null
          created_at?: string
          deleted_at?: string | null
          duration_minutes?: number
          duration_seconds?: number
          edited_at?: string | null
          ended_at?: string | null
          id?: string
          mode?: string
          notes?: string | null
          productivity_rating?: number | null
          quality?: string | null
          session_type?: string | null
          source?: string
          started_at?: string
          subject_id?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          importance_weight: number | null
          name: string
          strength_level: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          importance_weight?: number | null
          name: string
          strength_level?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          importance_weight?: number | null
          name?: string
          strength_level?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string | null
          completed: boolean | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          parent_task_id: string | null
          position: number
          priority: string | null
          recurrence: string
          subject_id: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          parent_task_id?: string | null
          position?: number
          priority?: string | null
          recurrence?: string
          subject_id?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          parent_task_id?: string | null
          position?: number
          priority?: string | null
          recurrence?: string
          subject_id?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_xp: {
        Row: {
          created_at: string
          id: string
          last_study_date: string | null
          level: number
          streak_days: number
          total_study_minutes: number
          updated_at: string
          user_id: string
          xp_points: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_study_date?: string | null
          level?: number
          streak_days?: number
          total_study_minutes?: number
          updated_at?: string
          user_id: string
          xp_points?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_study_date?: string | null
          level?: number
          streak_days?: number
          total_study_minutes?: number
          updated_at?: string
          user_id?: string
          xp_points?: number
        }
        Relationships: []
      }
      weekly_challenges: {
        Row: {
          challenge_type: string
          completed: boolean
          created_at: string
          current_value: number
          id: string
          target_value: number
          user_id: string
          week_start: string
          xp_reward: number
        }
        Insert: {
          challenge_type: string
          completed?: boolean
          created_at?: string
          current_value?: number
          id?: string
          target_value: number
          user_id: string
          week_start: string
          xp_reward?: number
        }
        Update: {
          challenge_type?: string
          completed?: boolean
          created_at?: string
          current_value?: number
          id?: string
          target_value?: number
          user_id?: string
          week_start?: string
          xp_reward?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
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
