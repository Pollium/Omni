import OAuthAccount from '@/modules/auth/models/OAuthAccount';
import OrganizationMembership from '@/modules/organizations/models/OrganizationMembership';
import TeamMembership from '@/modules/teams/models/TeamMembership';
import User from '@/modules/user/models/User';
import { Page } from '@readable/contracts/params';
import { findOrThrow } from '@readable/utils/models/find-or-throw';
import { ConsoleMember, ConsoleUser, ConsoleUserCounts, ConsoleUserDetail, ConsoleUserPage, ConsoleUserView, SignInMethod } from '@omni/contracts/console/domain';
import { OAuthProvider } from '@omni/contracts/auth/domain';
import { ConsoleError } from '../contracts/domain/errors';
import { UserError } from '@/modules/user/contracts/domain/errors';
import { Brackets, In, SelectQueryBuilder } from 'typeorm';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const VIEWS: readonly ConsoleUserView[] = ['all', 'roles', 'unverified', 'week'];
const METHODS: readonly SignInMethod[] = ['google', 'microsoft', 'github', 'password'];

interface CountRow{
    all: string;
    roles: string;
    unverified: string;
    week: string;
}

interface UserFilter{
    q: string;
    view: string | undefined;
    method: string | undefined;
}

interface TeamCountRow{
    teamId: string;
    members: string;
}

export default class ConsoleUsers{
    async member(userId: string): Promise<ConsoleMember>{
        const user = await findOrThrow(User, { id: userId }, UserError.NotFound);

        return {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            avatarUrl: user.avatarUrl
        };
    }

    async list(filter: UserFilter, page: Page): Promise<ConsoleUserPage>{
        const query = this.#filtered(filter)
            .orderBy('user.createdAt', 'DESC')
            .addOrderBy('user.id', 'DESC')
            .skip(page.offset)
            .take(page.limit);
        const [users, total] = await query.getManyAndCount();

        return {
            users: await this.present(users),
            total
        };
    }

    async counts(): Promise<ConsoleUserCounts>{
        const row = await User.createQueryBuilder('user')
            .select('COUNT(*)', 'all')
            .addSelect('COUNT(*) FILTER (WHERE cardinality(user.roles) > 0)', 'roles')
            .addSelect('COUNT(*) FILTER (WHERE user.emailVerifiedAt IS NULL)', 'unverified')
            .addSelect('COUNT(*) FILTER (WHERE user.createdAt >= :since)', 'week')
            .setParameter('since', new Date(Date.now() - WEEK_MS))
            .getRawOne<CountRow>();

        return {
            all: Number(row?.all ?? 0),
            roles: Number(row?.roles ?? 0),
            unverified: Number(row?.unverified ?? 0),
            week: Number(row?.week ?? 0)
        };
    }

    async detail(userId: string): Promise<ConsoleUserDetail>{
        const user = await findOrThrow(User, { id: userId }, UserError.NotFound);
        const [[summary], organizations, memberships] = await Promise.all([
            this.present([user]),
            OrganizationMembership.find({ where: { userId }, relations: { org: true }, order: { createdAt: 'ASC' } }),
            TeamMembership.find({ where: { userId }, relations: { team: true }, order: { createdAt: 'ASC' } })
        ]);
        const sizes = await this.#teamSizes(memberships.map((membership) => membership.teamId));

        return {
            ...summary,
            bio: user.bio,
            phone: user.phone,
            signupCampaign: user.signupCampaign,
            emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
            organizations: organizations.map((membership) => membership.org.name),
            teams: memberships.map((membership) => ({
                id: membership.teamId,
                name: membership.team.name,
                role: membership.role,
                members: sizes.get(membership.teamId) ?? 1,
                joinedAt: membership.createdAt.toISOString()
            }))
        };
    }

    async present(users: User[]): Promise<ConsoleUser[]>{
        const accounts = users.length === 0 ? [] : await OAuthAccount.find({
            where: { userId: In(users.map((user) => user.id)) },
            order: { createdAt: 'ASC' }
        });

        return users.map((user) => ({
            id: user.id,
            fullName: user.fullName,
            username: user.username,
            email: user.email,
            avatarUrl: user.avatarUrl,
            roles: user.roles,
            methods: [
                ...accounts.filter((account) => account.userId === user.id).map((account) => account.provider as OAuthProvider),
                ...(user.passwordHash === null ? [] : ['password' as const])
            ],
            verified: user.emailVerifiedAt !== null,
            signupSource: user.signupSource,
            createdAt: user.createdAt.toISOString()
        }));
    }

    #filtered({ q, view = 'all', method }: UserFilter): SelectQueryBuilder<User>{
        if(!VIEWS.includes(view as ConsoleUserView)) throw ConsoleError.InvalidFilter();
        if(method !== undefined && !METHODS.includes(method as SignInMethod)) throw ConsoleError.InvalidFilter();

        const query = User.createQueryBuilder('user');
        if(view === 'roles') query.andWhere('cardinality(user.roles) > 0');
        if(view === 'unverified') query.andWhere('user.emailVerifiedAt IS NULL');
        if(view === 'week') query.andWhere('user.createdAt >= :since', { since: new Date(Date.now() - WEEK_MS) });
        if(method === 'password') query.andWhere('user.passwordHash IS NOT NULL');
        if(method !== undefined && method !== 'password'){
            query.andWhere((outer) => `EXISTS ${outer.subQuery()
                .select('1')
                .from(OAuthAccount, 'account')
                .where('account.userId = user.id')
                .andWhere('account.provider = :method')
                .getQuery()}`, { method });
        }
        if(q !== ''){
            const pattern = `%${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
            query.andWhere(new Brackets((where) => where
                .where('user.fullName ILIKE :pattern', { pattern })
                .orWhere('user.email ILIKE :pattern', { pattern })
                .orWhere('user.username ILIKE :pattern', { pattern })));
        }

        return query;
    }

    async #teamSizes(teamIds: string[]): Promise<Map<string, number>>{
        if(teamIds.length === 0) return new Map();

        const rows = await TeamMembership.createQueryBuilder('membership')
            .select('membership.teamId', 'teamId')
            .addSelect('COUNT(*)', 'members')
            .where('membership.teamId IN (:...teamIds)', { teamIds })
            .groupBy('membership.teamId')
            .getRawMany<TeamCountRow>();

        return new Map(rows.map((row) => [row.teamId, Number(row.members)]));
    }
}
