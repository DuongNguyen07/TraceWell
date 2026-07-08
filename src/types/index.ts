import type { Role, NoteType, AlertType, AlertSeverity } from '@prisma/client'

export type { Role, NoteType, AlertType, AlertSeverity }

export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
}

export interface PatientSummary {
  id: string
  name: string
  ward?: string
  roomNumber?: string
  latestHealthRecord?: {
    mood?: number
    energyLevel?: number
    symptoms: string[]
    recordedAt: Date
  }
  openAlerts: number
}

export interface HealthRecordInput {
  symptoms?: string[]
  mood?: number
  sleepHours?: number
  energyLevel?: number
  painLevel?: number
  notes?: string
}

export interface NursingNoteInput {
  patientProfileId: string
  type: NoteType
  rawContent: string
  audioUrl?: string
}

export interface AIResponse<T> {
  success: boolean
  data?: T
  error?: string
}
