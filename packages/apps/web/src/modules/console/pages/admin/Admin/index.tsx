import Bar from '@/modules/console/components/Bar';
import Crumb from '@/modules/console/components/Crumb';
import DeliveryState from '@/modules/console/components/DeliveryState';
import Empty from '@/modules/console/components/Empty';
import Face from '@/modules/console/components/Face';
import MethodIcon from '@/modules/console/components/MethodIcon';
import ViewTabs from '@/modules/console/components/ViewTabs';
import { consoleApi } from '@/modules/console/api/api';
import { useMethodLabel } from '@/modules/console/hooks/use-method-label';
import { consoleErrorMessage } from '@/modules/console/utils/console-error';
import { ago, count, percent, shortDate } from '@/modules/console/utils/format';
import { SignInMethod } from '@omni/contracts/console/domain';
import { useQuery } from '@omni/ui/hooks/api/use-query';
import { Plural, useLingui } from '@lingui/react/macro';
import { House } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

type Span = '7' | '30' | '120';

const Stat = ({ label, value, note }: { label: string; value: string; note: ReactNode }) => (
    <div className='flex flex-col gap-1 border-b border-e border-line px-4 py-4 sm:px-6 md:border-b-0 md:last:border-e-0'>
        <span className='text-[12.5px] text-muted'>{label}</span>
        <span className='text-[22px] font-medium tracking-[-0.01em] tabular-nums'>{value}</span>
        <span className='text-[12px] text-faint'>{note}</span>
    </div>
);

const Title = ({ children, aside = null }: { children: string; aside?: ReactNode }) => (
    <div className='flex h-10 items-center gap-2 border-b border-line px-4 sm:px-6'>
        <span className='text-[13px] font-medium'>{children}</span>
        <span className='ms-auto text-[12px] text-faint'>{aside}</span>
    </div>
);

