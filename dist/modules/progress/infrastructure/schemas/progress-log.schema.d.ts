import { Schema } from 'mongoose';
export declare const ProgressLogSchema: Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    versionKey: false;
    timestamps: {
        createdAt: string;
        updatedAt: false;
    };
}, {
    [x: string]: NativeDate;
    user_id: import("mongoose").Types.ObjectId;
    action: string;
    ts: NativeDate;
    learning_unit_id?: import("mongoose").Types.ObjectId | null | undefined;
    session_id?: import("mongoose").Types.ObjectId | null | undefined;
    payload?: any;
    device?: string | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    [x: string]: NativeDate;
    user_id: import("mongoose").Types.ObjectId;
    action: string;
    ts: NativeDate;
    learning_unit_id?: import("mongoose").Types.ObjectId | null | undefined;
    session_id?: import("mongoose").Types.ObjectId | null | undefined;
    payload?: any;
    device?: string | null | undefined;
}>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    versionKey: false;
    timestamps: {
        createdAt: string;
        updatedAt: false;
    };
}>> & import("mongoose").FlatRecord<{
    [x: string]: NativeDate;
    user_id: import("mongoose").Types.ObjectId;
    action: string;
    ts: NativeDate;
    learning_unit_id?: import("mongoose").Types.ObjectId | null | undefined;
    session_id?: import("mongoose").Types.ObjectId | null | undefined;
    payload?: any;
    device?: string | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
}>;
