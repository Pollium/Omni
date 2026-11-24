import { KbdContent, KbdRoot } from '@heroui/react';

const Keys = ({ keys }: { keys: string[] }) => (
    <span className='flex shrink-0 items-center gap-1'>
        {keys.map((key) => (
            <KbdRoot key={key} className='h-[18px] min-w-[18px] rounded-[4px] border border-line bg-transparent px-1 text-[10.5px] font-medium text-muted shadow-none'>
                <KbdContent>{key}</KbdContent>
            </KbdRoot>
        ))}
    </span>
);

export default Keys;
