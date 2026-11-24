import Pending from '@/modules/auth/components/Pending';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const CONSOLE_PATH = '/admin';

const ConsoleCallback = () => {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const next = params.get('next');
    const target = next !== null && next.startsWith(CONSOLE_PATH) ? next : CONSOLE_PATH;

    useEffect(() => {
        void navigate(target, { replace: true });
    }, [navigate, target]);

    return <Pending />;
};

export default ConsoleCallback;
