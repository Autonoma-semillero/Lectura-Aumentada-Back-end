export type AudienceSource =
  | { type: 'direct' }
  | { type: 'group'; group_id: string };

export type ResolvedAudienceStudent = {
  student_id: string;
  sources: AudienceSource[];
};

export type ResolvedAudience = {
  student_ids: string[];
  students: ResolvedAudienceStudent[];
};
