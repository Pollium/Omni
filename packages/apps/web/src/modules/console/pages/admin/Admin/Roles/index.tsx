import Band from '@/modules/console/components/Band';
import Bar from '@/modules/console/components/Bar';
import Crumb from '@/modules/console/components/Crumb';
import Empty from '@/modules/console/components/Empty';
import Face from '@/modules/console/components/Face';
import MethodIcon from '@/modules/console/components/MethodIcon';
import RoleChip from '@/modules/console/components/RoleChip';
import Tool from '@/modules/console/components/Tool';
import ViewTabs from '@/modules/console/components/ViewTabs';
import { consoleApi } from '@/modules/console/api/api';
import { Dialog, DialogHead } from '@/modules/console/components/Dialog';
import { useConsole } from '@/modules/console/hooks/use-console';
import { useDebounced } from '@/modules/console/hooks/use-debounced';
import { consoleErrorMessage } from '@/modules/console/utils/console-error';
import { count } from '@/modules/console/utils/format';
import { roleTone } from '@/modules/console/utils/role-tone';
import { ConsoleUser } from '@omni/contracts/console/domain';
import { useQuery } from '@omni/ui/hooks/api/use-query';
import { useLingui } from '@lingui/react/macro';
import { toast } from '@heroui/react';
import { Plus, Search, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const CANDIDATES = 7;

const Holder = ({ user, role }: { user: ConsoleUser; role: string }) => {
    const navigate = useNavigate();

    return (
        <div role='button' tabIndex={0} onClick={() => void navigate(`/admin/users?peek=${user.id}`)} className='flex h-10 cursor-default items-center gap-3 border-b border-line/60 px-3 hover:bg-hover sm:px-4'>
            <Face name={user.fullName} src={user.avatarUrl} />
            <span className='truncate text-[13px]'>{user.fullName}</span>
            <span className='hidden truncate text-[13px] text-muted md:inline'>{user.email}</span>
            <span className='ms-auto flex shrink-0 items-center gap-2.5'>
                <span className='hidden gap-1.5 sm:flex'>{user.roles.filter((other) => other !== role).map((other) => <RoleChip key={other} role={other} />)}</span>
                {user.methods.length === 0 ? null : <MethodIcon method={user.methods[0]} />}
            </span>
        </div>
    );
};

const Roles = () => {
    const { t } = useLingui();
    const { roles, reloadRoles } = useConsole();
    const [params, setParams] = useSearchParams();
    const isGranting = params.has('grant');
    const [picked, setPicked] = useState<string | null>(null);
    const [text, setText] = useState('');
    const needle = useDebounced(text.trim(), 200);
    const role = picked ?? roles[0]?.name ?? '';
    const candidates = useQuery(`candidates:${isGranting}:${needle}`, () => isGranting ? consoleApi.users({ q: needle, limit: CANDIDATES + 5 }) : Promise.resolve(null));
    const shown = (candidates.data?.users ?? []).filter((user) => !user.roles.includes(role)).slice(0, CANDIDATES);

    const close = () => {
        setParams({});
        setText('');
    };

    const grant = async (user: ConsoleUser) => {
        try{
            await consoleApi.grantRole(user.id, role);
            toast.success(t`${user.fullName} now holds ${role}`);
            reloadRoles();
            close();
        }catch(error: unknown){
            toast.danger(consoleErrorMessage(error));
        }
    };

    return (
        <div className='flex min-h-0 flex-1 flex-col'>
            <Bar actions={<Tool icon={Plus} label={t`Give a role`} tone='solid' onPress={() => setParams({ grant: '1' })} />}>
                <Crumb icon={ShieldCheck} label={t`Roles`} />
            </Bar>
            <div className='min-h-0 flex-1 overflow-y-auto pb-10'>
                {roles.length === 0 ? <Empty>{t`Nobody holds a role yet.`}</Empty> : null}
                {roles.map((entry) => (
                    <div key={entry.name}>
                        <Band count={count(entry.count)} aside={entry.opensConsole ? t`Opens this console` : ''}>
                            <span className='size-2 rounded-full' style={{ background: roleTone(entry.name) }} aria-hidden='true' />
                            {entry.name}
                        </Band>
                        {entry.holders.map((user) => <Holder key={user.id} user={user} role={entry.name} />)}
                        {entry.count > entry.holders.length ? (
                            <p className='flex h-10 items-center px-4 text-[12.5px] text-muted'>{t`And ${count(entry.count - entry.holders.length)} more`}</p>
                        ) : null}
                    </div>
                ))}
                <p className='px-4 py-5 text-[12.5px] text-faint'>{t`Each app decides what a role lets someone do. Omni keeps who holds it.`}</p>
            </div>

            <Dialog isOpen={isGranting} onClose={close} label={t`Give a role`}>
                <DialogHead title={t`Give a role`} onClose={close} />
                <div className='flex items-center gap-2 border-b border-line px-4 py-2.5'>
                    <ViewTabs className='flex flex-wrap' value={role} options={roles.map((entry) => ({ id: entry.name, label: entry.name }))} onChange={setPicked} />
                </div>
                <label className='flex h-11 items-center gap-2.5 border-b border-line px-4'>
                    <Search className='size-4 text-muted' aria-hidden='true' />
                    <input autoFocus value={text} onChange={(event) => setText(event.target.value)} aria-label={t`Search`} placeholder={t`Search by name or email`} className='min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint' />
                </label>
                <div className='overflow-y-auto p-1.5'>
                    {candidates.data !== undefined && shown.length === 0 ? <p className='px-3 py-6 text-center text-[13px] text-muted'>{t`Nobody else to give it to`}</p> : null}
                    {shown.map((user) => (
                        <button key={user.id} type='button' onClick={() => void grant(user)} className='flex h-10 w-full items-center gap-3 rounded-md px-2.5 text-left hover:bg-pressed'>
                            <Face name={user.fullName} src={user.avatarUrl} />
                            <span className='truncate text-[13px]'>{user.fullName}</span>
                            <span className='truncate text-[12.5px] text-muted'>{user.email}</span>
                        </button>
                    ))}
                </div>
            </Dialog>
        </div>
    );
};

export default Roles;
