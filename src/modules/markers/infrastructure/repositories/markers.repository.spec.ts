import { Connection, Types } from 'mongoose';
import { MarkersRepository } from './markers.repository';

describe('MarkersRepository', () => {
  const markerId = '507f1f77bcf86cd799439011';
  const creatorId = '507f1f77bcf86cd799439021';

  function createRepository() {
    const toArray = jest.fn().mockResolvedValue([]);
    const limit = jest.fn().mockReturnValue({ toArray });
    const sort = jest.fn().mockReturnValue({ toArray, limit });
    const find = jest.fn().mockReturnValue({ sort });
    const findOne = jest.fn().mockResolvedValue(null);
    const findOneAndUpdate = jest.fn().mockResolvedValue(null);
    const updateOne = jest.fn().mockResolvedValue({ matchedCount: 1 });
    const insertOne = jest.fn();

    const markers = { find, findOne, findOneAndUpdate, updateOne, insertOne };
    const learningUnits = {
      findOne: jest.fn().mockResolvedValue(null),
      updateOne: jest.fn(),
      insertOne: jest.fn(),
    };

    const collection = jest.fn((name: string) =>
      name === 'learning_units' ? learningUnits : markers,
    );
    const connection = Object.create(null) as Connection;
    Object.defineProperty(connection, 'db', { value: { collection } });

    return {
      repository: new MarkersRepository(connection),
      markers,
      learningUnits,
      find,
      sort,
      limit,
      findOne,
      findOneAndUpdate,
      updateOne,
    };
  }

  it('no consulta Mongo cuando el id no es un ObjectId', async () => {
    const { repository, findOne } = createRepository();
    await expect(repository.findById('invalid')).resolves.toBeNull();
    expect(findOne).not.toHaveBeenCalled();
  });

  it('filtra por estado y por presencia de modelo 3D, y ordena por código', async () => {
    const { repository, find, sort, limit } = createRepository();
    await repository.findAll({ status: 'active', with_model: true, limit: 10 });
    expect(find).toHaveBeenCalledWith({
      status: 'active',
      model_3d_url: { $exists: true, $ne: '' },
    });
    expect(sort).toHaveBeenCalledWith({ code: 1, _id: 1 });
    expect(limit).toHaveBeenCalledWith(10);
  });

  it('filtra los marcadores sin modelo cuando with_model es false', async () => {
    const { repository, find } = createRepository();
    await repository.findAll({ with_model: false });
    expect(find).toHaveBeenCalledWith({
      model_3d_url: { $exists: false },
    });
  });

  it('escapa la búsqueda por código para no inyectar regex', async () => {
    const { repository, find } = createRepository();
    await repository.findAll({ q: 'demo.a+' });
    expect(find).toHaveBeenCalledWith({
      code: { $regex: 'demo\\.a\\+', $options: 'i' },
    });
  });

  it('consulta learning_units en solo lectura para detectar códigos ocupados', async () => {
    const { repository, learningUnits } = createRepository();
    learningUnits.findOne.mockResolvedValue({ _id: new Types.ObjectId() });

    await expect(
      repository.existsLearningUnitWithMarkerCode('demo-animales-gato'),
    ).resolves.toBe(true);

    expect(learningUnits.findOne).toHaveBeenCalledWith(
      { marker_id: 'demo-animales-gato' },
      { projection: { _id: 1 } },
    );
    expect(learningUnits.updateOne).not.toHaveBeenCalled();
    expect(learningUnits.insertOne).not.toHaveBeenCalled();
  });

  it('borra el modelo con $unset y no con $set null', async () => {
    const { repository, findOneAndUpdate } = createRepository();
    await repository.clearModel(markerId);

    const [, update] = findOneAndUpdate.mock.calls[0] as [
      unknown,
      Record<string, Record<string, unknown>>,
    ];
    expect(update.$unset).toEqual({
      model_3d_url: '',
      model_3d_format: '',
      model_3d_updated_at: '',
    });
    expect(update.$set).not.toHaveProperty('model_3d_url');
  });

  it('archiva sin borrar el documento', async () => {
    const { repository, updateOne } = createRepository();
    await expect(repository.archive(markerId)).resolves.toBe(true);

    const [, update] = updateOne.mock.calls[0] as [
      unknown,
      { $set: Record<string, unknown> },
    ];
    expect(update.$set.status).toBe('archived');
  });

  it('mapea el documento a la entidad con los ObjectId en hexadecimal', async () => {
    const { repository, findOne } = createRepository();
    const now = new Date('2026-09-21T00:00:00.000Z');
    findOne.mockResolvedValue({
      _id: new Types.ObjectId(markerId),
      code: 'aula3-gato',
      name: 'Marcador Gato',
      status: 'active',
      created_by: new Types.ObjectId(creatorId),
      created_at: now,
      updated_at: now,
    });

    await expect(repository.findById(markerId)).resolves.toEqual({
      id: markerId,
      code: 'aula3-gato',
      name: 'Marcador Gato',
      description: undefined,
      model_3d_url: undefined,
      model_3d_format: undefined,
      model_3d_updated_at: undefined,
      status: 'active',
      created_by: creatorId,
      created_at: now,
      updated_at: now,
    });
  });
});
