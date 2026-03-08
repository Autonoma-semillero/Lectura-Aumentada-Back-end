import { Schema } from 'mongoose';
export declare const LearningUnitSchema: Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    versionKey: false;
}, {
    marker_id: string;
    created_at: NativeDate;
    palabra: string;
    categoria_id: import("mongoose").Types.ObjectId;
    estado: "activo" | "inactivo";
    created_by: import("mongoose").Types.ObjectId;
    updated_at: NativeDate;
    assets?: {
        model_3d_url: string;
        audio_url: string;
        imagen_url: string;
    } | null | undefined;
    metadata_accesibilidad?: {
        descripcion_visual: string;
        alt_text: string;
    } | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    marker_id: string;
    created_at: NativeDate;
    palabra: string;
    categoria_id: import("mongoose").Types.ObjectId;
    estado: "activo" | "inactivo";
    created_by: import("mongoose").Types.ObjectId;
    updated_at: NativeDate;
    assets?: {
        model_3d_url: string;
        audio_url: string;
        imagen_url: string;
    } | null | undefined;
    metadata_accesibilidad?: {
        descripcion_visual: string;
        alt_text: string;
    } | null | undefined;
}>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    versionKey: false;
}>> & import("mongoose").FlatRecord<{
    marker_id: string;
    created_at: NativeDate;
    palabra: string;
    categoria_id: import("mongoose").Types.ObjectId;
    estado: "activo" | "inactivo";
    created_by: import("mongoose").Types.ObjectId;
    updated_at: NativeDate;
    assets?: {
        model_3d_url: string;
        audio_url: string;
        imagen_url: string;
    } | null | undefined;
    metadata_accesibilidad?: {
        descripcion_visual: string;
        alt_text: string;
    } | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
}>;
