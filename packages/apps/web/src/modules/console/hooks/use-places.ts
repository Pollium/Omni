import { ConsoleSection, ConsolePlace } from '@/modules/console/contracts/console';
import { ConsoleOrganization } from '@omni/contracts/console/domain';
import { useLingui } from '@lingui/react/macro';
import { AppWindow, Building2, House, Mail, Settings, ShieldCheck, Users } from 'lucide-react';

interface Places{
    main: ConsolePlace[];
    sections: ConsoleSection[];
    footer: ConsolePlace;
    every: ConsolePlace[];
}

export const usePlaces = (organization: ConsoleOrganization | undefined): Places => {
    const { t } = useLingui();
    const main: ConsolePlace[] = [
        { label: t`Home`, to: '/admin', icon: House, keys: ['G', 'H'] },
        { label: t`Users`, to: '/admin/users', icon: Users, keys: ['G', 'U'] }
    ];
    const sections: ConsoleSection[] = [
        {
            title: t`Access`,
            places: [
                { label: t`Roles`, to: '/admin/roles', icon: ShieldCheck, keys: ['G', 'R'] },
                { label: t`Apps`, to: '/admin/apps', icon: AppWindow, keys: ['G', 'A'] }
            ]
        },
        {
            title: t`Organization`,
            places: [
                { label: organization?.name ?? t`Organization`, to: '/admin/organization', icon: Building2, keys: ['G', 'O'] },
                { label: t`Invitations`, to: '/admin/organization?tab=invitations', icon: Mail, keys: ['G', 'I'], count: organization?.pendingInvitations }
            ]
        }
    ];
    const footer: ConsolePlace = { label: t`Settings`, to: '/admin/settings', icon: Settings, keys: ['G', 'S'] };

    return {
        main,
        sections,
        footer,
        every: [...main, ...sections.flatMap((section) => section.places), footer]
    };
};
