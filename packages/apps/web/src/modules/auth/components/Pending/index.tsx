import Loader from '@omni/ui/components/Loader';
import { useLingui } from '@lingui/react/macro';

const Pending = () => {
    const { t } = useLingui();

    return <Loader label={t`Loading`} className='min-h-dvh bg-canvas' />;
};

export default Pending;
