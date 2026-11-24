import Band from '@/modules/console/components/Band';
import Bar from '@/modules/console/components/Bar';
import Crumb from '@/modules/console/components/Crumb';
import Empty from '@/modules/console/components/Empty';
import Keys from '@/modules/console/components/Keys';
import MethodIcon from '@/modules/console/components/MethodIcon';
import Peek from '@/modules/console/components/Peek';
import Tick from '@/modules/console/components/Tick';
import UserRow from '@/modules/console/components/UserRow';
import ViewTabs from '@/modules/console/components/ViewTabs';
import { consoleApi } from '@/modules/console/api/api';
import { useConsole } from '@/modules/console/hooks/use-console';
import { useDebounced } from '@/modules/console/hooks/use-debounced';
import { useMethodLabel } from '@/modules/console/hooks/use-method-label';
import { consoleErrorMessage } from '@/modules/console/utils/console-error';
import { count } from '@/modules/console/utils/format';
import { Grouping, groupUsers } from '@/modules/console/utils/group-users';
import { ConsoleUser, ConsoleUserDetail, ConsoleUserView, SignInMethod } from '@omni/contracts/console/domain';
import { useQuery } from '@omni/ui/hooks/api/use-query';
import { useLingui } from '@lingui/react/macro';
import { DropdownItem, DropdownMenu, DropdownPopover, DropdownRoot, DropdownSection, DropdownTrigger, Header, toast } from '@heroui/react';
import { ListFilter, Search, SlidersHorizontal, Users as UsersIcon } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const PAGE = 100;
const POPOVER = 'min-w-56 rounded-lg border border-line bg-raised p-1 shadow-xl';
const ITEM = 'h-8 gap-2 rounded-md px-2 text-[13px]';
const METHODS: SignInMethod[] = ['google', 'microsoft', 'github', 'password'];

interface Loaded{
    key: string;
    users: ConsoleUser[];
}

