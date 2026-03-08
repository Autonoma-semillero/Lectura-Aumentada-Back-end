import { Schema } from 'mongoose';
export declare const ProgressLogSchema: Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    versionKey: false;
}, {
    learning_unit_id: import("mongoose").Types.ObjectId;
    marker_id: string;
    student_id: import("mongoose").Types.ObjectId;
    resultado: "correcto" | "incorrecto" | "no_detectado";
    tiempo_respuesta_ms: number;
    fecha: NativeDate;
    dispositivo?: string | null | undefined;
    ip?: string | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    learning_unit_id: import("mongoose").Types.ObjectId;
    marker_id: string;
    student_id: import("mongoose").Types.ObjectId;
    resultado: "correcto" | "incorrecto" | "no_detectado";
    tiempo_respuesta_ms: number;
    fecha: NativeDate;
    dispositivo?: string | null | undefined;
    ip?: string | null | undefined;
}>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    versionKey: false;
}>> & import("mongoose").FlatRecord<{
    learning_unit_id: import("mongoose").Types.ObjectId;
    marker_id: string;
    student_id: import("mongoose").Types.ObjectId;
    resultado: "correcto" | "incorrecto" | "no_detectado";
    tiempo_respuesta_ms: number;
    fecha: NativeDate;
    dispositivo?: string | null | undefined;
    ip?: string | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
}>;
