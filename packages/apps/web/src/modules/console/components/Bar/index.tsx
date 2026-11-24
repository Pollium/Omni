import { ReactNode } from 'react';

interface BarProps{
    children: ReactNode;
    actions?: ReactNode;
}

const Bar = ({ children, actions = null }: BarProps) => (
    <header className='flex h-11 shrink-0 items-center gap-2 border-b border-line px-3 sm:px-4'>
        <div className='flex min-w-0 items-center gap-2'>{children}</div>
        <div className='ms-auto flex shrink-0 items-center gap-1'>{actions}</div>
    </header>
);

export default Bar;
