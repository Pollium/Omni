import User from '../models/User';
import { PublicUserSummary } from '@omni/contracts/user/domain';
import { In } from 'typeorm';

export const toPublicSummary = (user: User): PublicUserSummary => ({
    userId: user.id,
    fullName: user.fullName,
    username: user.username,
    avatarUrl: user.avatarUrl
});

export default class UserDirectory{
    async summaries(userIds: string[]): Promise<PublicUserSummary[]>{
        if(userIds.length === 0) return [];

        const users = await User.find({
            where: { id: In(userIds) },
            select: { id: true, fullName: true, username: true, avatarUrl: true }
        });

        return users.map(toPublicSummary);
    }

    async summariesById(userIds: string[]): Promise<Map<string, PublicUserSummary>>{
        const summaries = await this.summaries(userIds);

        return new Map(summaries.map((summary) => [summary.userId, summary]));
    }
}
