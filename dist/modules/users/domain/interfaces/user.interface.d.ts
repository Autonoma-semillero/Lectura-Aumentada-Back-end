export interface User {
    id: string;
    nombre: string;
    email: string;
    password_hash: string;
    rol: 'student' | 'teacher' | 'admin';
    institucion?: string;
    grado?: string;
    activo: boolean;
    created_at: Date;
}
