import { useMethodLabel } from '@/modules/console/hooks/use-method-label';
import { ago } from '@/modules/console/utils/format';
import { ConsoleUserDetail } from '@omni/contracts/console/domain';
import { TeamRole } from '@omni/contracts/team/domain';
import { Trans, useLingui } from '@lingui/react/macro';
import { LucideIcon, MailCheck, UserPlus, Users } from 'lucide-react';
import { ReactNode } from 'react';

interface Moment{
    key: string;
    icon: LucideIcon;
    text: ReactNode;
    at: string;
}

const Activity = ({ user }: { user: ConsoleUserDetail }) => {
    const { t } = useLingui();
    const methodLabel = useMethodLabel();
    const method = user.methods.length === 0 ? null : methodLabel(user.methods[0]);
    const source = user.signupSource;
    const created = method === null
        ? <Trans>Created an account</Trans>
        : source === null
            ? <Trans>Created an account with <b className='font-medium text-foreground'>{method}</b></Trans>
            : <Trans>Created an account with <b className='font-medium text-foreground'>{method}</b> from {source}</Trans>;
    const moments: Moment[] = [
        { key: 'created', icon: UserPlus, text: created, at: user.createdAt },
        ...(user.emailVerifiedAt === null ? [] : [{ key: 'verified', icon: MailCheck, text: <Trans>Verified their email</Trans>, at: user.emailVerifiedAt }]),
        ...user.teams.map((team) => ({
            key: team.id,
            icon: Users,
            text: team.role === TeamRole.Owner
                ? <Trans>Made <b className='font-medium text-foreground'>{team.name}</b></Trans>
                : <Trans>Joined <b className='font-medium text-foreground'>{team.name}</b></Trans>,
            at: team.joinedAt
        }))
    ].sort((a, b) => b.at.localeCompare(a.at));

    return (
        <section className='flex flex-col gap-3'>
            <h2 className='text-[13px] font-medium text-foreground'>{t`Activity`}</h2>
            <ol className='relative flex flex-col gap-4 before:absolute before:bottom-2 before:left-[9.5px] before:top-2 before:w-px before:bg-line'>
                {moments.map((moment) => (
                    <li key={moment.key} className='relative flex items-center gap-3 text-[13px] text-muted'>
                        <span className='z-[1] grid size-5 shrink-0 place-items-center rounded-full border border-line bg-panel'>
                            <moment.icon className='size-3' aria-hidden='true' />
                        </span>
                        <span className='min-w-0 flex-1'>{moment.text}</span>
                        <span className='shrink-0 text-[12px] text-faint'>{ago(moment.at)}</span>
                    </li>
                ))}
            </ol>
        </section>
    );
};

export default Activity;
