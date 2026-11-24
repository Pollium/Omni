import { ReactNode } from 'react';

const Empty = ({ children }: { children: ReactNode }) => <p className='px-4 py-10 text-center text-[13px] text-muted'>{children}</p>;

export default Empty;
