export interface Asset {
    id: string;
    learning_unit_id: string;
    marker_id: string;
    word: string;
    model_3d?: string;
    audio_pronunciacion?: string;
    language?: string;
    metadata_accessibility?: Record<string, unknown>;
    created_at: Date;
    updated_at: Date;
}
