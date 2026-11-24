import Tile from '@/modules/console/components/Tile';
import { ConsoleUserTeam } from '@omni/contracts/console/domain';
import { TeamRole } from '@omni/contracts/team/domain';
import { Plural, useLingui } from '@lingui/react/macro';
import { Users } from 'lucide-react';

const UserTeams = ({ teams }: { teams: ConsoleUserTeam[] }) => {
    const { t } = useLingui();
    const roles: Record<TeamRole, string> = {
        [TeamRole.Owner]: t`Owner`,
        [TeamRole.Admin]: t`Admin`,
        [TeamRole.Member]: t`Member`
    };

    return (
        <section className='flex flex-col gap-2'>
            <h2 className='text-[13px] font-medium text-foreground'>{t`Teams`}</h2>
            {teams.length === 0 ? <p className='text-[13px] text-faint'>{t`In no team`}</p> : (
                <div className='overflow-hidden rounded-lg border border-line'>
                    {teams.map((team) => (
                        <div key={team.id} className='flex h-11 items-center gap-3 border-b border-line px-3 last:border-b-0'>
                            <Tile icon={Users} />
                            <span className='min-w-0 flex-1 truncate text-[13px]'>{team.name}</span>
                            <span className='shrink-0 text-[12.5px] text-muted'>{roles[team.role]}</span>
                            <span className='w-20 shrink-0 text-right text-[12.5px] tabular-nums text-faint'>
                                <Plural value={team.members} one='# person' other='# people' />
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

export default UserTeams;
