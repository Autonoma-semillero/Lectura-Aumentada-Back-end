import { Schema } from 'mongoose';
export declare const SessionSchema: Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    versionKey: false;
}, {
    created_at: NativeDate;
    user_id: import("mongoose").Types.ObjectId;
    jwt_token: string;
    expires_at: NativeDate;
    ip?: string | null | undefined;
    device?: string | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    created_at: NativeDate;
    user_id: import("mongoose").Types.ObjectId;
    jwt_token: string;
    expires_at: NativeDate;
    ip?: string | null | undefined;
    device?: string | null | undefined;
}>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    versionKey: false;
}>> & import("mongoose").FlatRecord<{
    created_at: NativeDate;
    user_id: import("mongoose").Types.ObjectId;
    jwt_token: string;
    expires_at: NativeDate;
    ip?: string | null | undefined;
    device?: string | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
}>;
