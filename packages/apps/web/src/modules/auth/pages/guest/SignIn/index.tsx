import typia from 'typia';
import AuthShell from '@omni/ui/components/AuthShell';
import Field from '@omni/ui/components/Field';
import Form from '@omni/ui/components/Form';
import OAuthButtons from '@omni/ui/components/OAuthButtons';
import Reveal from '@omni/ui/components/Reveal';
import SignInPassword from '@/modules/auth/components/SignInPassword';
import TermsNotice from '@/modules/auth/components/TermsNotice';
import { OAuthProvider } from '@omni/contracts/auth/domain';
import { CheckEmailInput, SignInInput } from '@omni/contracts/auth/http';
import { Validator } from '@omni/ui/contracts/form';
import { useForm } from '@omni/ui/hooks/forms/use-form';
import { beginHandoff } from '@omni/ui/utils/session/handoff';
import { authApi } from '@/modules/auth/api/api';
import { useAuthFlow } from '@/modules/auth/hooks/use-auth-flow';
import { authHref, finishAuth } from '@/modules/auth/utils/app';
import { authErrorMessage } from '@/modules/auth/utils/error-messages';
import { useLingui } from '@lingui/react/macro';
import { msg } from '@lingui/core/macro';
import { Button } from '@heroui/react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type SignInStep = 'email' | 'password';

const validators: Record<SignInStep, Validator> = {
    email: typia.createValidate<CheckEmailInput>(),
    password: typia.createValidate<SignInInput>()
};

const SignIn = () => {
    const { t } = useLingui();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const flow = useAuthFlow();
    const [step, setStep] = useState<SignInStep>('email');
    const form = useForm<SignInInput>({
        validate: validators[step],
        submitErrorMessage: authErrorMessage(msg`Could not sign in. Try again.`),
        submitErrorFields: { 'Auth::InvalidCredentials': 'password' },
        initialValues: {
            email: params.get('email') ?? '',
            password: ''
        },
        onSubmit: async (values) => {
            if(step === 'email'){
                const { exists } = await authApi.checkEmail({ email: values.email });
                if(exists){
                    setStep('password');
                    return;
                }

                await navigate(authHref('/sign-up', flow, values.email));
                return;
            }

            finishAuth(await authApi.signIn(values), flow.app, flow.next);
        }
    });

    const continueWith = async (provider: OAuthProvider) => {
        window.location.href = authApi.oauthStartUrl(provider, flow.app, await beginHandoff(flow.next));
    };

    return (
        <AuthShell>
            <OAuthButtons
                providers={flow.instance.providers}
                onContinue={(provider) => {
                    void continueWith(provider);
                }}
                or={t`or`}
                labels={{
                    google: t`Continue with Google`,
                    github: t`Continue with GitHub`,
                    microsoft: t`Continue with Microsoft`
                }}
            />

            <Form form={form} className='flex flex-col'>
                <Field form={form} name='email' label={t`Email`} type='email' placeholder={t`Email`} autoComplete='email' />

                <Reveal show={step === 'password'}>
                    <SignInPassword form={form} />
                </Reveal>

                <Button type='submit' fullWidth className='mt-4' isPending={form.submitting}>
                    {step === 'email' ? t`Continue` : t`Sign in`}
                </Button>
            </Form>

            <TermsNotice instance={flow.instance} />
        </AuthShell>
    );
};

export default SignIn;
