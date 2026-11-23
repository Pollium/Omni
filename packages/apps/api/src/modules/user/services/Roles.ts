import User from '../models/User';
import { findOrThrow } from '@readable/utils/models/find-or-throw';
import { DirectoryError } from '@/modules/directory/contracts/domain/errors';
import { UserError } from '../contracts/domain/errors';
import { config } from '@/shared/config';
import { ArrayContains } from 'typeorm';

export default class RoleService{
    holders(role: string): Promise<User[]>{
        this.#assertRole(role);

        return User.find({
            where: { roles: ArrayContains([role]) },
            order: { createdAt: 'ASC' }
        });
    }

    async grant(userId: string, role: string): Promise<User>{
        this.#assertRole(role);
        await this.#require(userId);

        await User.createQueryBuilder()
            .update()
            .set({ roles: () => 'array_append("roles", :role)' })
            .where('id = :userId AND NOT (:role = ANY("roles"))', { userId, role })
            .execute();

        return this.#require(userId);
    }

    async revoke(userId: string, role: string): Promise<User>{
        this.#assertRole(role);
        await this.#require(userId);

        await User.createQueryBuilder()
            .update()
            .set({ roles: () => 'array_remove("roles", :role)' })
            .where('id = :userId', { userId, role })
            .execute();

        return this.#require(userId);
    }

    #assertRole(role: string){
        if(!config.roles.pattern.test(role)) throw DirectoryError.InvalidRole();
    }

    #require(userId: string): Promise<User>{
        return findOrThrow(User, { id: userId }, UserError.NotFound);
    }
}
