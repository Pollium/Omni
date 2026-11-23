import { Instance } from '@omni/contracts/instance/domain';
import { Trans } from '@lingui/react/macro';
import { Link } from '@heroui/react';

interface TermsNoticeProps{
    instance: Instance;
}

const TermsNotice = ({ instance }: TermsNoticeProps) => {
    const { name, termsUrl, privacyUrl } = instance;
    if(termsUrl === '' || privacyUrl === '') return null;

    return (
        <p className='mt-7 text-center text-xs text-muted'>
            <Trans>
                By using {name}, you agree to our{' '}
                <Link href={termsUrl} target='_blank' className='text-foreground'>Terms of Service</Link>
                {' '}&amp;{' '}
                <Link href={privacyUrl} target='_blank' className='text-foreground'>Privacy Policy</Link>.
            </Trans>
        </p>
    );
};

export default TermsNotice;
