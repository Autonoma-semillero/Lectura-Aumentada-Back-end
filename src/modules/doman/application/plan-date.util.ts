import { BadRequestException } from '@nestjs/common';

export const DOMAN_PLAN_TIME_ZONE = 'America/Bogota';

const bogotaDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: DOMAN_PLAN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Normaliza `plan_date` al inicio del día UTC usado por los índices de planes. */
export function planDateToUtcMidnight(isoDate: string): Date {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException('Invalid plan_date');
  }
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

/**
 * Obtiene la fecha calendario actual de Bogotá y la persiste como medianoche
 * UTC, que es la representación canónica usada por `doman_daily_plans`.
 */
export function todayPlanDateUtcMidnight(now: Date = new Date()): Date {
  if (Number.isNaN(now.getTime())) {
    throw new BadRequestException('Invalid current date');
  }

  const parts = bogotaDateFormatter.formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) {
    throw new BadRequestException('Unable to resolve current date');
  }

  return planDateToUtcMidnight(`${year}-${month}-${day}`);
}
