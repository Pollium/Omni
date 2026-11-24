import MethodIcon from '@/modules/console/components/MethodIcon';
import RolePicker from '@/modules/console/components/RolePicker';
import { useMethodLabel } from '@/modules/console/hooks/use-method-label';
import { longDate } from '@/modules/console/utils/format';
import { ConsoleUserDetail } from '@omni/contracts/console/domain';
import { useLingui } from '@lingui/react/macro';
import { Building2 } from 'lucide-react';
import { ReactNode } from 'react';

interface PropertiesProps{
    user: ConsoleUserDetail;
    knownRoles: string[];
    isBusy: boolean;
    onToggleRole: (role: string, isHeld: boolean) => void;
}

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className='grid min-h-8 grid-cols-[6.75rem_minmax(0,1fr)] items-center gap-2'>
        <span className='text-[12.5px] text-muted'>{label}</span>
        <div className='flex min-h-7 min-w-0 flex-wrap items-center gap-1.5 text-[13px] text-foreground'>{children}</div>
    </div>
);

const Properties = ({ user, knownRoles, isBusy, onToggleRole }: PropertiesProps) => {
    const { t } = useLingui();
    const methodLabel = useMethodLabel();

    return (
        <div className='flex flex-col gap-0.5'>
            <Row label={t`Roles`}>
                <RolePicker held={user.roles} known={knownRoles} isBusy={isBusy} onToggle={onToggleRole} />
            </Row>
            <Row label={t`Signs in with`}>
                {user.methods.length === 0 ? <span className='text-faint'>{t`Nothing yet`}</span> : user.methods.map((method) => (
                    <span key={method} className='flex items-center gap-1.5'>
                        <MethodIcon method={method} className='size-3.5 text-foreground/70' />
                        {methodLabel(method)}
                    </span>
                ))}
            </Row>
            <Row label={t`Email`}>
                <span className={`size-2 rounded-full ${user.verified ? 'bg-success' : 'border border-faint'}`} aria-hidden='true' />
                {user.verified ? t`Verified` : <span className='text-muted'>{t`Not verified`}</span>}
            </Row>
            <Row label={t`Phone`}>{user.phone ?? <span className='text-faint'>{t`None`}</span>}</Row>
            <Row label={t`Organization`}>
                {user.organizations.length === 0 ? <span className='text-faint'>{t`None`}</span> : (
                    <>
                        <Building2 className='size-3.5 text-muted' aria-hidden='true' />
                        <span className='truncate'>{user.organizations.join(', ')}</span>
                    </>
                )}
            </Row>
            <Row label={t`Came from`}>{user.signupSource ?? <span className='text-muted'>{t`Direct`}</span>}</Row>
            {user.signupCampaign === null ? null : <Row label={t`Campaign`}><span className='font-mono text-[12px]'>{user.signupCampaign}</span></Row>}
            <Row label={t`Joined`}>{longDate(user.createdAt)}</Row>
            <Row label='ID'><span className='truncate font-mono text-[11.5px] text-muted'>{user.id}</span></Row>
        </div>
    );
};

export default Properties;
