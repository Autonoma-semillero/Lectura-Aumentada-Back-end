export type AuthPayload = {
  userId: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
};

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

export type SessionUser = {
  id: string;
  email: string;
  display_name?: string;
  roles: string[];
  status?: 'active' | 'disabled' | 'pending';
};

export type LoginResult = {
  accessToken: string;
  user: SessionUser;
};
