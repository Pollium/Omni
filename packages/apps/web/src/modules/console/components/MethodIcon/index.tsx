import GitHubIcon from '@omni/ui/components/icons/GitHubIcon';
import GoogleIcon from '@omni/ui/components/icons/GoogleIcon';
import MicrosoftIcon from '@omni/ui/components/icons/MicrosoftIcon';
import { SignInMethod } from '@omni/contracts/console/domain';
import { KeyRound } from 'lucide-react';
import { ReactNode, SVGProps } from 'react';

interface MethodIconProps{
    method: SignInMethod;
    className?: string;
}

const ICONS: Record<SignInMethod, (props: SVGProps<SVGSVGElement>) => ReactNode> = {
    google: GoogleIcon,
    microsoft: MicrosoftIcon,
    github: GitHubIcon,
    password: KeyRound
};

const MethodIcon = ({ method, className = 'size-3.5 text-muted' }: MethodIconProps) => {
    const Icon = ICONS[method];

    return <Icon className={className} aria-hidden='true' />;
};

export default MethodIcon;
