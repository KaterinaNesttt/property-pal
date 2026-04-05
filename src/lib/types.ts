export type UserRole = "superadmin" | "owner" | "tenant";
export type PropertyStatus = "free" | "rented" | "maintenance";
export type PaymentStatus = "paid" | "pending" | "overdue";
export type PaymentType = "rent" | "utilities" | "internet" | "other";
export type MeterType = "water" | "gas" | "electricity";
export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "open" | "in_progress" | "done" | "overdue";
export type ThemeMode = "default" | "purple";

export interface BadgePreferences {
  all: boolean;
  properties: boolean;
  tasks: boolean;
  invoices: boolean;
}

export interface UserPreferences {
  themeMode: ThemeMode;
  badgePreferences: BadgePreferences;
  avatarScale: number;
  avatarX: number;
  avatarY: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  avatar?: string | null;
  preferences?: UserPreferences;
  role: UserRole;
  created_at: string;
}

export interface Property {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  type: string;
  status: PropertyStatus;
  rent_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tenant_name?: string | null;
}

export interface Tenant {
  id: string;
  owner_id: string;
  user_id: string | null;
  property_id: string;
  property_name?: string | null;
  full_name: string;
  email: string;
  phone: string;
  lease_start: string;
  lease_end: string;
  monthly_rent: number;
  is_active: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  property_id: string;
  property_name?: string | null;
  tenant_id: string | null;
  tenant_name?: string | null;
  payment_type: PaymentType;
  period_month: string;
  base_amount: number;
  utilities_amount: number;
  total_amount: number;
  due_date: string;
  paid_at: string | null;
  status: PaymentStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Meter {
  id: string;
  property_id: string;
  property_name?: string | null;
  meter_type: MeterType;
  unit: string;
  previous_reading: number;
  current_reading: number;
  tariff: number;
  reading_date: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  property_id: string;
  property_name?: string | null;
  tenant_id: string | null;
  tenant_name?: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  reminder_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ProfileUpdatePayload {
  full_name: string;
  phone: string;
  avatar: string | null;
  preferences: UserPreferences;
}

export interface ApiErrorPayload {
  error: string;
  details?: string;
}
