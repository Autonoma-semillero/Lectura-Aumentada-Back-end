import { ForbiddenException } from '@nestjs/common';
import {
  assertCanAccessStudent,
  assertCanManageDoman,
  isSameObjectId,
} from './doman-authorization.util';

describe('doman-authorization.util', () => {
  const studentId = '507f1f77bcf86cd799439011';
  const otherStudentId = '507f1f77bcf86cd799439012';

  describe('isSameObjectId', () => {
    it('compara ignorando el case del hex', () => {
      expect(isSameObjectId(studentId, studentId.toUpperCase())).toBe(true);
    });

    it('es falso para ids distintos', () => {
      expect(isSameObjectId(studentId, otherStudentId)).toBe(false);
    });

    it('falla cerrado cuando alguno no es un ObjectId', () => {
      // Importante: devolver false ante basura hace que los guards denieguen
      // en vez de permitir.
      expect(isSameObjectId('no-es-un-id', studentId)).toBe(false);
      expect(isSameObjectId(studentId, '')).toBe(false);
      expect(isSameObjectId('', '')).toBe(false);
    });
  });

  describe('assertCanAccessStudent', () => {
    it('deja a un estudiante acceder a sus propios recursos', () => {
      expect(() =>
        assertCanAccessStudent(
          { userId: studentId.toUpperCase(), role: 'student' },
          studentId,
        ),
      ).not.toThrow();
    });

    it('impide que un estudiante acceda a los de otro', () => {
      expect(() =>
        assertCanAccessStudent(
          { userId: studentId, role: 'student' },
          otherStudentId,
        ),
      ).toThrow(ForbiddenException);
    });

    it.each(['teacher', 'admin'] as const)(
      'permite a un %s acceder a cualquier estudiante (visibilidad global, intencional)',
      (role) => {
        // Fija el contrato descrito en el helper: el producto da a los docentes
        // visibilidad global sobre estudiantes y acota la propiedad a nivel de
        // grupo. Endurecer esto acá rompería el alta de grupos.
        expect(() =>
          assertCanAccessStudent({ userId: studentId, role }, otherStudentId),
        ).not.toThrow();
      },
    );
  });

  describe('assertCanManageDoman', () => {
    it('bloquea a los estudiantes', () => {
      expect(() =>
        assertCanManageDoman({ userId: studentId, role: 'student' }),
      ).toThrow(ForbiddenException);
    });

    it.each(['teacher', 'admin'] as const)('permite a un %s', (role) => {
      expect(() =>
        assertCanManageDoman({ userId: studentId, role }),
      ).not.toThrow();
    });
  });
});
