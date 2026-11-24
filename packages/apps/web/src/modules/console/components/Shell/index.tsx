import CommandMenu from '@/modules/console/components/CommandMenu';
import Sidebar from '@/modules/console/components/Sidebar';
import { consoleApi } from '@/modules/console/api/api';
import { ConsoleOutlet } from '@/modules/console/contracts/console';
import { usePlaces } from '@/modules/console/hooks/use-places';
import { ConsoleMember } from '@omni/contracts/console/domain';
import { Instance } from '@omni/contracts/instance/domain';
import { useQuery } from '@omni/ui/hooks/api/use-query';
import { useLingui } from '@lingui/react/macro';
import { Toast } from '@heroui/react';
import { Search } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

interface ShellProps{
    instance: Instance;
    member: ConsoleMember;
    signOutHref: string;
}

const CHORD_MS = 1200;

const isTyping = (target: EventTarget | null): boolean =>
    target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

const Shell = ({ instance, member, signOutHref }: ShellProps) => {
    const { t } = useLingui();
    const navigate = useNavigate();
    const [isSearching, setSearching] = useState(false);
    const chord = useRef(0);
    const organization = useQuery('organization', () => consoleApi.organization());
    const roles = useQuery('roles', () => consoleApi.roles());
    const places = usePlaces(organization.data);

    const onKey = useEffectEvent((event: KeyboardEvent) => {
        if((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'){
            event.preventDefault();
            setSearching(!isSearching);

            return;
        }
        if(isSearching || isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;

        const key = event.key.toLowerCase();
        if(Date.now() - chord.current < CHORD_MS){
            chord.current = 0;
            const place = places.every.find((entry) => entry.keys[1].toLowerCase() === key);
            if(place !== undefined) void navigate(place.to);

            return;
        }
        if(key === 'g') chord.current = Date.now();
    });

    useEffect(() => {
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const outlet: ConsoleOutlet = {
        instance,
        member,
        organization: organization.data,
        roles: roles.data ?? [],
        reloadRoles: roles.reload,
        reloadOrganization: organization.reload,
        openSearch: () => setSearching(true)
    };

    return (
        <div className='flex h-dvh overflow-hidden bg-side text-foreground'>
            <Sidebar
                name={instance.name}
                main={places.main}
                sections={places.sections}
                footer={places.footer}
                member={member}
                signOutHref={signOutHref}
                onSearch={() => setSearching(true)}
            />

            <div className='flex min-w-0 flex-1 flex-col lg:py-2 lg:pe-2'>
                <main className='relative flex min-h-0 flex-1 flex-col overflow-hidden border-line bg-panel lg:rounded-lg lg:border'>
                    <Outlet context={outlet} />
                </main>
                <nav aria-label='Omni' className='flex h-14 shrink-0 items-stretch border-t border-line bg-panel lg:hidden'>
                    {places.main.concat(places.sections[0].places.slice(0, 1)).map((place) => (
                        <NavLink key={place.to} to={place.to} end aria-label={place.label} className={({ isActive }) => `flex flex-1 items-center justify-center ${isActive ? 'text-foreground' : 'text-muted'}`}>
                            <place.icon className='size-5' aria-hidden='true' />
                        </NavLink>
                    ))}
                    <button type='button' aria-label={t`Search`} onClick={() => setSearching(true)} className='flex flex-1 items-center justify-center text-muted'>
                        <Search className='size-5' aria-hidden='true' />
                    </button>
                </nav>
            </div>

            <CommandMenu isOpen={isSearching} places={places.every} onClose={() => setSearching(false)} />
            <Toast.Provider placement='bottom' />
        </div>
    );
};

export default Shell;
