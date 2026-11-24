import { ConsoleOutlet } from '@/modules/console/contracts/console';
import { useOutletContext } from 'react-router-dom';

export const useConsole = (): ConsoleOutlet => useOutletContext<ConsoleOutlet>();
