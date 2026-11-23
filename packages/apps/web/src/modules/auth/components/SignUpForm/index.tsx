import typia from 'typia';
import AuthShell from '@omni/ui/components/AuthShell';
import Field from '@omni/ui/components/Field';
import Form from '@omni/ui/components/Form';
import AuthHeading from '@/modules/auth/components/AuthHeading';
import TermsNotice from '@/modules/auth/components/TermsNotice';
import { SignUpInput } from '@omni/contracts/auth/http';
import { useForm } from '@omni/ui/hooks/forms/use-form';
import { suggestFromEmail } from '@omni/ui/utils/format/suggest-from-email';
import { authApi } from '@/modules/auth/api/api';
import { AuthFlow } from '@/modules/auth/contracts/auth';
import { authHref, finishAuth } from '@/modules/auth/utils/app';
import { authErrorMessage } from '@/modules/auth/utils/error-messages';
import { Trans, useLingui } from '@lingui/react/macro';
import { msg } from '@lingui/core/macro';
import { Button } from '@heroui/react';
import { Link as RouterLink } from 'react-router-dom';

const validate = typia.createValidate<SignUpInput>();

interface SignUpFormProps{
    flow: AuthFlow;
    email: string;
}

const SignUpForm = ({ flow, email }: SignUpFormProps) => {
    const { t } = useLingui();
    const { name } = flow.instance;
    const { fullName = '', username = '' } = suggestFromEmail(email);
    const form = useForm<SignUpInput>({
        validate,
        submitErrorMessage: authErrorMessage(msg`Could not create the account. Try again.`),
        submitErrorFields: {
            'Auth::EmailAlreadyRegistered': 'email',
            'Auth::UsernameAlreadyTaken': 'username'
        },
        initialValues: {
            email,
            fullName,
            username,
            password: ''
        },
        onSubmit: async (values) => {
            finishAuth(await authApi.signUp(values), flow.app, flow.next);
        }
    });

    return (
        <AuthShell>
            <AuthHeading title={t`Create your ${name} account`}>
                <Trans>
                    Already have an account?{' '}
                    <RouterLink to={authHref('/sign-in', flow, form.values.email)} className='text-foreground'>Sign in</RouterLink>
                </Trans>
            </AuthHeading>

            <Form form={form} className='flex flex-col gap-4'>
                <Field form={form} name='email' label={t`Email`} type='email' placeholder={t`Email`} autoComplete='email' />
                <Field form={form} name='fullName' label={t`Name`} placeholder={t`Your name`} autoComplete='name' />
                <Field form={form} name='username' label={t`Username`} placeholder={t`A handle others can find you by`} autoComplete='username' />
                <Field
                    form={form}
                    name='password'
                    label={t`Password`}
                    type='password'
                    placeholder={t`Eight characters or more`}
                    autoComplete='new-password'
                />

                <Button type='submit' fullWidth isPending={form.submitting}>
                    <Trans>Create account</Trans>
                </Button>
            </Form>

            <TermsNotice instance={flow.instance} />
        </AuthShell>
    );
};

export default SignUpForm;
