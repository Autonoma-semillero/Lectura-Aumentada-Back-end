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
