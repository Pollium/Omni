import Empty from '@/modules/console/components/Empty';
import Line from '@/modules/console/components/Line';
import Section from '@/modules/console/components/Section';
import SettingsPage from '@/modules/console/components/SettingsPage';
import Tile from '@/modules/console/components/Tile';
import GitHubIcon from '@omni/ui/components/icons/GitHubIcon';
import GoogleIcon from '@omni/ui/components/icons/GoogleIcon';
import MicrosoftIcon from '@omni/ui/components/icons/MicrosoftIcon';
import { consoleApi } from '@/modules/console/api/api';
import { consoleErrorMessage } from '@/modules/console/utils/console-error';
import { host } from '@/modules/console/utils/format';
import { OAuthProvider } from '@omni/contracts/auth/domain';
import { useQuery } from '@omni/ui/hooks/api/use-query';
import { Plural, useLingui } from '@lingui/react/macro';
import { KeyRound } from 'lucide-react';
import { ReactNode, SVGProps } from 'react';

const PROVIDERS: { name: OAuthProvider; label: string; icon: (props: SVGProps<SVGSVGElement>) => ReactNode }[] = [
    { name: 'google', label: 'Google', icon: GoogleIcon },
    { name: 'microsoft', label: 'Microsoft', icon: MicrosoftIcon },
    { name: 'github', label: 'GitHub', icon: GitHubIcon }
];

const HOURS_PER_DAY = 24;

const State = ({ isOn, children }: { isOn: boolean; children: string }) => (
    <>
        <span className={`size-1.5 rounded-full ${isOn ? 'bg-success' : 'bg-foreground/20'}`} aria-hidden='true' />
        <span>{children}</span>
    </>
);

const Settings = () => {
    const { t } = useLingui();
    const settings = useQuery('settings', () => consoleApi.settings());
    const data = settings.data;

    return (
        <SettingsPage title={t`Settings`} note={t`Omni reads all of this from its environment. Change it there and restart Omni.`}>
            {settings.error !== undefined ? <Empty>{consoleErrorMessage(settings.error)}</Empty> : null}
            {data === undefined ? null : (
                <>
                    <Section title={t`Instance`}>
                        <Line title={t`Name`}><span>{data.name}</span></Line>
                        <Line title={t`Sign-in site`}><span className='font-mono text-[12px]'>{host(data.webUrl)}</span></Line>
                        <Line title='API'><span className='font-mono text-[12px]'>{host(data.apiUrl)}</span></Line>
                        <Line title={t`Default organization`}><span>{data.defaultOrganization}</span></Line>
                        <Line title={t`Invitations expire after`}>
                            {data.invitationTtlHours % HOURS_PER_DAY === 0
                                ? <Plural value={data.invitationTtlHours / HOURS_PER_DAY} one='# day' other='# days' />
                                : <Plural value={data.invitationTtlHours} one='# hour' other='# hours' />}
                        </Line>
                    </Section>

                    <Section title={t`Sign-in`} note={t`A provider shows on the sign-in page once it has its client id and secret.`}>
                        {PROVIDERS.map((provider) => {
                            const configured = data.providers.find((entry) => entry.name === provider.name);

                            return (
                                <Line key={provider.name} mark={<Tile icon={provider.icon} />} title={provider.label} detail={configured?.clientId ?? ''} isMono>
                                    <State isOn={configured !== undefined}>{configured === undefined ? t`Not set` : t`On`}</State>
                                </Line>
                            );
                        })}
                        <Line mark={<Tile icon={KeyRound} />} title={t`Email and password`} detail={t`With a link to reset it`}>
                            <State isOn>{t`Always`}</State>
                        </Line>
                    </Section>

                    <Section title={t`Mail`} note={t`Where reset links and invitations leave from.`}>
                        <Line title={t`Server`} detail={data.mail.host === '' ? t`None: mail is only written to the log` : `${data.mail.host}:${data.mail.port}${data.mail.secure ? ' · TLS' : ''}`} isMono={data.mail.host !== ''}>
                            <State isOn={data.mail.host !== ''}>{data.mail.host === '' ? t`Off` : t`On`}</State>
                        </Line>
                        <Line title={t`Sender`} detail={data.mail.from} isMono />
                    </Section>

                    <Section title={t`Legal`}>
                        <Line title={t`Terms`} detail={data.termsUrl === '' ? t`No link` : host(data.termsUrl)} isMono={data.termsUrl !== ''} />
                        <Line title={t`Privacy`} detail={data.privacyUrl === '' ? t`No link` : host(data.privacyUrl)} isMono={data.privacyUrl !== ''} />
                    </Section>
                </>
            )}
        </SettingsPage>
    );
};

export default Settings;
