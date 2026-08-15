import type { Role, CareNoteType, DiagnosisStatus } from '@prisma/client'

export type { Role, CareNoteType, DiagnosisStatus }

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
  openAlerts: number
}

export interface AIResponse<T> {
  success: boolean
  data?: T
  error?: string
}
