import typia from 'typia';
import AuthShell from '@omni/ui/components/AuthShell';
import Field from '@omni/ui/components/Field';
import Form from '@omni/ui/components/Form';
import AuthHeading from '@/modules/auth/components/AuthHeading';
import { ForgotPasswordInput } from '@omni/contracts/auth/http';
import { useForm } from '@omni/ui/hooks/forms/use-form';
import { detectLocale } from '@omni/ui/i18n/locale';
import { authApi } from '@/modules/auth/api/api';
import { useAuthFlow } from '@/modules/auth/hooks/use-auth-flow';
import { authHref } from '@/modules/auth/utils/app';
import { authErrorMessage } from '@/modules/auth/utils/error-messages';
import { Trans, useLingui } from '@lingui/react/macro';
import { msg } from '@lingui/core/macro';
import { Button } from '@heroui/react';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

type ForgotPasswordFormInput = Omit<ForgotPasswordInput, 'language'>;

const validate = typia.createValidate<ForgotPasswordFormInput>();

const ForgotPassword = () => {
    const { t } = useLingui();
    const flow = useAuthFlow();
    const { name } = flow.instance;
    const [sentTo, setSentTo] = useState<string | null>(null);
    const form = useForm<ForgotPasswordFormInput>({
        validate,
        submitErrorMessage: authErrorMessage(msg`Could not send the reset link.`),
        initialValues: { email: '' },
        onSubmit: async (values) => {
            await authApi.forgotPassword({
                email: values.email,
                language: detectLocale()
            });
            setSentTo(values.email);
        }
    });

    if(sentTo !== null){
        return (
            <AuthShell>
                <AuthHeading title={t`Check your email`}>
                    <Trans>If <span className='text-foreground'>{sentTo}</span> has a {name} account, a link to choose a new password is on its way.</Trans>
                </AuthHeading>
                <RouterLink to={authHref('/sign-in', flow)} className='block text-center text-sm text-foreground'>
                    <Trans>Back to sign in</Trans>
                </RouterLink>
            </AuthShell>
        );
    }

    return (
        <AuthShell>
            <AuthHeading title={t`Reset your password`}>
                <Trans>We will email you a link to choose a new one.</Trans>
            </AuthHeading>

            <Form form={form} className='flex flex-col'>
                <Field form={form} name='email' label={t`Email`} type='email' placeholder={t`Email`} autoComplete='email' />

                <Button type='submit' fullWidth className='mt-4' isPending={form.submitting}>
                    <Trans>Send link</Trans>
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

export default ForgotPassword;
