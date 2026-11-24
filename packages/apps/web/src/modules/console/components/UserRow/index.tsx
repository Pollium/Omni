import Face from '@/modules/console/components/Face';
import MethodIcon from '@/modules/console/components/MethodIcon';
import RoleChip from '@/modules/console/components/RoleChip';
import { shortDate } from '@/modules/console/utils/format';
import { ConsoleUser } from '@omni/contracts/console/domain';
import { Trans } from '@lingui/react/macro';

interface UserRowProps{
    user: ConsoleUser;
    index: number;
    isFocused: boolean;
    isOpen: boolean;
    onOpen: () => void;
    onFocus: () => void;
}

const UserRow = ({ user, index, isFocused, isOpen, onOpen, onFocus }: UserRowProps) => (
    <div
        data-row={index}
        role='button'
        tabIndex={-1}
        aria-current={isOpen}
        onClick={onOpen}
        onMouseMove={onFocus}
        className={`flex h-10 cursor-default items-center gap-3 border-b border-line/60 px-3 sm:px-4 ${isOpen ? 'bg-pressed' : isFocused ? 'bg-hover' : ''}`}
    >
        <Face name={user.fullName} src={user.avatarUrl} />
        <span className='min-w-0 shrink-0 truncate text-[13px] text-foreground sm:max-w-[16rem]'>{user.fullName}</span>
        <span className='hidden min-w-0 truncate text-[13px] text-muted md:inline'>{user.email}</span>
        <span className='ms-auto flex shrink-0 items-center gap-2.5'>
            <span className='hidden items-center gap-1.5 sm:flex'>
                {user.roles.map((role) => <RoleChip key={role} role={role} />)}
                {user.verified ? null : <span className='inline-flex h-[22px] items-center rounded-full border border-dashed border-line px-2 text-[12px] text-muted'><Trans>Not verified</Trans></span>}
            </span>
            {user.methods.length === 0 ? <span className='size-3.5' /> : <MethodIcon method={user.methods[0]} />}
            <span className='w-12 text-right text-[12px] tabular-nums text-muted'>{shortDate(user.createdAt)}</span>
        </span>
    </div>
);

export default UserRow;
