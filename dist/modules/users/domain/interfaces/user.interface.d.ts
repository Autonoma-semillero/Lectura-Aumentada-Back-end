export interface User {
    id: string;
    email: string;
    display_name?: string;
    roles: string[];
    status?: 'active' | 'disabled' | 'pending';
    password_hash?: string;
    metadata?: Record<string, unknown>;
    created_at: Date;
    updated_at: Date;
}
