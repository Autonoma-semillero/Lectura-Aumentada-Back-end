import { Schema } from 'mongoose';
export declare const UserSchema: Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    versionKey: false;
}, {
    created_at: NativeDate;
    activo: boolean;
    nombre: string;
    email: string;
    password_hash: string;
    rol: "student" | "teacher" | "admin";
    institucion?: string | null | undefined;
    grado?: string | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    created_at: NativeDate;
    activo: boolean;
    nombre: string;
    email: string;
    password_hash: string;
    rol: "student" | "teacher" | "admin";
    institucion?: string | null | undefined;
    grado?: string | null | undefined;
}>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    versionKey: false;
}>> & import("mongoose").FlatRecord<{
    created_at: NativeDate;
    activo: boolean;
    nombre: string;
    email: string;
    password_hash: string;
    rol: "student" | "teacher" | "admin";
    institucion?: string | null | undefined;
    grado?: string | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
}>;
