import { ReactNode } from 'react';

interface SectionProps{
    title: string;
    note?: string;
    children: ReactNode;
}

const Section = ({ title, note = '', children }: SectionProps) => (
    <section className='flex flex-col gap-2.5'>
        <div className='flex flex-col gap-0.5'>
            <h2 className='text-[13px] font-medium text-foreground'>{title}</h2>
            {note === '' ? null : <p className='text-[12.5px] text-muted'>{note}</p>}
        </div>
        <div className='overflow-hidden rounded-lg border border-line bg-panel'>{children}</div>
    </section>
);

export default Section;
