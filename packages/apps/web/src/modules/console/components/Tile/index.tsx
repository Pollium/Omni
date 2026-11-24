import { ReactNode, SVGProps } from 'react';

const Tile = ({ icon: Icon }: { icon: (props: SVGProps<SVGSVGElement>) => ReactNode }) => (
    <span className='grid size-7 shrink-0 place-items-center rounded-md border border-line text-muted'>
        <Icon className='size-[15px]' aria-hidden='true' />
    </span>
);

export default Tile;
