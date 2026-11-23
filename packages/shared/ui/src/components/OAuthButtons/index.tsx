import GitHubIcon from '../icons/GitHubIcon';
import GoogleIcon from '../icons/GoogleIcon';
import MicrosoftIcon from '../icons/MicrosoftIcon';
import { OAuthProvider } from '@omni/contracts/auth/domain';
import { Button, Separator } from '@heroui/react';
import { ReactNode } from 'react';

const ICONS: Record<OAuthProvider, (props: { className?: string }) => ReactNode> = {
    google: GoogleIcon,
    github: GitHubIcon,
    microsoft: MicrosoftIcon
};

interface OAuthButtonsProps{
    providers: OAuthProvider[];
    labels: Record<OAuthProvider, ReactNode>;
    or: ReactNode;
    onContinue: (provider: OAuthProvider) => void;
}

const OAuthButtons = ({ providers, labels, or, onContinue }: OAuthButtonsProps) => {
    if(providers.length === 0) return null;

    return (
        <>
            <div className='flex flex-col gap-3'>
                {providers.map((provider, index) => {
                    const Icon = ICONS[provider];

                    return (
                        <Button
                            key={provider}
                            type='button'
                            fullWidth
                            variant={index === 0 ? undefined : 'secondary'}
                            onPress={() => onContinue(provider)}
                        >
                            <Icon className='size-4' />
                            {labels[provider]}
                        </Button>
                    );
                })}
            </div>

            <div className='my-5 flex items-center gap-3'>
                <Separator className='flex-1' />
                <span className='text-sm text-muted'>{or}</span>
                <Separator className='flex-1' />
            </div>
        </>
    );
};

export default OAuthButtons;
