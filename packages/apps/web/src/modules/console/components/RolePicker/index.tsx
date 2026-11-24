import RoleChip from '@/modules/console/components/RoleChip';
import Tick from '@/modules/console/components/Tick';
import { roleTone } from '@/modules/console/utils/role-tone';
import { useLingui } from '@lingui/react/macro';
import { DropdownItem, DropdownMenu, DropdownPopover, DropdownRoot, DropdownTrigger } from '@heroui/react';

interface RolePickerProps{
    held: string[];
    known: string[];
    isBusy: boolean;
    onToggle: (role: string, isHeld: boolean) => void;
}

const RolePicker = ({ held, known, isBusy, onToggle }: RolePickerProps) => {
    const { t } = useLingui();
    const options = [...new Set([...known, ...held])];

    return (
        <DropdownRoot>
            <DropdownTrigger aria-label={t`Roles`} isDisabled={isBusy} className='-mx-1.5 flex min-h-7 w-[calc(100%+0.75rem)] flex-wrap items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-hover'>
                {held.length === 0 ? <span className='text-[13px] text-faint'>{t`No role`}</span> : held.map((role) => <RoleChip key={role} role={role} />)}
            </DropdownTrigger>
            <DropdownPopover placement='bottom start' className='min-w-56 rounded-lg border border-line bg-raised p-1 shadow-xl'>
                <DropdownMenu aria-label={t`Roles`} onAction={(key) => onToggle(String(key), held.includes(String(key)))}>
                    {options.map((role) => (
                        <DropdownItem key={role} id={role} textValue={role} className='h-8 gap-2 rounded-md px-2 text-[13px]'>
                            <span className='size-2 shrink-0 rounded-full' style={{ background: roleTone(role) }} aria-hidden='true' />
                            {role}
                            <Tick isOn={held.includes(role)} />
                        </DropdownItem>
                    ))}
                </DropdownMenu>
            </DropdownPopover>
        </DropdownRoot>
    );
};

export default RolePicker;
