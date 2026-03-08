export type AuthPayload = {
    userId: string;
    email: string;
    role: 'student' | 'teacher' | 'admin';
};
export type AuthTokens = {
    accessToken: string;
    refreshToken?: string;
};
