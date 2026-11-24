import { LucideIcon } from 'lucide-react';

const Crumb = ({ icon: Icon, label }: { icon: LucideIcon; label: string }) => (
    <span className='flex shrink-0 items-center gap-2 text-[13px] font-medium text-foreground'>
        <Icon className='size-4 shrink-0 text-muted' aria-hidden='true' />
        <span className='truncate'>{label}</span>
    </span>
);

export default Crumb;
