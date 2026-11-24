import { LucideIcon } from 'lucide-react';

interface ToolProps{
    icon?: LucideIcon;
    label?: string;
    hint?: string;
    tone?: 'ghost' | 'outline' | 'solid';
    isDisabled?: boolean;
    onPress?: () => void;
}

const TONES = {
    ghost: 'text-muted hover:bg-hover hover:text-foreground',
    outline: 'border border-line text-foreground hover:bg-hover',
    solid: 'bg-foreground font-medium text-panel hover:opacity-90'
} as const;

const Tool = ({ icon: Icon, label = '', hint = '', tone = 'ghost', isDisabled = false, onPress }: ToolProps) => (
    <button
        type='button'
        onClick={onPress}
        disabled={isDisabled}
        aria-label={label === '' ? hint : label}
        title={hint === '' ? undefined : hint}
        className={`flex h-7 shrink-0 items-center gap-1.5 rounded-md text-[12.5px] transition-colors disabled:opacity-50 ${label === '' ? 'w-7 justify-center' : 'px-2'} ${TONES[tone]}`}
    >
        {Icon === undefined ? null : <Icon className='size-[15px]' aria-hidden='true' />}
        {label === '' ? null : <span className={Icon === undefined ? '' : 'hidden md:inline'}>{label}</span>}
    </button>
);

export default Tool;
