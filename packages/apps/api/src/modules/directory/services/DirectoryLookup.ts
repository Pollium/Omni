import OAuthAccount from '@/modules/auth/models/OAuthAccount';
import User from '@/modules/user/models/User';
import UserDirectory from '@/modules/user/services/UserDirectory';
import UserService from '@/modules/user/services/account/User';
import RoleService from '@/modules/user/services/Roles';
import { findOrThrow } from '@readable/utils/models/find-or-throw';
import { countPerDay } from '@readable/utils/models/day-series';
import { tableRef } from '@readable/utils/models/table-ref';
import { DirectoryAccount, DirectoryCensus, DirectoryUser } from '@omni/contracts/directory/domain';
import { PublicUserSummary } from '@omni/contracts/user/domain';
import { DirectoryError } from '../contracts/domain/errors';
import { UserError } from '@/modules/user/contracts/domain/errors';
import { config } from '@/shared/config';
import { ArrayContains, FindOptionsWhere, ILike, Not } from 'typeorm';

interface MethodRow{
    method: string;
    total: string;
}

interface SourceRow{
    source: string;
    campaign: string | null;
    total: string;
}

export default class DirectoryLookup{
    #directory = new UserDirectory();
    #accounts = new UserService();
    #roles = new RoleService();

    async user(userId: string): Promise<DirectoryUser>{
        return this.#asDirectoryUser(await findOrThrow(User, { id: userId }, UserError.NotFound));
    }

    async users(): Promise<DirectoryUser[]>{
        const rows = await User.find({ order: { id: 'ASC' } });

        return rows.map((user) => this.#asDirectoryUser(user));
    }

    async search(q: string, withoutRole: string): Promise<DirectoryUser[]>{
        const scope: FindOptionsWhere<User> = withoutRole === ''
            ? {}
            : { roles: Not(ArrayContains([withoutRole])) };
        const pattern = ILike(`%${q}%`);
        const where = q === ''
            ? scope
            : [
                {
                    ...scope,
                    fullName: pattern
                },
                {
                    ...scope,
                    username: pattern
                },
                {
                    ...scope,
                    email: pattern
                }
            ];

        const rows = await User.find({
            where,
            order: { fullName: 'ASC' },
            take: config.directory.searchLimit
        });

        return rows.map((user) => this.#asDirectoryUser(user));
    }

    async account(userId: string): Promise<DirectoryAccount>{
        const user = await findOrThrow(User, { id: userId }, UserError.NotFound);
        const linked = await OAuthAccount.find({ where: { userId }, order: { createdAt: 'ASC' } });

        return {
            phone: user.phone,
            emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
            providers: linked.map((account) => account.provider)
        };
    }

    async byUsername(username: string): Promise<DirectoryUser>{
        const user = await User.createQueryBuilder('user')
            .where('LOWER(user.username) = :username', { username: username.trim().toLowerCase() })
            .getOne();
        if(user === null) throw UserError.NotFound();

        return this.#asDirectoryUser(user);
    }

    summaries(userIds: string[]): Promise<PublicUserSummary[]>{
        return this.#directory.summaries(userIds);
    }

    async census(rawDays: string | undefined): Promise<DirectoryCensus>{
        const days = this.#censusDays(rawDays);
        const manager = User.getRepository().manager;
        const users = tableRef(manager, User);
        const accounts = tableRef(manager, OAuthAccount);

        const [total, signups, methods, sources] = await Promise.all([
            User.count(),
            countPerDay(User, 'createdAt', days),
            manager.query<MethodRow[]>(`
                SELECT 'password'::text AS method, COUNT(*) AS total
                FROM ${users.table}
                WHERE "passwordHash" IS NOT NULL
                UNION ALL
                SELECT provider::text AS method, COUNT(DISTINCT "userId") AS total
                FROM ${accounts.table}
                GROUP BY provider
            `),
            manager.query<SourceRow[]>(`
                SELECT "signupSource" AS source, "signupCampaign" AS campaign, COUNT(*) AS total
                FROM ${users.table}
                WHERE "signupSource" IS NOT NULL
                GROUP BY 1, 2
                ORDER BY total DESC
                LIMIT 20
            `)
        ]);

        return {
            total,
            signups,
            methods: methods
                .map((row) => ({
                    method: row.method,
                    count: Number(row.total)
                }))
                .filter((row) => row.count > 0),
            sources: sources.map((row) => ({
                source: row.source,
                campaign: row.campaign,
                count: Number(row.total)
            }))
        };
    }

    async holders(role: string): Promise<DirectoryUser[]>{
        const rows = await this.#roles.holders(role);

        return rows.map((user) => this.#asDirectoryUser(user));
    }

    async grant(userId: string, role: string): Promise<DirectoryUser>{
        return this.#asDirectoryUser(await this.#roles.grant(userId, role));
    }

    async revoke(userId: string, role: string): Promise<DirectoryUser>{
        return this.#asDirectoryUser(await this.#roles.revoke(userId, role));
    }

    remove(userId: string){
        return this.#accounts.deleteProfile(userId);
    }

    #censusDays(raw: string | undefined): number{
        const days = Number(raw);
        if(!Number.isSafeInteger(days) || days < 1 || days > config.directory.maxCensusDays) throw DirectoryError.InvalidCensusRange();

        return days;
    }

    #asDirectoryUser(user: User): DirectoryUser{
        return {
            id: user.id,
            fullName: user.fullName,
            username: user.username,
            email: user.email,
            bio: user.bio,
            avatarUrl: user.avatarUrl,
            roles: user.roles,
            activeOrgId: user.activeOrgId,
            createdAt: user.createdAt.toISOString(),
            signupSource: user.signupSource,
            signupCampaign: user.signupCampaign,
            hasPassword: user.passwordHash !== null
        };
    }
}
