import User from '@/modules/user/models/User';
import { AuthError } from '@readable/auth/errors';
import { principalId } from '@readable/auth/principalId';
import { MiddlewareFn } from '@readable/decorators/middleware/Middleware';
import { ConsoleError } from '../contracts/domain/errors';
import { config } from '@/shared/config';

export const AdminRoute: MiddlewareFn = async (req) => {
    const user = await User.findOne({ where: { id: principalId(req) }, select: { id: true, roles: true } });
    if(user === null) throw AuthError.Unauthorized();
    if(!user.roles.includes(config.console.role)) throw ConsoleError.NotAdmin();
};
