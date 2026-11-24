import { roleTone } from '@/modules/console/utils/role-tone';

const RoleChip = ({ role }: { role: string }) => (
    <span className='inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full border border-line px-2 text-[12px] text-foreground/80'>
        <span className='size-2 rounded-full' style={{ background: roleTone(role) }} aria-hidden='true' />
        {role}
    </span>
);

export default RoleChip;
