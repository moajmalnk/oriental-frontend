/**
 * Type definitions for Oriental College Application
 */

export interface Admin {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: "super_admin" | "admin" | "moderator";
  created_at: string;
}

export interface Student {
  id?: number;
  Name: string;
  RegiNo: string;
  Course: string;
  Batch: Batch;
  CertificateNumber: string;
  Result: string;
  Email: string;
  Phone: string;
  WhatsApp?: string | null;
  Photo?: string | null;
  CourseType: string;
  Subjects: SubjectMark[];
  PublishedDate?: string | null;
  // Legacy fields for backward compatibility
  name?: string;
  email?: string;
  phone?: string;
  whatsapp_number?: string | null;
  photo?: string | null;
  created_at?: string;
}

export interface StudentFormData {
  name: string;
  email: string;
  phone: string;
  whatsapp_number?: string | null;
  photo?: File | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: Admin | null;
  isLoading: boolean;
  error: string | null;
}

export interface Subject {
  id?: number;
  name: string;
  te_max?: number | null;
  ce_max?: number | null;
  pe_max?: number | null;
  pw_max?: number | null;
  theory_total?: number | null;
  practical_total?: number | null;
  overall_total?: number | null;
}

export interface Course {
  id?: number;
  name: string;
  short_code: string;
  duration_months?: number | null;
  subjects: Subject[];
  created_at?: string;
  updated_at?: string;
}

export interface CourseFormData {
  name: string;
  short_code: string;
  duration_months?: number | null;
  subjects: Subject[];
}

export interface Batch {
  id?: number;
  name: string;
  start_date: string;
  duration_months?: number | null;
  course: number; // Course ID
  course_name?: string; // For display purposes
  created_at?: string;
}

export interface BatchFormData {
  name: string;
  start_date: string;
  duration_months?: number | null;
  course: number;
}

export interface StudentMark {
  id?: number;
  subject: number; // Subject ID
  subject_name?: string; // For display purposes
  te_obtained?: number | null;
  ce_obtained?: number | null;
  pe_obtained?: number | null;
  pw_obtained?: number | null;
  theory_total?: number | null;
  practical_total?: number | null;
  overall_obtained?: number | null;
}

export interface SubjectMark {
  SubjectName: string;
  TE?: number | null;
  CE?: number | null;
  PE?: number | null;
  PW?: number | null;
  TheoryTotal?: number | null;
  PracticalTotal?: number | null;
  OverallObtained?: number | null;
  SubjectType: "Theory" | "Practical";
  // Maximum scores from subject configuration
  TE_Max?: number | null;
  CE_Max?: number | null;
  PE_Max?: number | null;
  PW_Max?: number | null;
  TheoryTotal_Max?: number | null;
  PracticalTotal_Max?: number | null;
  OverallTotal_Max?: number | null;
}

export interface StudentResult {
  id?: number;
  student: number; // Student ID
  student_name?: string; // For display purposes
  course: number; // Course ID
  course_name?: string; // For display purposes
  batch: number; // Batch ID
  batch_name?: string; // For display purposes
  register_number: string;
  certificate_number: string;
  result?: string | null;
  marks: StudentMark[];
  created_at?: string;
  updated_at?: string;
  is_published?: boolean;
  published_date?: string | null;
}

export interface StudentResultFormData {
  student: number;
  course: number;
  batch: number;
  register_number: string;
  certificate_number: string;
  result?: string | null;
  marks: StudentMark[];
  is_published?: boolean;
  published_date?: string | null;
}

export interface Announcement {
  id?: number;
  message: string;
  is_active: boolean;
  expires_by: string;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  created_by_name?: string; // For display purposes
}

export interface AnnouncementFormData {
  message: string;
  is_active: boolean;
  expires_by: string;
}

export interface Workshop {
  id?: number;
  name: string;
  duration_days: number;
  start_date: string;
  end_date?: string | null;
  place: string;
  description: string;
  // Dynamic Signatory Fields (formerly Chief Trainer)
  chief_trainer_title?: string | null;
  chief_trainer_name?: string | null;
  // Logo
  logo?: string | null;
  logo_url?: string | null;
  // Certificate customization colors
  background_color: string;
  center_background_color?: string;
  border_color: string;
  title_color: string;
  name_color: string;
  text_color: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkshopFormData {
  name: string;
  duration_days: number;
  start_date: string;
  end_date?: string | null;
  place: string;
  description: string;
  // Dynamic Signatory Fields
  chief_trainer_title?: string;
  chief_trainer_name?: string;
  logo?: File | null;
  background_color: string;
  center_background_color?: string;
  border_color: string;
  title_color: string;
  name_color: string;
  text_color: string;
}

// Workshop Participant types - completely separate from Student system
export interface Participant {
  id?: number;
  name: string;
  email: string;
  phone: string;
  gender: "male" | "female" | "other";
  address?: string | null;
  participant_type: "kug_student" | "external";
  workshops: number[]; // Workshop IDs
  workshop_details?: Workshop[]; // For display
  created_at?: string;
  updated_at?: string;
}

export interface ParticipantFormData {
  name: string;
  email: string;
  phone: string;
  gender: "male" | "female" | "other";
  address?: string | null;
  participant_type: "kug_student" | "external";
  workshops: number[];
}

// Legacy types for backward compatibility
export type { Student as LegacyStudent };