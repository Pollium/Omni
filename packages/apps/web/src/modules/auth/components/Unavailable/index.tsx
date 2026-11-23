import AuthShell from '@omni/ui/components/AuthShell';
import AuthHeading from '@/modules/auth/components/AuthHeading';
import { Trans, useLingui } from '@lingui/react/macro';
import { Button } from '@heroui/react';

const Unavailable = () => {
    const { t } = useLingui();

    return (
        <AuthShell>
            <AuthHeading title={t`Something went wrong`}>
                <Trans>We couldn't load this page. Try again in a moment.</Trans>
            </AuthHeading>
            <Button fullWidth onPress={() => window.location.reload()}>
                <Trans>Try again</Trans>
            </Button>
        </AuthShell>
    );
};

export default Unavailable;