const Home = () => {
    const { t } = useLingui();
    const navigate = useNavigate();
    const methodLabel = useMethodLabel();
    const [span, setSpan] = useState<Span>('30');
    const [hover, setHover] = useState<number | null>(null);
    const days = Number(span);
    const overview = useQuery(`overview:${days}`, () => consoleApi.overview(days));
    const apps = useQuery('apps', () => consoleApi.apps());
    const data = overview.data;
    const signups = data?.signups ?? [];
    const recent = signups.slice(-days);
    const before = signups.slice(0, -days).reduce((sum, day) => sum + day.count, 0);
    const now = recent.reduce((sum, day) => sum + day.count, 0);
    const highest = Math.max(1, ...recent.map((day) => day.count));
    const change = before === 0 ? '' : `${now >= before ? '+' : '−'}${percent(Math.abs(now - before), before)}`;
    const spans: { id: Span; label: string }[] = [
        { id: '7', label: t`7 days` },
        { id: '30', label: t`30 days` },
        { id: '120', label: t`120 days` }
    ];

    return (
        <div className='flex min-h-0 flex-1 flex-col'>
            <Bar>
                <Crumb icon={House} label={t`Home`} />
                <span className='w-2' />
                <ViewTabs value={span} options={spans} onChange={setSpan} />
            </Bar>
            {overview.error !== undefined ? <Empty>{consoleErrorMessage(overview.error)}</Empty> : null}
            {data === undefined ? null : (
                <div className='min-h-0 flex-1 overflow-y-auto pb-10'>
                    <div className='grid grid-cols-2 border-b border-line md:grid-cols-4'>
                        <Stat label={t`Accounts`} value={count(data.total)} note={t`+${count(now)} in ${days} days`} />
                        <Stat label={t`Sign-ups`} value={count(now)} note={change === '' ? t`In the last ${days} days` : t`${change} on the ${days} days before`} />
                        <Stat label={t`Verified email`} value={percent(data.verified, data.total)} note={<Plural value={data.verified} one='# account' other='# accounts' />} />
                        <Stat label={t`Pending invitations`} value={count(data.pendingInvitations)} note={data.expiredInvitations === 0 ? t`None expired` : <Plural value={data.expiredInvitations} one='# expired' other='# expired' />} />
                    </div>

                    <div className='flex flex-col gap-3 border-b border-line px-4 pb-4 pt-5 sm:px-6'>
                        <div className='flex items-baseline gap-2'>
                            <span className='text-[13px] font-medium'>{t`Sign-ups per day`}</span>
                            <span className='ms-auto text-[12px] tabular-nums text-muted'>
                                {hover === null ? t`${count(now)} in total` : t`${count(recent[hover].count)} on ${shortDate(recent[hover].date)}`}
                            </span>
                        </div>
                        <div className='flex h-36 items-end gap-px' onMouseLeave={() => setHover(null)}>
                            {recent.map((day, index) => (
                                <div key={day.date} onMouseEnter={() => setHover(index)} className='flex h-full flex-1 items-end'>
                                    <div className={`w-full rounded-t-[2px] transition-colors ${hover === index ? 'bg-foreground' : index === recent.length - 1 ? 'bg-foreground/55' : 'bg-foreground/[0.16]'}`} style={{ height: `${Math.max(2, (day.count / highest) * 100)}%` }} />
                                </div>
                            ))}
                        </div>
                        <div className='flex justify-between text-[11.5px] text-faint'>
                            <span>{recent.length === 0 ? '' : shortDate(recent[0].date)}</span>
                            <span>{t`Today`}</span>
                        </div>
                    </div>

                    <div className='grid lg:grid-cols-[minmax(0,1fr)_22rem]'>
                        <section className='min-w-0 border-b border-line lg:border-b-0'>
                            <Title aside={<Link to='/admin/users' className='hover:text-foreground'>{t`See all`}</Link>}>{t`Recent sign-ups`}</Title>
                            {data.recent.map((user) => (
                                <div key={user.id} role='button' tabIndex={0} onClick={() => void navigate(`/admin/users?peek=${user.id}`)} className='flex h-10 cursor-default items-center gap-3 border-b border-line/60 px-4 hover:bg-hover sm:px-6'>
                                    <Face name={user.fullName} src={user.avatarUrl} />
                                    <span className='truncate text-[13px]'>{user.fullName}</span>
                                    <span className='hidden truncate text-[13px] text-muted md:inline'>{user.email}</span>
                                    <span className='ms-auto flex shrink-0 items-center gap-2.5'>
                                        {user.methods.length === 0 ? null : <MethodIcon method={user.methods[0]} />}
                                        <span className='w-36 truncate whitespace-nowrap text-right text-[12px] text-muted'>{user.signupSource ?? ago(user.createdAt)}</span>
                                    </span>
                                </div>
                            ))}
                        </section>

                        <aside className='flex flex-col border-line lg:border-s'>
                            <Title>{t`How they sign in`}</Title>
                            <div className='flex flex-col gap-3 border-b border-line px-4 py-4 sm:px-6'>
                                {data.methods.map((entry) => (
                                    <div key={entry.method} className='flex items-center gap-2.5'>
                                        <MethodIcon method={entry.method as SignInMethod} className='size-3.5 text-foreground/70' />
                                        <span className='w-20 text-[13px]'>{methodLabel(entry.method as SignInMethod)}</span>
                                        <span className='h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/[0.07]'>
                                            <span className='block h-full rounded-full bg-foreground/60' style={{ width: `${(entry.count / Math.max(1, data.total)) * 100}%` }} />
                                        </span>
                                        <span className='w-10 text-right text-[12px] tabular-nums text-muted'>{count(entry.count)}</span>
                                    </div>
                                ))}
                            </div>
                            <Title aside={<Link to='/admin/apps' className='hover:text-foreground'>{t`Apps`}</Link>}>{t`Deliveries to the apps`}</Title>
                            {apps.data !== undefined && apps.data.webhookUrl === '' ? <p className='px-4 py-4 text-[12.5px] text-muted sm:px-6'>{t`No webhook receiver is set.`}</p> : null}
                            {apps.data?.deliveries.recent.slice(0, 6).map((delivery) => (
                                <div key={delivery.id} className='flex h-9 items-center gap-2.5 border-b border-line/60 px-4 sm:px-6'>
                                    <DeliveryState state={delivery.state} />
                                    <span className='truncate font-mono text-[12px]'>{delivery.type}</span>
                                    <span className='ms-auto shrink-0 text-[12px] text-muted'>{ago(delivery.finishedAt ?? delivery.occurredAt)}</span>
                                </div>
                            ))}
                        </aside>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
