import { ForbiddenException } from '@nestjs/common';
import { isMongoObjectId } from '../../../common/utils/object-id';
import { DomanRequester } from '../domain/types/doman-requester.type';

export function isSameObjectId(left: string, right: string): boolean {
  return (
    isMongoObjectId(left) &&
    isMongoObjectId(right) &&
    left.toLowerCase() === right.toLowerCase()
  );
}

/**
 * Restringe el acceso a recursos Doman de un estudiante.
 *
 * Solo acota a los propios estudiantes: docentes y administradores acceden a
 * cualquier estudiante, Y ESO ES INTENCIONAL. El modelo del producto da a los
 * docentes visibilidad global sobre estudiantes —`GroupsService.searchAudience`
 * les deja buscar cualquier estudiante del sistema para sumarlo a un grupo— y
 * acota la propiedad recién a nivel de grupo (`Teachers can only manage their
 * own student groups`).
 *
 * No agregar acá un chequeo de "el estudiante pertenece a un grupo del
 * docente": rompería el alta de grupos y el panel docente. Si el producto
 * llegara a querer esa restricción, es un cambio de alcance con su propia
 * decisión, no un endurecimiento silencioso de este helper.
 */
export function assertCanAccessStudent(
  requester: DomanRequester,
  studentId: string,
): void {
  if (requester.role === 'student' && !isSameObjectId(requester.userId, studentId)) {
    throw new ForbiddenException('Students can only access their own Doman resources');
  }
}

export function assertCanManageDoman(requester: DomanRequester): void {
  if (requester.role === 'student') {
    throw new ForbiddenException('Only teachers and administrators can manage Doman resources');
  }
}
