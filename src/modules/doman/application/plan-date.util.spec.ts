import { BadRequestException } from '@nestjs/common';
import { planDateToUtcMidnight, todayPlanDateUtcMidnight } from './plan-date.util';

describe('plan date utilities', () => {
  describe('planDateToUtcMidnight', () => {
    it('normaliza una fecha calendario a medianoche UTC', () => {
      expect(planDateToUtcMidnight('2026-09-08')).toEqual(new Date('2026-09-08T00:00:00.000Z'));
    });
  });

  describe('todayPlanDateUtcMidnight', () => {
    it('conserva el día anterior de Bogotá antes de las 05:00 UTC', () => {
      expect(todayPlanDateUtcMidnight(new Date('2026-09-08T04:59:59.999Z'))).toEqual(
        new Date('2026-09-07T00:00:00.000Z'),
      );
    });

    it('cambia de día al llegar la medianoche de Bogotá', () => {
      expect(todayPlanDateUtcMidnight(new Date('2026-09-08T05:00:00.000Z'))).toEqual(
        new Date('2026-09-08T00:00:00.000Z'),
      );
    });

    it('rechaza una fecha actual inválida', () => {
      expect(() => todayPlanDateUtcMidnight(new Date('invalid'))).toThrow(BadRequestException);
    });
  });
});
