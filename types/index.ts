export type UserRole =
  | 'admin'
  | 'supervisor'
  | 'operational'
  | 'enfermeiro'
  | 'fisioterapeuta'
  | 'psicologo'
  | 'nutricionista'
  | 'cozinheiro'
  | 'limpeza'
  | 'multiprofessional' // legado — mantido para compatibilidade com dados existentes
export type DependencyLevel = 'independent' | 'semi' | 'dependent' | 'bedridden'
export type ShiftType = 'morning' | 'evening' | 'night' | 'all'
export type StepType = 'photo' | 'video' | 'checkbox' | 'conditional' | 'timed'
export type ExecutionStatus = 'pending' | 'in_progress' | 'completed' | 'late' | 'incomplete'

export interface Resident {
  id: string
  // Identificação
  name: string
  nickname: string | null
  birth_date: string | null
  nationality: string | null
  naturalness: string | null       // cidade/estado de origem
  // Documentos
  cpf: string | null
  rg: string | null
  rg_issuer: string | null         // ex: SSP/SP
  rg_issue_date: string | null
  // Alojamento
  room_number: string
  admission_date: string | null
  contract_number: string | null
  // Nível de cuidado
  dependency_level: DependencyLevel
  is_bedridden: boolean
  // Responsável legal
  responsible_name: string | null
  responsible_relationship: string | null  // ex: Filho(a), Cônjuge
  responsible_cpf: string | null
  responsible_phone: string | null
  responsible_email: string | null
  responsible_address: string | null
  // Informações médicas
  doctor_name: string | null
  doctor_crm: string | null
  health_insurance: string | null
  health_insurance_number: string | null
  diagnoses: string | null         // CIDs / diagnósticos livres
  allergies: string | null
  medications: string | null       // medicamentos em uso
  // Outros
  notes: string | null
  photo_url: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  active: boolean
}

export interface POP {
  id: string
  name: string
  role_type: UserRole
  shift_type: ShiftType
  start_time_expected: string | null
  deadline_time: string | null
  tolerance_minutes: number
  active: boolean
  version: number
  created_at: string
}

export interface POPBlock {
  id: string
  pop_id: string
  name: string
  order_index: number
  start_time_expected: string | null
  deadline_time: string | null
  tolerance_minutes: number
  depends_on: string | null
  steps?: POPStep[]
}

export interface POPStep {
  id: string
  block_id: string
  order_index: number
  title: string
  description: string | null
  type: StepType
  is_mandatory: boolean
  condition_text: string | null
  active_days: number[] | null
  has_time_limit: boolean
  step_deadline_minutes: number | null
}

export interface Execution {
  id: string
  pop_id: string
  resident_id: string
  user_id: string
  shift_id: string | null
  started_at: string
  completed_at: string | null
  status: ExecutionStatus
  geo_lat: number | null
  geo_lng: number | null
  created_at: string
  steps?: ExecutionStep[]
}

export interface ExecutionStep {
  id: string
  execution_id: string
  pop_step_id: string
  status: 'pending' | 'completed' | 'skipped'
  completed_at: string | null
  notes: string | null
  created_at: string
  media?: MediaFile[]
}

export interface MediaFile {
  id: string
  execution_step_id: string
  type: 'photo' | 'video'
  storage_path: string
  captured_at: string
  file_size_bytes: number | null
  duration_seconds: number | null
}

export interface Alert {
  id: string
  type: 'pop_not_started' | 'step_late' | 'checkout_missing' | 'incident'
  execution_id: string | null
  resident_id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  triggered_at: string
  acknowledged_by: string | null
  acknowledged_at: string | null
}

export interface Shift {
  id: string
  date: string
  type: ShiftType
  started_at: string | null
  ended_at: string | null
}

export interface ResidentPOPAssignment {
  id: string
  resident_id: string
  pop_id: string
  active: boolean
  created_at: string
  resident?: Resident
  pop?: POP
}

export interface POPStaffRotation {
  id: string
  pop_id: string
  user_id: string
  order_index: number
  last_assigned_date: string | null
  active: boolean
  created_at: string
  user?: UserProfile
}

export interface ShiftHandover {
  id: string
  shift_from_id: string
  shift_to_id: string | null
  user_from_id: string
  user_to_id: string | null
  notes: string
  media_url: string | null
  recorded_at: string
}
