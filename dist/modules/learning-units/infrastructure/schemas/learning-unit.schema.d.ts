import { Schema } from 'mongoose';
export declare const LearningUnitSchema: Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    versionKey: false;
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}, {
    [x: string]: NativeDate;
    marker_id: string;
    word: string;
    assets: {
        model_3d?: string | null | undefined;
        audio_pronunciacion?: string | null | undefined;
    };
    language?: string | null | undefined;
    metadata_accessibility?: any;
    category_id?: import("mongoose").Types.ObjectId | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    [x: string]: NativeDate;
    marker_id: string;
    word: string;
    assets: {
        model_3d?: string | null | undefined;
        audio_pronunciacion?: string | null | undefined;
    };
    language?: string | null | undefined;
    metadata_accessibility?: any;
    category_id?: import("mongoose").Types.ObjectId | null | undefined;
}>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    versionKey: false;
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}>> & import("mongoose").FlatRecord<{
    [x: string]: NativeDate;
    marker_id: string;
    word: string;
    assets: {
        model_3d?: string | null | undefined;
        audio_pronunciacion?: string | null | undefined;
    };
    language?: string | null | undefined;
    metadata_accessibility?: any;
    category_id?: import("mongoose").Types.ObjectId | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
}>;
