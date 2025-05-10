import { db } from '@/lib/db';
import { ServiceErrorCode, ServiceResult } from '@/types';
import { FetchedUser } from '@/types/user.type';
import { serviceUtils } from '@/utils';
import { userValidation } from '@/validation';

export async function getUser(id: string): Promise<ServiceResult<FetchedUser>> {
  const user = await db.user.findUnique({
    where: { id },
    omit: { password: true, googleId: true },
  });

  if (!user) {
    return serviceUtils.createErrorResult('User not found', ServiceErrorCode.NotFound);
  }

  return serviceUtils.createSuccessResult('User fetched', userValidation.fetchedUser.parse(user));
}
