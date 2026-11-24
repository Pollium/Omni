import Band from '@/modules/console/components/Band';
import Bar from '@/modules/console/components/Bar';
import Crumb from '@/modules/console/components/Crumb';
import Empty from '@/modules/console/components/Empty';
import Face from '@/modules/console/components/Face';
import Tile from '@/modules/console/components/Tile';
import ViewTabs from '@/modules/console/components/ViewTabs';
import { consoleApi } from '@/modules/console/api/api';
import { useConsole } from '@/modules/console/hooks/use-console';
import { consoleErrorMessage } from '@/modules/console/utils/console-error';
import { count, hasPassed, until } from '@/modules/console/utils/format';
import { ConsoleTeam } from '@omni/contracts/console/domain';
import { useQuery } from '@omni/ui/hooks/api/use-query';
import { Plural, useLingui } from '@lingui/react/macro';
import { toast } from '@heroui/react';
import { Building2, Mail, Users } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

type Tab = 'teams' | 'invitations';

const PAGE = 50;

const TeamRow = ({ team }: { team: ConsoleTeam }) => (
    <div className='flex h-10 items-center gap-3 border-b border-line/60 px-3 sm:px-4'>
        <Tile icon={Users} />
        <span className='min-w-0 flex-1 truncate text-[13px]'>{team.name}</span>
        {team.owner === null ? null : (
            <span className='hidden min-w-0 items-center gap-2 text-[12.5px] text-muted sm:flex'>
                <Face name={team.owner.fullName} src={team.owner.avatarUrl} size={16} />
                <span className='truncate'>{team.owner.fullName}</span>
            </span>
        )}
        <span className='w-20 shrink-0 text-right text-[12px] tabular-nums text-faint'>
            <Plural value={team.members} one='# person' other='# people' />
        </span>
    </div>
);

const Organization = () => {
    const { t } = useLingui();
    const { organization } = useConsole();
    const [params, setParams] = useSearchParams();
    const tab: Tab = params.get('tab') === 'invitations' ? 'invitations' : 'teams';
    const teams = useQuery('teams', () => consoleApi.teams({ limit: PAGE }));
    const invitations = useQuery('invitations', () => consoleApi.invitations());
    const [more, setMore] = useState<ConsoleTeam[]>([]);
    const loaded = [...(teams.data?.teams ?? []), ...more];
    const total = teams.data?.total ?? 0;
    const shared = loaded.filter((team) => team.members > 1);
    const personal = loaded.filter((team) => team.members <= 1);

    const loadMore = async () => {
        try{
            const next = await consoleApi.teams({ limit: PAGE, offset: loaded.length });
            setMore([...more, ...next.teams]);
        }catch(error: unknown){
            toast.danger(consoleErrorMessage(error));
        }
    };

    return (
        <div className='flex min-h-0 flex-1 flex-col'>
            <Bar>
                <Crumb icon={Building2} label={organization?.name ?? t`Organization`} />
                <span className='hidden h-5 items-center rounded-full border border-line px-2 text-[11.5px] text-muted sm:inline-flex'>{t`Default`}</span>
                <span className='w-2' />
                <ViewTabs
                    value={tab}
                    options={[
                        { id: 'teams', label: t`Teams`, count: organization === undefined ? undefined : count(organization.teams) },
                        { id: 'invitations', label: t`Invitations`, count: organization === undefined ? undefined : count(organization.pendingInvitations) }
                    ]}
                    onChange={(next) => setParams(next === 'teams' ? {} : { tab: next })}
                />
            </Bar>
            <div className='min-h-0 flex-1 overflow-y-auto pb-10'>
                {tab === 'teams' ? (
                    <>
                        {teams.error !== undefined ? <Empty>{consoleErrorMessage(teams.error)}</Empty> : null}
                        {shared.length === 0 ? null : <Band count={organization === undefined ? '' : count(organization.sharedTeams)} aside={t`more than one person`}>{t`Shared`}</Band>}
                        {shared.map((team) => <TeamRow key={team.id} team={team} />)}
                        {personal.length === 0 ? null : <Band count={organization === undefined ? '' : count(organization.teams - organization.sharedTeams)} aside={t`the one Omni makes with each account`}>{t`Personal`}</Band>}
                        {personal.map((team) => <TeamRow key={team.id} team={team} />)}
                        {total > loaded.length ? (
                            <button type='button' onClick={() => void loadMore()} className='flex h-10 w-full items-center px-4 text-[12.5px] text-muted hover:bg-hover hover:text-foreground'>
                                {t`Show ${count(Math.min(PAGE, total - loaded.length))} more`}
                            </button>
                        ) : null}
                        {teams.data !== undefined && loaded.length === 0 ? <Empty>{t`No teams yet`}</Empty> : null}
                    </>
                ) : (
                    <>
                        {invitations.error !== undefined ? <Empty>{consoleErrorMessage(invitations.error)}</Empty> : null}
                        {invitations.data !== undefined && invitations.data.length === 0 ? <Empty>{t`No invitation is waiting.`}</Empty> : null}
                        {invitations.data === undefined || invitations.data.length === 0 ? null : <Band count={count(invitations.data.length)}>{t`Waiting`}</Band>}
                        {invitations.data?.map((invitation) => {
                            const isLate = hasPassed(invitation.expiresAt);

                            return (
                                <div key={invitation.id} className='flex h-10 items-center gap-3 border-b border-line/60 px-3 sm:px-4'>
                                    <Tile icon={Mail} />
                                    <span className='min-w-0 truncate text-[13px]'>{invitation.email}</span>
                                    <span className='hidden min-w-0 truncate text-[13px] text-muted md:inline'>{invitation.team}</span>
                                    <span className={`ms-auto inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full border border-line px-2 text-[12px] ${isLate ? 'text-danger' : 'text-muted'}`}>
                                        {isLate ? <span className='size-1.5 rounded-full bg-danger' aria-hidden='true' /> : null}
                                        {isLate ? t`Expired` : t`Expires ${until(invitation.expiresAt).toLowerCase()}`}
                                    </span>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
};

export default Organization;
