import { ReactNode } from 'react';

interface BandProps{
    children: ReactNode;
    count?: string;
    aside?: string;
}

const Band = ({ children, count = '', aside = '' }: BandProps) => (
    <div className='sticky top-0 z-10 flex h-9 items-center gap-2 border-b border-line bg-band px-3 text-[13px] font-medium text-foreground sm:px-4'>
        {children}
        {count === '' ? null : <span className='font-normal text-faint'>{count}</span>}
        {aside === '' ? null : <span className='hidden truncate font-normal text-muted sm:inline'>· {aside}</span>}
    </div>
);

export default Band;
