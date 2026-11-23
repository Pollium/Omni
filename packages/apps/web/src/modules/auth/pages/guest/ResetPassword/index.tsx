import typia from 'typia';
import AuthShell from '@omni/ui/components/AuthShell';
import Field from '@omni/ui/components/Field';
import Form from '@omni/ui/components/Form';
import AuthHeading from '@/modules/auth/components/AuthHeading';
import { ResetPasswordInput } from '@omni/contracts/auth/http';
import { baseCodeOf } from '@omni/contracts/shared/errors';
import { useForm } from '@omni/ui/hooks/forms/use-form';
import { toError } from '@omni/ui/utils/format/errors';
import { authApi } from '@/modules/auth/api/api';
import { useAuthFlow } from '@/modules/auth/hooks/use-auth-flow';
import { authHref, finishAuth } from '@/modules/auth/utils/app';
import { authErrorMessage } from '@/modules/auth/utils/error-messages';
import { Trans, useLingui } from '@lingui/react/macro';
import { msg } from '@lingui/core/macro';
import { Button } from '@heroui/react';
import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';

type ResetPasswordFormInput = Omit<ResetPasswordInput, 'token'>;

const validate = typia.createValidate<ResetPasswordFormInput>();

const ResetPassword = () => {
    const { t } = useLingui();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const flow = useAuthFlow();
    const token = params.get('token') ?? '';
    const [expired, setExpired] = useState(token === '');
    const form = useForm<ResetPasswordFormInput>({
        validate,
        submitErrorMessage: authErrorMessage(msg`Could not reset the password.`),
        initialValues: { newPassword: '' },
        onSubmit: async (values) => {
            try{
                const session = await authApi.resetPassword({
                    token,
                    newPassword: values.newPassword
                });
                finishAuth(session, flow.app, null);
            }catch(error){
                if(baseCodeOf(toError(error).message) !== 'Auth::InvalidResetToken') throw error;
                setExpired(true);
            }
        }
    });

    if(expired){
        return (
            <AuthShell>
                <AuthHeading title={t`This link no longer works`}>
                    <Trans>Reset links expire and work only once.</Trans>
                </AuthHeading>
                <Button fullWidth onPress={() => void navigate(authHref('/forgot-password', flow))}>
                    <Trans>Request a new link</Trans>
                </Button>
            </AuthShell>
        );
    }

    return (
        <AuthShell>
            <AuthHeading title={t`Choose a new password`}>
                <Trans>Eight characters or more. Saving it signs you out on your other devices.</Trans>
            </AuthHeading>

            <Form form={form} className='flex flex-col'>
                <Field
                    form={form}
                    name='newPassword'
                    label={t`New password`}
                    type='password'
                    placeholder={t`New password`}
                    autoComplete='new-password'
                />

                <Button type='submit' fullWidth className='mt-4' isPending={form.submitting}>
                    <Trans>Save and sign in</Trans>
                </Button>
            </Form>

            <p className='mt-7 text-center text-xs text-muted'>
                <Trans>
                    Remembered your password?{' '}
                    <RouterLink to={authHref('/sign-in', flow)} className='text-foreground'>Sign in</RouterLink>
                </Trans>
            </p>
        </AuthShell>
    );
};

export default ResetPassword;
