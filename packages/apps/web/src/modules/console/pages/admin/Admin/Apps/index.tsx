import DeliveryState from '@/modules/console/components/DeliveryState';
import Empty from '@/modules/console/components/Empty';
import Line from '@/modules/console/components/Line';
import Section from '@/modules/console/components/Section';
import SettingsPage from '@/modules/console/components/SettingsPage';
import Tile from '@/modules/console/components/Tile';
import { consoleApi } from '@/modules/console/api/api';
import { consoleErrorMessage } from '@/modules/console/utils/console-error';
import { ago, count, host } from '@/modules/console/utils/format';
import { useQuery } from '@omni/ui/hooks/api/use-query';
import { Plural, useLingui } from '@lingui/react/macro';
import { AppWindow, KeyRound, Users, Webhook } from 'lucide-react';

const Figure = ({ label, value }: { label: string; value: string }) => (
    <div className='flex flex-col gap-0.5 border-e border-line px-4 py-3 last:border-e-0'>
        <span className='text-[12px] text-muted'>{label}</span>
        <span className='text-[17px] font-medium tabular-nums'>{value}</span>
    </div>
);

const Apps = () => {
    const { t } = useLingui();
    const apps = useQuery('apps', () => consoleApi.apps());
    const data = apps.data;

    return (
        <SettingsPage title={t`Apps`} note={t`The apps that sign in with Omni, and what Omni tells them. Omni reads these from its environment.`}>
            {apps.error !== undefined ? <Empty>{consoleErrorMessage(apps.error)}</Empty> : null}
            {data === undefined ? null : (
                <>
                    <Section title={t`Sign-in`} note={t`Where each app goes back to after someone signs in. They come from APPS.`}>
                        {data.apps.map((app, index) => (
                            <Line key={app.id} mark={<Tile icon={AppWindow} />} title={app.id} detail={host(app.url)} isMono>
                                {index === 0 ? <span className='inline-flex h-5 items-center rounded-full border border-line px-2 text-[11.5px]'>{t`Home`}</span> : null}
                                <span className='hidden sm:inline'>{app.signUpUrl === undefined ? t`Omni's sign-up` : t`Its own sign-up`}</span>
                            </Line>
                        ))}
                    </Section>

                    <Section title={t`Backend`} note={t`What the product's backend hears from Omni, and the key it asks Omni with.`}>
                        <Line mark={<Tile icon={Webhook} />} title={t`Webhooks`} detail={data.webhookUrl === '' ? t`Not set` : host(data.webhookUrl)} isMono={data.webhookUrl !== ''}>
                            <Plural value={data.events.length} one='# event' other='# events' />
                        </Line>
                        <Line mark={<Tile icon={Users} />} title={t`Organization seats`} detail={data.membershipHookUrl === '' ? t`Not set: every invitation is accepted` : host(data.membershipHookUrl)} isMono={data.membershipHookUrl !== ''}>
                            <span className='hidden sm:inline'>{t`Asked before an invitation is accepted`}</span>
                        </Line>
                        <Line mark={<Tile icon={KeyRound} />} title={t`Service key`} detail={`••••••••${data.serviceKey}`} isMono>
                            <span className='hidden font-mono text-[11.5px] sm:inline'>SERVICE_KEY</span>
                        </Line>
                    </Section>

                    <Section title={t`Deliveries`} note={t`The last webhooks Omni sent, with the ones still waiting or failing.`}>
                        <div className='grid grid-cols-3 border-b border-line'>
                            <Figure label={t`Waiting`} value={count(data.deliveries.pending)} />
                            <Figure label={t`Failed`} value={count(data.deliveries.failed)} />
                            <Figure label={t`Events`} value={count(data.events.length)} />
                        </div>
                        {data.deliveries.recent.length === 0 ? <p className='px-4 py-4 text-[12.5px] text-muted'>{data.webhookUrl === '' ? t`No webhook receiver is set.` : t`Nothing sent yet.`}</p> : null}
                        {data.deliveries.recent.map((delivery) => (
                            <div key={delivery.id} className='flex min-h-10 items-center gap-2.5 border-b border-line px-4 py-2 last:border-b-0'>
                                <DeliveryState state={delivery.state} />
                                <span className='font-mono text-[12px]'>{delivery.type}</span>
                                {delivery.error === null ? null : <span className='hidden min-w-0 truncate font-mono text-[11.5px] text-faint sm:inline'>{delivery.error}</span>}
                                <span className='ms-auto shrink-0 text-[12px] text-muted'>
                                    {delivery.state === 'retrying'
                                        ? <Plural value={delivery.attempts} one='# try so far' other='# tries so far' />
                                        : ago(delivery.finishedAt ?? delivery.occurredAt)}
                                </span>
                            </div>
                        ))}
                    </Section>
                </>
            )}
        </SettingsPage>
    );
};

export default Apps;
