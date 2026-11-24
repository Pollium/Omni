import Tool from '@/modules/console/components/Tool';
import { consoleApi } from '@/modules/console/api/api';
import { Dialog, DialogHead } from '@/modules/console/components/Dialog';
import { consoleErrorMessage } from '@/modules/console/utils/console-error';
import { ConsoleUserDetail } from '@omni/contracts/console/domain';
import { i18n } from '@lingui/core';
import { Trans, useLingui } from '@lingui/react/macro';
import { DropdownItem, DropdownMenu, DropdownPopover, DropdownRoot, DropdownTrigger, Separator, toast } from '@heroui/react';
import { Copy, Ellipsis, LogOut, Mail, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface PersonMenuProps{
    user: ConsoleUserDetail;
    isSelf: boolean;
    onRemoved: () => void;
}

const ITEM = 'h-8 gap-2 rounded-md px-2 text-[13px]';

const PersonMenu = ({ user, isSelf, onRemoved }: PersonMenuProps) => {
    const { t } = useLingui();
    const [isConfirming, setConfirming] = useState(false);
    const [isRemoving, setRemoving] = useState(false);

    const attempt = async (work: () => PromiseLike<unknown>, done: string) => {
        try{
            await work();
            toast.success(done);
        }catch(error: unknown){
            toast.danger(consoleErrorMessage(error));
        }
    };

    const remove = async () => {
        setRemoving(true);
        try{
            await consoleApi.removeUser(user.id);
            toast.success(t`Deleted ${user.email}`);
            setConfirming(false);
            onRemoved();
        }catch(error: unknown){
            toast.danger(consoleErrorMessage(error));
        }finally{
            setRemoving(false);
        }
    };

    const actions: Record<string, () => void> = {
        reset: () => void attempt(() => consoleApi.sendPasswordReset(user.id, i18n.locale === 'es' ? 'es' : 'en'), t`Sent a reset link to ${user.email}`),
        sessions: () => void attempt(() => consoleApi.revokeSessions(user.id), t`Signed ${user.fullName} out everywhere`),
        copy: () => void attempt(() => navigator.clipboard.writeText(user.id), t`Copied the ID`),
        remove: () => setConfirming(true)
    };

    return (
        <>
            <DropdownRoot>
                <DropdownTrigger aria-label={t`Actions`} className='grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-hover hover:text-foreground'>
                    <Ellipsis className='size-4' aria-hidden='true' />
                </DropdownTrigger>
                <DropdownPopover placement='bottom end' className='min-w-64 rounded-lg border border-line bg-raised p-1 shadow-xl'>
                    <DropdownMenu aria-label={t`Actions`} onAction={(key) => actions[String(key)]()}>
                        <DropdownItem id='reset' textValue={t`Send a password reset link`} className={ITEM}>
                            <Mail className='size-4 text-muted' aria-hidden='true' />
                            <Trans>Send a password reset link</Trans>
                        </DropdownItem>
                        <DropdownItem id='sessions' textValue={t`Sign out everywhere`} className={ITEM}>
                            <LogOut className='size-4 text-muted' aria-hidden='true' />
                            <Trans>Sign out everywhere</Trans>
                        </DropdownItem>
                        <DropdownItem id='copy' textValue={t`Copy the ID`} className={ITEM}>
                            <Copy className='size-4 text-muted' aria-hidden='true' />
                            <Trans>Copy the ID</Trans>
                        </DropdownItem>
                        {isSelf ? null : <Separator className='my-1' />}
                        {isSelf ? null : (
                            <DropdownItem id='remove' textValue={t`Delete account`} className={`${ITEM} text-danger`}>
                                <Trash2 className='size-4' aria-hidden='true' />
                                <Trans>Delete account</Trans>
                            </DropdownItem>
                        )}
                    </DropdownMenu>
                </DropdownPopover>
            </DropdownRoot>

            <Dialog isOpen={isConfirming} onClose={() => setConfirming(false)} label={t`Delete account`} width='max-w-[26rem]'>
                <DialogHead title={t`Delete ${user.fullName}'s account?`} onClose={() => setConfirming(false)} />
                <p className='px-4 py-4 text-[13px] leading-relaxed text-muted'>
                    <Trans>{user.email} loses their account, their teams and their sessions in every app. The apps hear about it. This can't be undone.</Trans>
                </p>
                <div className='flex justify-end gap-2 border-t border-line px-3 py-2.5'>
                    <Tool label={t`Cancel`} tone='outline' onPress={() => setConfirming(false)} />
                    <button type='button' disabled={isRemoving} onClick={() => void remove()} className='flex h-7 items-center rounded-md bg-danger px-2.5 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50'>
                        <Trans>Delete account</Trans>
                    </button>
                </div>
            </Dialog>
        </>
    );
};

export default PersonMenu;
