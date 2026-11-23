import Collapse from '@omni/ui/components/Collapse';
import Field from '@omni/ui/components/Field';
import InlineError from '@omni/ui/components/InlineError';
import { SignInInput } from '@omni/contracts/auth/http';
import { FormApi } from '@omni/ui/contracts/form';
import { useMutation } from '@omni/ui/hooks/api/use-mutation';
import { detectLocale } from '@omni/ui/i18n/locale';
import { authApi } from '@/modules/auth/api/api';
import { authErrorMessage } from '@/modules/auth/utils/error-messages';
import { Trans, useLingui } from '@lingui/react/macro';
import { msg } from '@lingui/core/macro';
import { useState } from 'react';

interface SignInPasswordProps{
    form: FormApi<SignInInput>;
}

const resetLinkError = authErrorMessage(msg`Could not send the reset link.`);

const SignInPassword = ({ form }: SignInPasswordProps) => {
    const { t } = useLingui();
    const resetLink = useMutation(authApi.forgotPassword);
    const [sentTo, setSentTo] = useState<string | null>(null);

    const sendResetLink = () => {
        const { email } = form.values;
        void resetLink.run({
            email,
            language: detectLocale()
        })
            .then(() => setSentTo(email), () => setSentTo(null));
    };

    return (
        <div className='flex flex-col'>
            <Field
                form={form}
                name='password'
                label={t`Password`}
                labelAside={(
                    <button
                        type='button'
                        onClick={sendResetLink}
                        disabled={resetLink.loading}
                        className='text-xs text-muted transition-colors hover:text-foreground disabled:opacity-60'
                    >
                        {sentTo === null ? <Trans>Forgot it?</Trans> : <Trans>Resend</Trans>}
                    </button>
                )}
                type='password'
                placeholder={t`Password`}
                autoComplete='current-password'
            />

            {resetLink.error === undefined ? (
                <Collapse show={sentTo !== null}>
                    <p className='pt-1.5 text-xs text-muted'>
                        <Trans>We sent a link to <span className='text-foreground'>{sentTo}</span> to choose a new password.</Trans>
                    </p>
                </Collapse>
            ) : (
                <InlineError className='pt-1.5 text-xs'>{resetLinkError(resetLink.error)}</InlineError>
            )}
        </div>
    );
};

export default SignInPassword;
