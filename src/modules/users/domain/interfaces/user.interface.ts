export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  email: string;
  username?: string;
  display_name?: string;
  roles: UserRole[];
  status?: 'active' | 'disabled' | 'pending';
  password_hash?: string;
  student_pin_hash?: string;
  student_pin_lookup?: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}
