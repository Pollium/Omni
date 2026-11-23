import User from '../../models/User';
import AvatarService from './Avatar';
import MembershipService from '@/modules/organizations/services/Membership';
import TeamService from '@/modules/teams/services/Team';
import Webhooks from '@/modules/webhooks/services/Webhooks';

export default class SignupService{
    #avatars = new AvatarService();
    #memberships = new MembershipService();
    #teams = new TeamService();
    #webhooks = new Webhooks();

    async welcome(user: User, avatarUrl: string | null){
        await this.#memberships.enrollDefault(user.id);
        await this.#teams.createPersonal(user.id, user.fullName, user.username);
        await this.#provisionAvatar(user, avatarUrl);

        await this.#webhooks.publish('user.created', {
            userId: user.id,
            fullName: user.fullName,
            username: user.username
        });
    }

    async #provisionAvatar(user: User, avatarUrl: string | null){
        if(avatarUrl === null){
            await this.#avatars.provision(user);
            return;
        }

        user.avatarUrl = avatarUrl;
        await user.save();
    }
}
