import { BadRequestException } from '@nestjs/common';

/** Normaliza `plan_date` al inicio del día UTC (criterio de `ux_daily_plan_student_date`). */
export function planDateToUtcMidnight(isoDate: string): Date {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException('Invalid plan_date');
  }
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}
