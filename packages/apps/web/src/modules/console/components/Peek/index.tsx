import Activity from '@/modules/console/components/Activity';
import Empty from '@/modules/console/components/Empty';
import Face from '@/modules/console/components/Face';
import PersonMenu from '@/modules/console/components/PersonMenu';
import Properties from '@/modules/console/components/Properties';
import Tool from '@/modules/console/components/Tool';
import UserTeams from '@/modules/console/components/UserTeams';
import { consoleApi } from '@/modules/console/api/api';
import { consoleErrorMessage } from '@/modules/console/utils/console-error';
import { ConsoleUserDetail } from '@omni/contracts/console/domain';
import { useQuery } from '@omni/ui/hooks/api/use-query';
import { useLingui } from '@lingui/react/macro';
import { Spinner, toast } from '@heroui/react';
import { X } from 'lucide-react';
import { useState } from 'react';

interface PeekProps{
    userId: string;
    selfId: string;
    knownRoles: string[];
    onClose: () => void;
    onChanged: (user: ConsoleUserDetail) => void;
    onRemoved: () => void;
}

const Peek = ({ userId, selfId, knownRoles, onClose, onChanged, onRemoved }: PeekProps) => {
    const { t } = useLingui();
    const detail = useQuery(`user:${userId}`, () => consoleApi.user(userId));
    const [isBusy, setBusy] = useState(false);
    const user = detail.data?.id === userId ? detail.data : undefined;

    const toggleRole = async (role: string, isHeld: boolean) => {
        setBusy(true);
        try{
            const updated = await (isHeld ? consoleApi.revokeRole(userId, role) : consoleApi.grantRole(userId, role));
            detail.replace(updated);
            onChanged(updated);
        }catch(error: unknown){
            toast.danger(consoleErrorMessage(error));
        }finally{
            setBusy(false);
        }
    };

    return (
        <aside aria-label={user?.fullName ?? t`Account`} className='fixed inset-0 z-30 flex flex-col bg-panel lg:static lg:z-auto lg:w-[27rem] lg:shrink-0 lg:border-s lg:border-line'>
            <div className='flex h-11 shrink-0 items-center gap-2 border-b border-line px-3'>
                {user === undefined ? null : <Face name={user.fullName} src={user.avatarUrl} size={18} />}
                <span className='min-w-0 truncate text-[13px] font-medium'>{user?.fullName}</span>
                <span className='ms-auto flex items-center gap-0.5'>
                    {user === undefined ? null : <PersonMenu user={user} isSelf={user.id === selfId} onRemoved={onRemoved} />}
                    <Tool icon={X} hint={t`Close`} onPress={onClose} />
                </span>
            </div>
            {detail.error !== undefined ? <Empty>{consoleErrorMessage(detail.error)}</Empty> : null}
            {user === undefined && detail.error === undefined ? <div className='grid flex-1 place-items-center'><Spinner size='sm' /></div> : null}
            {user === undefined ? null : (
                <div className='flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-4 pb-10 pt-4'>
                    <div className='flex flex-col gap-0.5'>
                        <span className='text-[17px] font-semibold tracking-[-0.01em]'>{user.fullName}</span>
                        <span className='text-[12.5px] text-muted'>{user.email} · @{user.username}</span>
                        {user.bio === '' ? null : <p className='pt-2 text-[13px] text-foreground/85'>{user.bio}</p>}
                    </div>
                    <Properties user={user} knownRoles={knownRoles} isBusy={isBusy} onToggleRole={(role, isHeld) => void toggleRole(role, isHeld)} />
                    <UserTeams teams={user.teams} />
                    <Activity user={user} />
                </div>
            )}
        </aside>
    );
};

export default Peek;
