import { dayLabel } from '@/modules/console/utils/format';
import { ConsoleUser, SignInMethod } from '@omni/contracts/console/domain';

export type Grouping = 'day' | 'method' | 'none';

export interface UserGroup{
    key: string;
    label: string;
    method: SignInMethod | null;
    users: ConsoleUser[];
}

export const groupUsers = (users: ConsoleUser[], grouping: Grouping, methodLabel: (method: SignInMethod) => string, noMethod: string): UserGroup[] => {
    if(grouping === 'none') return [{ key: 'all', label: '', method: null, users }];

    const groups = new Map<string, UserGroup>();
    for(const user of users){
        const method = user.methods[0] ?? null;
        const key = grouping === 'day' ? dayLabel(user.createdAt) : method ?? 'none';
        const group = groups.get(key) ?? {
            key,
            label: grouping === 'day' ? key : method === null ? noMethod : methodLabel(method),
            method: grouping === 'method' ? method : null,
            users: []
        };
        group.users.push(user);
        groups.set(key, group);
    }
    const list = [...groups.values()];

    return grouping === 'method' ? list.sort((a, b) => b.users.length - a.users.length) : list;
};
