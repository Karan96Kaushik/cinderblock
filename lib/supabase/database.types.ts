import type { AppSettings } from '@/lib/settings'
import type { ActivePlanPayload } from '@/lib/active-plan'
import type { TrainingLogsBackup } from '@/lib/training-backup'

export type UserSettingsRow = {
  user_id: string
  settings: AppSettings
  updated_at: string
}

export type UserActivePlanRow = {
  user_id: string
  plan: ActivePlanPayload
  updated_at: string
}

export type UserBackupRow = {
  id: string
  user_id: string
  device_id: string
  payload: TrainingLogsBackup
  label: string | null
  created_at: string
}

export type UserTrainingLogRow = {
  user_id: string
  device_id: string
  payload: TrainingLogsBackup
  updated_at: string
}

export type AiChatReportRow = {
  id: string
  user_id: string | null
  created_at: string
  chat_history: unknown
  plaintext_draft: string | null
  running_summary: string | null
  json_attempts: unknown
  validator_errors: unknown
  schema_version: string | null
}

export type Database = {
  public: {
    Tables: {
      user_settings: {
        Row: UserSettingsRow
        Insert: {
          user_id: string
          settings: AppSettings
          updated_at?: string
        }
        Update: {
          settings?: AppSettings
          updated_at?: string
        }
        Relationships: []
      }
      user_active_plan: {
        Row: UserActivePlanRow
        Insert: {
          user_id: string
          plan: ActivePlanPayload
          updated_at?: string
        }
        Update: {
          plan?: ActivePlanPayload
          updated_at?: string
        }
        Relationships: []
      }
      user_backups: {
        Row: UserBackupRow
        Insert: {
          id?: string
          user_id: string
          device_id: string
          payload: TrainingLogsBackup
          label?: string | null
          created_at?: string
        }
        Update: {
          payload?: TrainingLogsBackup
          label?: string | null
          device_id?: string
        }
        Relationships: []
      }
      user_training_logs: {
        Row: UserTrainingLogRow
        Insert: {
          user_id: string
          device_id: string
          payload: TrainingLogsBackup
          updated_at?: string
        }
        Update: {
          payload?: TrainingLogsBackup
          updated_at?: string
        }
        Relationships: []
      }
      ai_chat_reports: {
        Row: AiChatReportRow
        Insert: {
          id?: string
          user_id?: string | null
          created_at?: string
          chat_history?: unknown
          plaintext_draft?: string | null
          running_summary?: string | null
          json_attempts?: unknown
          validator_errors?: unknown
          schema_version?: string | null
        }
        Update: {
          chat_history?: unknown
          plaintext_draft?: string | null
          running_summary?: string | null
          json_attempts?: unknown
          validator_errors?: unknown
          schema_version?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
