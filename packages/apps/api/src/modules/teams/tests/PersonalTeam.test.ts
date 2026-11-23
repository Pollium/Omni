import Team from '../models/Team';
import TeamMembership from '../models/TeamMembership';
import TeamService from '../services/Team';
import { TeamRole } from '@omni/contracts/team/domain';
import { defaultOrganizationId } from '@/modules/organizations/services/DefaultOrganization';
import { userSeed } from '@/modules/user/tests/UserSeed';
import { deliveries, useApp, useWebhooks } from '@tests/harness';
import { describe, expect, it } from 'vitest';

describe('TeamService.createPersonal', () => {
    useApp();
    useWebhooks();

    it('creates one personal team, announced once, however many times it is asked', async () => {
        const user = await userSeed.user();
        const teams = new TeamService();

        await Promise.all([
            teams.createPersonal(user.id, user.fullName, user.username),
            teams.createPersonal(user.id, user.fullName, user.username)
        ]);

        await teams.createPersonal(user.id, user.fullName, user.username);

        const memberships = await TeamMembership.findBy({ userId: user.id });
        expect(memberships).toEqual([expect.objectContaining({ role: TeamRole.Owner })]);
        expect(await Team.countBy({ createdBy: user.id })).toBe(1);
        expect(deliveries('team.created')).toEqual([{
            teamId: memberships[0].teamId,
            orgId: await defaultOrganizationId(),
            createdBy: user.id
        }]);
    });

    it('names the team after the username when the full name is blank', async () => {
        const user = await userSeed.user();

        await new TeamService().createPersonal(user.id, '  ', user.username);

        expect(await Team.findOneByOrFail({ createdBy: user.id })).toMatchObject({ name: `${user.username}'s Team` });
    });
});
