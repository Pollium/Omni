import Invitation from '@/modules/invitations/models/Invitation';
import User from '@/modules/user/models/User';
import DirectoryLookup from '@/modules/directory/services/DirectoryLookup';
import ConsoleUsers from './ConsoleUsers';
import { ConsoleOverview as Overview } from '@omni/contracts/console/domain';
import { InvitationStatus } from '@omni/contracts/invitation/domain';
import { ConsoleError } from '../contracts/domain/errors';
import { config } from '@/shared/config';
import { IsNull, LessThanOrEqual, MoreThan, Not } from 'typeorm';

export default class ConsoleOverview{
    #directory = new DirectoryLookup();
    #users = new ConsoleUsers();

    async get(rawDays: string | undefined): Promise<Overview>{
        const days = Number(rawDays);
        if(!Number.isSafeInteger(days) || days < 1 || days > config.console.maxDays) throw ConsoleError.InvalidFilter();

        const now = new Date();
        const [census, verified, pendingInvitations, expiredInvitations, recent] = await Promise.all([
            this.#directory.census(String(days * 2)),
            User.countBy({ emailVerifiedAt: Not(IsNull()) }),
            Invitation.countBy({ status: InvitationStatus.Pending, expiresAt: MoreThan(now) }),
            Invitation.countBy({ status: InvitationStatus.Pending, expiresAt: LessThanOrEqual(now) }),
            User.find({ order: { createdAt: 'DESC', id: 'DESC' }, take: config.console.recentUsers })
        ]);

        return {
            total: census.total,
            verified,
            signups: census.signups,
            methods: census.methods,
            pendingInvitations,
            expiredInvitations,
            recent: await this.#users.present(recent)
        };
    }
}
