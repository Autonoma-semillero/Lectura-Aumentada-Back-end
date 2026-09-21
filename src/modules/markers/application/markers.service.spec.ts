import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongoServerError } from 'mongodb';
import { MARKERS_REPOSITORY } from '../domain/constants/markers.tokens';
import { Marker } from '../domain/interfaces/marker.interface';
import { MarkersService } from './markers.service';

describe('MarkersService', () => {
  const markerId = '507f1f77bcf86cd799439011';
  const creatorId = '507f1f77bcf86cd799439021';

  const markersRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCode: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    setModel: jest.fn(),
    clearModel: jest.fn(),
    archive: jest.fn(),
    existsLearningUnitWithMarkerCode: jest.fn(),
  };

  let service: MarkersService;

  function buildMarker(overrides: Partial<Marker> = {}): Marker {
    return {
      id: markerId,
      code: 'aula3-gato',
      name: 'Marcador Gato',
      status: 'active',
      created_by: creatorId,
      created_at: new Date('2026-09-21T00:00:00.000Z'),
      updated_at: new Date('2026-09-21T00:00:00.000Z'),
      ...overrides,
    };
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    markersRepository.findByCode.mockResolvedValue(null);
    markersRepository.existsLearningUnitWithMarkerCode.mockResolvedValue(false);

    const moduleRef = await Test.createTestingModule({
      providers: [
        MarkersService,
        { provide: MARKERS_REPOSITORY, useValue: markersRepository },
      ],
    }).compile();
    service = moduleRef.get(MarkersService);
  });

  describe('create', () => {
    it('normaliza el código y propaga el autor autenticado', async () => {
      markersRepository.create.mockResolvedValue(buildMarker());

      await service.create(
        { code: '  Aula3-GATO ', name: '  Marcador Gato  ' },
        creatorId,
      );

      expect(markersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'aula3-gato',
          name: 'Marcador Gato',
          status: 'active',
          created_by: creatorId,
        }),
      );
    });

    it('rechaza un código ya presente en el catálogo', async () => {
      markersRepository.findByCode.mockResolvedValue(buildMarker());

      await expect(
        service.create({ code: 'aula3-gato', name: 'Gato' }, creatorId),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(markersRepository.create).not.toHaveBeenCalled();
    });

    it('rechaza un código que ya pertenece a una learning unit', async () => {
      markersRepository.existsLearningUnitWithMarkerCode.mockResolvedValue(
        true,
      );

      await expect(
        service.create(
          { code: 'demo-animales-gato', name: 'Gato' },
          creatorId,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(markersRepository.create).not.toHaveBeenCalled();
    });

    it('traduce el duplicado del índice único a 409', async () => {
      const duplicate = new MongoServerError({ message: 'duplicate key' });
      duplicate.code = 11000;
      markersRepository.create.mockRejectedValue(duplicate);

      await expect(
        service.create({ code: 'aula3-gato', name: 'Gato' }, creatorId),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it.each(['con espacio/barra', '', '-empieza-mal'])(
      'rechaza el código inválido %j',
      async (code) => {
        await expect(
          service.create({ code, name: 'Gato' }, creatorId),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );

    it('rechaza una URL de modelo que no sea https ni ruta absoluta', async () => {
      await expect(
        service.create(
          {
            code: 'aula3-gato',
            name: 'Gato',
            model_3d_url: 'http://cdn.example.com/gato.glb',
          },
          creatorId,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('sella el formato y la fecha del modelo cuando llega en la creación', async () => {
      markersRepository.create.mockResolvedValue(buildMarker());

      await service.create(
        {
          code: 'aula3-gato',
          name: 'Gato',
          model_3d_url: 'https://cdn.example.com/gato.glb',
        },
        creatorId,
      );

      const payload = markersRepository.create.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(payload.model_3d_url).toBe('https://cdn.example.com/gato.glb');
      expect(payload.model_3d_format).toBe('glb');
      expect(payload.model_3d_updated_at).toBeInstanceOf(Date);
    });
  });

  describe('setModel', () => {
    it('sella model_3d_updated_at al registrar el modelo', async () => {
      markersRepository.findById.mockResolvedValue(buildMarker());
      markersRepository.setModel.mockResolvedValue(buildMarker());

      await service.setModel(markerId, {
        model_3d_url: 'https://cdn.example.com/gato.glb',
      });

      expect(markersRepository.setModel).toHaveBeenCalledWith(
        markerId,
        expect.objectContaining({
          model_3d_url: 'https://cdn.example.com/gato.glb',
          model_3d_format: 'glb',
          model_3d_updated_at: expect.any(Date) as Date,
        }),
      );
    });

    it('rechaza registrar un modelo en un marcador archivado', async () => {
      markersRepository.findById.mockResolvedValue(
        buildMarker({ status: 'archived' }),
      );

      await expect(
        service.setModel(markerId, {
          model_3d_url: 'https://cdn.example.com/gato.glb',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(markersRepository.setModel).not.toHaveBeenCalled();
    });
  });

  describe('validación de identificadores', () => {
    it.each(['getById', 'removeModel', 'archive'] as const)(
      'rechaza con 400 un id no-ObjectId en %s',
      async (method) => {
        await expect(service[method]('invalid')).rejects.toBeInstanceOf(
          BadRequestException,
        );
      },
    );

    it('devuelve 404 cuando el marcador no existe', async () => {
      markersRepository.findById.mockResolvedValue(null);
      await expect(service.getById(markerId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('devuelve 404 al buscar por un código inexistente', async () => {
      markersRepository.findByCode.mockResolvedValue(null);
      await expect(service.getByCode('aula3-gato')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  it('archiva en vez de borrar', async () => {
    markersRepository.archive.mockResolvedValue(true);
    await service.archive(markerId);
    expect(markersRepository.archive).toHaveBeenCalledWith(markerId);
  });

  it('aplica un límite por defecto al listar', async () => {
    markersRepository.findAll.mockResolvedValue([]);
    await service.list({});
    expect(markersRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 }),
    );
  });
});
