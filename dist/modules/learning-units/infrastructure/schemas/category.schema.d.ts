import { Schema } from 'mongoose';
export declare const CategorySchema: Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    versionKey: false;
}, {
    created_at: NativeDate;
    nombre: string;
    descripcion?: string | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    created_at: NativeDate;
    nombre: string;
    descripcion?: string | null | undefined;
}>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    versionKey: false;
}>> & import("mongoose").FlatRecord<{
    created_at: NativeDate;
    nombre: string;
    descripcion?: string | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
}>;
