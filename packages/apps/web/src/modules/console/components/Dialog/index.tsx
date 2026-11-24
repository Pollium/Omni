import Tool from '@/modules/console/components/Tool';
import { useLingui } from '@lingui/react/macro';
import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

interface DialogProps{
    isOpen: boolean;
    onClose: () => void;
    label: string;
    width?: string;
    children: ReactNode;
}

export const Dialog = ({ isOpen, onClose, label, width = 'max-w-[38rem]', children }: DialogProps) => {
    useEffect(() => {
        if(!isOpen) return;

        const onKey = (event: KeyboardEvent) => {
            if(event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if(!isOpen) return null;

    return (
        <div className='fixed inset-0 z-50 flex items-start justify-center bg-black/25 px-3 pt-[12vh] dark:bg-black/55' onMouseDown={onClose}>
            <div
                role='dialog'
                aria-modal='true'
                aria-label={label}
                onMouseDown={(event) => event.stopPropagation()}
                className={`flex max-h-[76vh] w-full flex-col overflow-hidden rounded-xl border border-line bg-raised shadow-[0_24px_60px_rgba(0,0,0,0.22)] ${width}`}
            >
                {children}
            </div>
        </div>
    );
};

export const DialogHead = ({ title, onClose }: { title: string; onClose: () => void }) => {
    const { t } = useLingui();

    return (
        <div className='flex h-12 shrink-0 items-center gap-2 border-b border-line pe-2 ps-4'>
            <span className='text-[13.5px] font-medium text-foreground'>{title}</span>
            <span className='ms-auto'>
                <Tool icon={X} hint={t`Close`} onPress={onClose} />
            </span>
        </div>
    );
};
