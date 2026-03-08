export interface LearningUnit {
    id: string;
    palabra: string;
    categoria_id: string;
    marker_id: string;
    assets: {
        model_3d_url: string;
        audio_url: string;
        imagen_url: string;
    };
    metadata_accesibilidad: {
        descripcion_visual: string;
        alt_text: string;
    };
    estado: 'activo' | 'inactivo';
    created_by: string;
    created_at: Date;
    updated_at: Date;
}
