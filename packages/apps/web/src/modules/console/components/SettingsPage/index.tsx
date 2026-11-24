import { ReactNode } from 'react';

interface SettingsPageProps{
    title: string;
    note: string;
    children: ReactNode;
}

const SettingsPage = ({ title, note, children }: SettingsPageProps) => (
    <div className='min-h-0 flex-1 overflow-y-auto'>
        <div className='mx-auto flex w-full max-w-[44rem] flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 sm:pt-12'>
            <div className='flex flex-col gap-1'>
                <h1 className='text-[20px] font-semibold tracking-[-0.01em] text-foreground'>{title}</h1>
                <p className='text-[13px] text-muted'>{note}</p>
            </div>
            {children}
        </div>
    </div>
);

export default SettingsPage;
