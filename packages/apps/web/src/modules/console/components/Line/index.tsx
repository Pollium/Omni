import { ReactNode } from 'react';

interface LineProps{
    mark?: ReactNode;
    title: string;
    detail?: string;
    isMono?: boolean;
    children?: ReactNode;
}

const Line = ({ mark = null, title, detail = '', isMono = false, children = null }: LineProps) => (
    <div className='flex min-h-12 items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0'>
        {mark}
        <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
            <span className='truncate text-[13px] text-foreground'>{title}</span>
            {detail === '' ? null : <span className={`truncate text-muted ${isMono ? 'font-mono text-[11.5px]' : 'text-[12px]'}`}>{detail}</span>}
        </span>
        <span className='flex min-w-0 shrink-0 items-center gap-2 text-[12.5px] text-muted'>{children}</span>
    </div>
);

export default Line;
