import { Schema } from 'mongoose';
export declare const CategorySchema: Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    versionKey: false;
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}, {
    [x: string]: NativeDate;
    name: string;
    slug: string;
    description?: string | null | undefined;
    parent_id?: import("mongoose").Types.ObjectId | null | undefined;
    sort_order?: number | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    [x: string]: NativeDate;
    name: string;
    slug: string;
    description?: string | null | undefined;
    parent_id?: import("mongoose").Types.ObjectId | null | undefined;
    sort_order?: number | null | undefined;
}>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    versionKey: false;
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}>> & import("mongoose").FlatRecord<{
    [x: string]: NativeDate;
    name: string;
    slug: string;
    description?: string | null | undefined;
    parent_id?: import("mongoose").Types.ObjectId | null | undefined;
    sort_order?: number | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
}>;
