import { Schema } from 'mongoose';
export declare const SessionSchema: Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    versionKey: false;
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}, {
    [x: string]: NativeDate;
    user_id: import("mongoose").Types.ObjectId;
    started_at: NativeDate;
    session_type: "ar_experience" | "app" | "other";
    learning_unit_id?: import("mongoose").Types.ObjectId | null | undefined;
    marker_id?: string | null | undefined;
    status?: "cancelled" | "open" | "closed" | null | undefined;
    ended_at?: NativeDate | null | undefined;
    client_metadata?: any;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    [x: string]: NativeDate;
    user_id: import("mongoose").Types.ObjectId;
    started_at: NativeDate;
    session_type: "ar_experience" | "app" | "other";
    learning_unit_id?: import("mongoose").Types.ObjectId | null | undefined;
    marker_id?: string | null | undefined;
    status?: "cancelled" | "open" | "closed" | null | undefined;
    ended_at?: NativeDate | null | undefined;
    client_metadata?: any;
}>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    versionKey: false;
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}>> & import("mongoose").FlatRecord<{
    [x: string]: NativeDate;
    user_id: import("mongoose").Types.ObjectId;
    started_at: NativeDate;
    session_type: "ar_experience" | "app" | "other";
    learning_unit_id?: import("mongoose").Types.ObjectId | null | undefined;
    marker_id?: string | null | undefined;
    status?: "cancelled" | "open" | "closed" | null | undefined;
    ended_at?: NativeDate | null | undefined;
    client_metadata?: any;
}> & {
    _id: import("mongoose").Types.ObjectId;
}>;
