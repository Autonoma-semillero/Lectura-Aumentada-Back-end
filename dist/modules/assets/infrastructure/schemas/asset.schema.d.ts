import { Schema } from 'mongoose';
export declare const LearningUnitEmbeddedAssetsSchema: Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    _id: false;
}, {
    model_3d?: string | null | undefined;
    audio_pronunciacion?: string | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    model_3d?: string | null | undefined;
    audio_pronunciacion?: string | null | undefined;
}>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    _id: false;
}>> & import("mongoose").FlatRecord<{
    model_3d?: string | null | undefined;
    audio_pronunciacion?: string | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
