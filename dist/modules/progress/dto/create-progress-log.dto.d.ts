export declare class CreateProgressLogDto {
    student_id: string;
    learning_unit_id: string;
    marker_id: string;
    resultado: 'correcto' | 'incorrecto' | 'no_detectado';
    tiempo_respuesta_ms: number;
    dispositivo?: string;
    ip?: string;
}
