import { ConsoleDeliveryState } from '@omni/contracts/console/domain';
import { useLingui } from '@lingui/react/macro';
import { CircleCheck, CircleDashed, CircleX, RotateCw } from 'lucide-react';

const DeliveryState = ({ state }: { state: ConsoleDeliveryState }) => {
    const { t } = useLingui();
    const looks = {
        delivered: { icon: CircleCheck, tone: 'text-success', label: t`Delivered` },
        failed: { icon: CircleX, tone: 'text-danger', label: t`Not delivered` },
        retrying: { icon: RotateCw, tone: 'text-warning', label: t`Retrying` },
        pending: { icon: CircleDashed, tone: 'text-muted', label: t`Queued` }
    }[state];

    return <looks.icon className={`size-3.5 shrink-0 ${looks.tone}`} role='img' aria-label={looks.label} />;
};

export default DeliveryState;
