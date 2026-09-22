import { Connection, Types } from 'mongoose';
import { DailyPlansRepository } from './daily-plans.repository';

describe('DailyPlansRepository', () => {
  const studentId = '507f1f77bcf86cd799439011';
  const categoryId = '507f1f77bcf86cd799439021';
  const planDate = new Date('2026-09-09T00:00:00.000Z');

  function createRepository() {
    const findOne = jest.fn().mockResolvedValue(null);
    const connection = Object.create(null) as Connection;
    Object.defineProperty(connection, 'db', {
      value: {
        collection: jest.fn().mockReturnValue({ findOne }),
      },
    });
    return { repository: new DailyPlansRepository(connection), findOne };
  }

  it('incluye category_id cuando busca un plan temático del día', async () => {
    const { repository, findOne } = createRepository();

    await repository.findByStudentAndPlanDate(studentId, planDate, categoryId);

    expect(findOne).toHaveBeenCalledWith({
      student_id: new Types.ObjectId(studentId),
      plan_date: planDate,
      category_id: new Types.ObjectId(categoryId),
      $or: [
        { study_plan_id: { $exists: false } },
        { study_plan_id: null },
      ],
    });
  });

  it('aísla la búsqueda por plan de estudio cuando está presente', async () => {
    const { repository, findOne } = createRepository();
    const studyPlanId = '507f1f77bcf86cd799439031';

    await repository.findByStudentAndPlanDate(
      studentId,
      planDate,
      categoryId,
      studyPlanId,
    );

    expect(findOne).toHaveBeenCalledWith({
      student_id: new Types.ObjectId(studentId),
      plan_date: planDate,
      category_id: new Types.ObjectId(categoryId),
      study_plan_id: new Types.ObjectId(studyPlanId),
    });
  });

  it('no consulta Mongo cuando category_id es inválido', async () => {
    const { repository, findOne } = createRepository();

    await repository.findByStudentAndPlanDate(studentId, planDate, 'invalid');

    expect(findOne).not.toHaveBeenCalled();
  });

  it('no consulta Mongo cuando study_plan_id es inválido', async () => {
    const { repository, findOne } = createRepository();

    await repository.findByStudentAndPlanDate(
      studentId,
      planDate,
      categoryId,
      'invalid',
    );

    expect(findOne).not.toHaveBeenCalled();
  });
});