const Users = () => {
    const { t } = useLingui();
    const methodLabel = useMethodLabel();
    const { member, roles, reloadRoles, reloadOrganization } = useConsole();
    const [params, setParams] = useSearchParams();
    const peekId = params.get('peek');
    const [view, setView] = useState<ConsoleUserView>('all');
    const [method, setMethod] = useState<SignInMethod | 'any'>('any');
    const [grouping, setGrouping] = useState<Grouping>('day');
    const [text, setText] = useState('');
    const [focus, setFocus] = useState(-1);
    const [more, setMore] = useState<Loaded>({ key: '', users: [] });
    const search = useRef<HTMLInputElement>(null);
    const q = useDebounced(text.trim(), 200);
    const filter = { q, view, method: method === 'any' ? undefined : method };
    const key = JSON.stringify(filter);
    const page = useQuery(`users:${key}`, () => consoleApi.users({ ...filter, limit: PAGE }));
    const counts = useQuery('user-counts', () => consoleApi.userCounts());
    const users = [...(page.data?.users ?? []), ...(more.key === key ? more.users : [])];
    const total = page.data?.total ?? 0;
    const groups = groupUsers(users, grouping, methodLabel, t`No sign-in yet`);
    const flat = groups.flatMap((group) => group.users);
    const offsets = groups.map((_, position) => groups.slice(0, position).reduce((sum, group) => sum + group.users.length, 0));
    const knownRoles = roles.map((role) => role.name);

    const views: { id: ConsoleUserView; label: string; count?: string }[] = [
        { id: 'all', label: t`All`, count: counts.data === undefined ? undefined : count(counts.data.all) },
        { id: 'roles', label: t`With a role`, count: counts.data === undefined ? undefined : count(counts.data.roles) },
        { id: 'unverified', label: t`Not verified`, count: counts.data === undefined ? undefined : count(counts.data.unverified) },
        { id: 'week', label: t`This week`, count: counts.data === undefined ? undefined : count(counts.data.week) }
    ];

    const open = (user: ConsoleUser) => setParams({ peek: user.id });
    const close = () => setParams({});

    const loadMore = async () => {
        try{
            const next = await consoleApi.users({ ...filter, limit: PAGE, offset: users.length });
            setMore({ key, users: [...(more.key === key ? more.users : []), ...next.users] });
        }catch(error: unknown){
            toast.danger(consoleErrorMessage(error));
        }
    };

    const changed = (updated: ConsoleUserDetail) => {
        const patch = (user: ConsoleUser) => user.id === updated.id ? { ...user, roles: updated.roles } : user;
        if(page.data !== undefined) page.replace({ ...page.data, users: page.data.users.map(patch) });
        setMore({ key: more.key, users: more.users.map(patch) });
        counts.reload();
        reloadRoles();
    };

    const removed = () => {
        close();
        page.reload();
        counts.reload();
        reloadRoles();
        reloadOrganization();
    };

    const onKey = useEffectEvent((event: KeyboardEvent) => {
        if(event.metaKey || event.ctrlKey || event.altKey || document.querySelector('[role="dialog"], [role="menu"]') !== null) return;
        if(event.target instanceof HTMLInputElement){
            if(event.key === 'Escape') event.target.blur();

            return;
        }
        const step = event.key === 'j' || event.key === 'ArrowDown' ? 1 : event.key === 'k' || event.key === 'ArrowUp' ? -1 : 0;
        if(step !== 0 && flat.length > 0){
            event.preventDefault();
            const next = Math.max(0, Math.min(flat.length - 1, focus + step));
            setFocus(next);
            document.querySelector(`[data-row="${next}"]`)?.scrollIntoView({ block: 'nearest' });
            if(peekId !== null) open(flat[next]);
        }
        if(event.key === 'Enter' && flat[focus] !== undefined) open(flat[focus]);
        if(event.key === 'Escape' && peekId !== null) close();
        if(event.key === '/'){
            event.preventDefault();
            search.current?.focus();
        }
    });

    useEffect(() => {
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <div className='flex min-h-0 flex-1'>
            <div className='flex min-w-0 flex-1 flex-col'>
                <Bar
                    actions={(
                        <>
                            <label className={`${peekId === null ? 'hidden md:flex' : 'hidden 2xl:flex'} h-7 w-52 items-center gap-2 rounded-md border border-line px-2 text-muted focus-within:border-foreground/25`}>
                                <Search className='size-3.5 shrink-0' aria-hidden='true' />
                                <input
                                    ref={search}
                                    value={text}
                                    onChange={(event) => {
                                        setText(event.target.value);
                                        setFocus(-1);
                                    }}
                                    aria-label={t`Search`}
                                    placeholder={t`Search`}
                                    className='min-w-0 flex-1 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-faint'
                                />
                                <Keys keys={['/']} />
                            </label>
                            <DropdownRoot>
                                <DropdownTrigger className={`flex h-7 items-center gap-1.5 rounded-md px-2 text-[12.5px] transition-colors hover:bg-hover ${method === 'any' ? 'text-muted' : 'text-foreground'}`}>
                                    <ListFilter className='size-[15px]' aria-hidden='true' />
                                    <span className='hidden md:inline'>{method === 'any' ? t`Filter` : methodLabel(method)}</span>
                                </DropdownTrigger>
                                <DropdownPopover placement='bottom end' className={POPOVER}>
                                    <DropdownMenu aria-label={t`Filter`} onAction={(picked) => {
                                        setMethod(picked as SignInMethod | 'any');
                                        setFocus(-1);
                                    }}>
                                        <DropdownSection>
                                            <Header className='px-2 pb-1 pt-1.5 text-[11.5px] font-medium text-faint'>{t`Signs in with`}</Header>
                                            <DropdownItem id='any' textValue={t`Anything`} className={ITEM}>
                                                <span className='size-3.5' />
                                                {t`Anything`}
                                                <Tick isOn={method === 'any'} />
                                            </DropdownItem>
                                            {METHODS.map((option) => (
                                                <DropdownItem key={option} id={option} textValue={methodLabel(option)} className={ITEM}>
                                                    <MethodIcon method={option} />
                                                    {methodLabel(option)}
                                                    <Tick isOn={method === option} />
                                                </DropdownItem>
                                            ))}
                                        </DropdownSection>
                                    </DropdownMenu>
                                </DropdownPopover>
                            </DropdownRoot>
                            <DropdownRoot>
                                <DropdownTrigger className='flex h-7 items-center gap-1.5 rounded-md border border-line px-2 text-[12.5px] text-foreground transition-colors hover:bg-hover'>
                                    <SlidersHorizontal className='size-[15px]' aria-hidden='true' />
                                    <span className='hidden md:inline'>{t`Display`}</span>
                                </DropdownTrigger>
                                <DropdownPopover placement='bottom end' className={POPOVER}>
                                    <DropdownMenu aria-label={t`Group by`} onAction={(picked) => setGrouping(picked as Grouping)}>
                                        <DropdownSection>
                                            <Header className='px-2 pb-1 pt-1.5 text-[11.5px] font-medium text-faint'>{t`Group by`}</Header>
                                            {([['day', t`Day joined`], ['method', t`How they sign in`], ['none', t`No grouping`]] as const).map(([option, label]) => (
                                                <DropdownItem key={option} id={option} textValue={label} className={ITEM}>
                                                    {label}
                                                    <Tick isOn={grouping === option} />
                                                </DropdownItem>
                                            ))}
                                        </DropdownSection>
                                    </DropdownMenu>
                                </DropdownPopover>
                            </DropdownRoot>
                        </>
                    )}
                >
                    <Crumb icon={UsersIcon} label={t`Users`} />
                    <span className='me-2 text-[12.5px] text-faint'>{page.data === undefined ? '' : count(total)}</span>
                    <ViewTabs
                        className={peekId === null ? 'hidden sm:flex' : 'hidden 2xl:flex'}
                        value={view}
                        options={views}
                        onChange={(next) => {
                            setView(next);
                            setFocus(-1);
                        }}
                    />
                </Bar>

                <div className='min-h-0 flex-1 overflow-y-auto pb-10'>
                    {page.error !== undefined ? <Empty>{consoleErrorMessage(page.error)}</Empty> : null}
                    {groups.map((group, position) => (
                        <div key={group.key}>
                            {group.label === '' ? null : (
                                <Band count={String(group.users.length)}>
                                    {group.method === null ? null : <MethodIcon method={group.method} />}
                                    {group.label}
                                </Band>
                            )}
                            {group.users.map((user, row) => {
                                const at = offsets[position] + row;

                                return (
                                    <UserRow
                                        key={user.id}
                                        user={user}
                                        index={at}
                                        isFocused={focus === at}
                                        isOpen={peekId === user.id}
                                        onOpen={() => {
                                            setFocus(at);
                                            open(user);
                                        }}
                                        onFocus={() => setFocus(at)}
                                    />
                                );
                            })}
                        </div>
                    ))}
                    {total > users.length ? (
                        <button type='button' onClick={() => void loadMore()} className='flex h-10 w-full items-center px-4 text-[12.5px] text-muted hover:bg-hover hover:text-foreground'>
                            {t`Show ${count(Math.min(PAGE, total - users.length))} more`}
                        </button>
                    ) : null}
                    {page.data !== undefined && users.length === 0 ? <Empty>{t`Nobody matches`}</Empty> : null}
                </div>
            </div>

            {peekId === null ? null : (
                <Peek
                    userId={peekId}
                    selfId={member.id}
                    knownRoles={knownRoles}
                    onClose={close}
                    onChanged={changed}
                    onRemoved={removed}
                />
            )}
        </div>
    );
};

export default Users;
