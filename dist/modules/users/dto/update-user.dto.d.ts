export declare class UpdateUserDto {
    display_name?: string;
    email?: string;
    password_hash?: string;
    roles?: string[];
    status?: 'active' | 'disabled' | 'pending';
    metadata?: Record<string, unknown>;
}
