import { ConsoleMember, ConsoleOrganization, ConsoleRole } from '@omni/contracts/console/domain';
import { Instance } from '@omni/contracts/instance/domain';
import { LucideIcon } from 'lucide-react';

export interface ConsoleOutlet{
    instance: Instance;
    member: ConsoleMember;
    organization: ConsoleOrganization | undefined;
    roles: ConsoleRole[];
    reloadRoles: () => void;
    reloadOrganization: () => void;
    openSearch: () => void;
}

export interface ConsolePlace{
    label: string;
    to: string;
    icon: LucideIcon;
    keys: [string, string];
    count?: number;
}

export interface ConsoleSection{
    title: string;
    places: ConsolePlace[];
}
