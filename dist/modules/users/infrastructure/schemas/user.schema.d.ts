import { Schema } from 'mongoose';
export declare const UserSchema: Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    versionKey: false;
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}, {
    [x: string]: NativeDate;
    email: string;
    roles: string[];
    display_name?: string | null | undefined;
    status?: "active" | "disabled" | "pending" | null | undefined;
    password_hash?: string | null | undefined;
    metadata?: any;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    [x: string]: NativeDate;
    email: string;
    roles: string[];
    display_name?: string | null | undefined;
    status?: "active" | "disabled" | "pending" | null | undefined;
    password_hash?: string | null | undefined;
    metadata?: any;
}>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    versionKey: false;
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}>> & import("mongoose").FlatRecord<{
    [x: string]: NativeDate;
    email: string;
    roles: string[];
    display_name?: string | null | undefined;
    status?: "active" | "disabled" | "pending" | null | undefined;
    password_hash?: string | null | undefined;
    metadata?: any;
}> & {
    _id: import("mongoose").Types.ObjectId;
}>;
