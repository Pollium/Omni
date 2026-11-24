import Face from '@/modules/console/components/Face';
import Keys from '@/modules/console/components/Keys';
import MethodIcon from '@/modules/console/components/MethodIcon';
import { consoleApi } from '@/modules/console/api/api';
import { Dialog } from '@/modules/console/components/Dialog';
import { ConsolePlace } from '@/modules/console/contracts/console';
import { useDebounced } from '@/modules/console/hooks/use-debounced';
import { SignInMethod } from '@omni/contracts/console/domain';
import { useQuery } from '@omni/ui/hooks/api/use-query';
import { useLingui } from '@lingui/react/macro';
import { LucideIcon, Search, ShieldCheck } from 'lucide-react';
import { KeyboardEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CommandMenuProps{
    isOpen: boolean;
    places: ConsolePlace[];
    onClose: () => void;
}

interface Command{
    id: string;
    group: string;
    label: string;
    detail?: string;
    icon?: LucideIcon;
    face?: { name: string; src: string | null };
    method?: SignInMethod;
    keys?: string[];
    to: string;
}

const SUGGESTIONS = 5;

const CommandMenu = ({ isOpen, places, onClose }: CommandMenuProps) => {
    const { t } = useLingui();
    const navigate = useNavigate();
    const [text, setText] = useState('');
    const [active, setActive] = useState(0);
    const needle = useDebounced(text.trim(), 150);
    const people = useQuery(`palette:${needle}`, () => needle === '' ? Promise.resolve(null) : consoleApi.users({ q: needle, limit: SUGGESTIONS }));
    const lowered = text.trim().toLowerCase();

    const commands: Command[] = [
        ...(needle === '' ? [] : people.data?.users ?? []).map((user) => ({
            id: user.id,
            group: t`Users`,
            label: user.fullName,
            detail: user.email,
            face: { name: user.fullName, src: user.avatarUrl },
            method: user.methods[0],
            to: `/admin/users?peek=${user.id}`
        })),
        ...[
            { id: 'grant', group: t`Actions`, label: t`Give a role…`, icon: ShieldCheck, to: '/admin/roles?grant=1' },
            ...places.map((place) => ({ id: place.to, group: t`Go to`, label: place.label, icon: place.icon, keys: place.keys, to: place.to }))
        ].filter((command) => lowered === '' || command.label.toLowerCase().includes(lowered))
    ];
    const groups = [...new Set(commands.map((command) => command.group))];
    const current = Math.min(active, commands.length - 1);

    const close = () => {
        setText('');
        setActive(0);
        onClose();
    };

    const run = (command: Command | undefined) => {
        if(command === undefined) return;
        void navigate(command.to);
        close();
    };

    const onKey = (event: KeyboardEvent) => {
        if(event.key === 'ArrowDown' || event.key === 'ArrowUp'){
            event.preventDefault();
            setActive(Math.max(0, Math.min(commands.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1))));
        }
        if(event.key === 'Enter') run(commands[current]);
    };

    return (
        <Dialog isOpen={isOpen} onClose={close} label={t`Search`} width='max-w-[40rem]'>
            <div className='flex h-[52px] shrink-0 items-center gap-3 border-b border-line px-4'>
                <Search className='size-4 shrink-0 text-muted' aria-hidden='true' />
                <input
                    autoFocus
                    value={text}
                    onChange={(event) => {
                        setText(event.target.value);
                        setActive(0);
                    }}
                    onKeyDown={onKey}
                    aria-label={t`Search`}
                    placeholder={t`Find someone or type a command…`}
                    className='min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-faint'
                />
                <Keys keys={['Esc']} />
            </div>
            <div className='overflow-y-auto p-1.5'>
                {commands.length === 0 ? <p className='px-3 py-6 text-center text-[13px] text-muted'>{t`Nothing matches “${text}”`}</p> : null}
                {groups.map((group) => (
                    <div key={group} className='flex flex-col'>
                        <span className='px-2.5 pb-1 pt-2.5 text-[11.5px] font-medium text-faint'>{group}</span>
                        {commands.filter((command) => command.group === group).map((command) => {
                            const index = commands.indexOf(command);
                            const Icon = command.icon;

                            return (
                                <button
                                    key={command.id}
                                    type='button'
                                    onMouseEnter={() => setActive(index)}
                                    onClick={() => run(command)}
                                    className={`flex h-10 items-center gap-3 rounded-md px-2.5 text-left text-[13.5px] ${index === current ? 'bg-pressed text-foreground' : 'text-foreground/85'}`}
                                >
                                    {command.face === undefined ? null : <Face name={command.face.name} src={command.face.src} />}
                                    {Icon === undefined ? null : <Icon className='size-4 shrink-0 text-muted' aria-hidden='true' />}
                                    <span className='truncate'>{command.label}</span>
                                    {command.detail === undefined ? null : <span className='truncate text-[12.5px] text-muted'>{command.detail}</span>}
                                    <span className='ms-auto flex items-center gap-2'>
                                        {command.method === undefined ? null : <MethodIcon method={command.method} />}
                                        {command.keys === undefined ? null : <Keys keys={command.keys} />}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </Dialog>
    );
};

export default CommandMenu;
