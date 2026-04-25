export declare class CreateUserDto {
    email: string;
    display_name?: string;
    password_hash: string;
    roles?: string[];
    status?: 'active' | 'disabled' | 'pending';
    metadata?: Record<string, unknown>;
}
