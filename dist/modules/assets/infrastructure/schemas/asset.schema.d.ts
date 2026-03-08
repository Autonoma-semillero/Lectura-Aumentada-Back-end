import { Schema } from 'mongoose';
export declare const AssetSchema: Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    versionKey: false;
}, {
    learning_unit_id: import("mongoose").Types.ObjectId;
    model_3d_url: string;
    audio_url: string;
    image_url: string;
    marker_id: string;
    created_at: NativeDate;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    learning_unit_id: import("mongoose").Types.ObjectId;
    model_3d_url: string;
    audio_url: string;
    image_url: string;
    marker_id: string;
    created_at: NativeDate;
}>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    versionKey: false;
}>> & import("mongoose").FlatRecord<{
    learning_unit_id: import("mongoose").Types.ObjectId;
    model_3d_url: string;
    audio_url: string;
    image_url: string;
    marker_id: string;
    created_at: NativeDate;
}> & {
    _id: import("mongoose").Types.ObjectId;
}>;
