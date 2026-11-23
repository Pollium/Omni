import Pending from '@/modules/auth/components/Pending';
import SignUpForm from '@/modules/auth/components/SignUpForm';
import { useAuthFlow } from '@/modules/auth/hooks/use-auth-flow';
import { appSignUpUrl } from '@/modules/auth/utils/app';
import { useSearchParams } from 'react-router-dom';

const SignUp = () => {
    const [params] = useSearchParams();
    const flow = useAuthFlow();
    const email = params.get('email') ?? '';

    if(flow.app.signUpUrl){
        window.location.replace(appSignUpUrl(flow.app.signUpUrl, flow.next, email));
        return <Pending />;
    }

    return <SignUpForm flow={flow} email={email} />;
};

export default SignUp;
