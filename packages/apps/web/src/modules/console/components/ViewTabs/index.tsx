interface ViewTabsProps<T extends string>{
    value: T;
    options: { id: T; label: string; count?: string }[];
    onChange: (value: T) => void;
    className?: string;
}

const ViewTabs = <T extends string>({ value, options, onChange, className = 'hidden sm:flex' }: ViewTabsProps<T>) => (
    <div role='tablist' className={`shrink-0 items-center gap-1 ${className}`}>
        {options.map((option) => (
            <button
                key={option.id}
                type='button'
                role='tab'
                aria-selected={value === option.id}
                onClick={() => onChange(option.id)}
                className={`flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2 text-[12px] transition-colors ${value === option.id ? 'border-line bg-pressed text-foreground' : 'border-transparent text-muted hover:bg-hover hover:text-foreground'}`}
            >
                {option.label}
                {option.count === undefined ? null : <span className='text-faint'>{option.count}</span>}
            </button>
        ))}
    </div>
);

export default ViewTabs;
