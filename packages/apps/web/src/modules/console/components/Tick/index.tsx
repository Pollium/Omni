import { Check } from 'lucide-react';

const Tick = ({ isOn }: { isOn: boolean }) => (isOn ? <Check className='ms-auto size-3.5 shrink-0' aria-hidden='true' /> : <span className='ms-auto size-3.5 shrink-0' />);

export default Tick;
