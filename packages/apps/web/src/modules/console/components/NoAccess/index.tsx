import AuthShell from '@omni/ui/components/AuthShell';
import AuthHeading from '@/modules/auth/components/AuthHeading';
import { Trans, useLingui } from '@lingui/react/macro';
import { Button } from '@heroui/react';

const NoAccess = ({ signOutHref }: { signOutHref: string }) => {
    const { t } = useLingui();

    return (
        <AuthShell>
            <AuthHeading title={t`This console is for admins`}>
                <Trans>Your account doesn't hold the admin role. Ask an admin to give it to you, or sign in with another account.</Trans>
            </AuthHeading>
            <Button fullWidth onPress={() => window.location.assign(signOutHref)}>
                <Trans>Use another account</Trans>
            </Button>
        </AuthShell>
    );
};

export default NoAccess;
