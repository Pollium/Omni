import Face from '@/modules/console/components/Face';
import { ConsolePlace, ConsoleSection } from '@/modules/console/contracts/console';
import { ConsoleMember } from '@omni/contracts/console/domain';
import { useLingui } from '@lingui/react/macro';
import { ChevronDown, LogOut, Search } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface SidebarProps{
    name: string;
    main: ConsolePlace[];
    sections: ConsoleSection[];
    footer: ConsolePlace;
    member: ConsoleMember;
    signOutHref: string;
    onSearch: () => void;
}

const Entry = ({ place }: { place: ConsolePlace }) => {
    const { pathname, search } = useLocation();
    const [path, query = ''] = place.to.split('?');
    const isActive = pathname === path && (query === '' ? !search.includes('tab=') : search.includes(query));
    const Icon = place.icon;

    return (
        <NavLink to={place.to} className={`flex h-7 items-center gap-2 rounded-md px-2 text-[13px] transition-colors ${isActive ? 'bg-pressed font-medium text-foreground' : 'text-foreground/80 hover:bg-hover'}`}>
            <Icon className={`size-4 shrink-0 ${isActive ? 'text-foreground' : 'text-muted'}`} aria-hidden='true' />
            <span className='truncate'>{place.label}</span>
            {place.count === undefined || place.count === 0 ? null : <span className='ms-auto text-[12px] text-faint'>{place.count}</span>}
        </NavLink>
    );
};

const Group = ({ section }: { section: ConsoleSection }) => {
    const [isOpen, setOpen] = useState(true);

    return (
        <div className='flex flex-col gap-px'>
            <button type='button' aria-expanded={isOpen} onClick={() => setOpen(!isOpen)} className='flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-muted hover:bg-hover'>
                {section.title}
                <ChevronDown className={`size-3 transition-transform ${isOpen ? '' : '-rotate-90'}`} aria-hidden='true' />
            </button>
            {isOpen ? section.places.map((place) => <Entry key={place.to} place={place} />) : null}
        </div>
    );
};

const Sidebar = ({ name, main, sections, footer, member, signOutHref, onSearch }: SidebarProps) => {
    const { t } = useLingui();

    return (
        <aside className='hidden w-[236px] shrink-0 flex-col gap-4 px-2 pb-2 pt-2 lg:flex'>
            <div className='flex items-center gap-1'>
                <span className='flex h-8 min-w-0 flex-1 items-center gap-2 px-1.5'>
                    <span className='grid size-5 shrink-0 place-items-center rounded-[5px] bg-foreground text-[11px] font-semibold text-panel'>{name.charAt(0).toUpperCase()}</span>
                    <span className='truncate text-[13px] font-medium'>{name}</span>
                    <span className='text-[12px] text-faint'>Omni</span>
                </span>
                <button type='button' aria-label={t`Search`} title='⌘K' onClick={onSearch} className='grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-hover hover:text-foreground'>
                    <Search className='size-[15px]' aria-hidden='true' />
                </button>
            </div>

            <nav aria-label='Omni' className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto'>
                <div className='flex flex-col gap-px'>
                    {main.map((place) => <Entry key={place.to} place={place} />)}
                </div>
                {sections.map((section) => <Group key={section.title} section={section} />)}
                <div className='mt-auto flex flex-col gap-px'>
                    <Entry place={footer} />
                </div>
            </nav>

            <div className='flex items-center gap-2 px-1.5'>
                <Face name={member.fullName} src={member.avatarUrl} />
                <span className='min-w-0 flex-1 truncate text-[12.5px] text-muted'>{member.email}</span>
                <a href={signOutHref} aria-label={t`Sign out`} title={t`Sign out`} className='grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-hover hover:text-foreground'>
                    <LogOut className='size-[15px]' aria-hidden='true' />
                </a>
            </div>
        </aside>
    );
};

export default Sidebar;
