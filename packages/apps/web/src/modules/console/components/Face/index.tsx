import { AvatarFallback, AvatarImage, AvatarRoot } from '@heroui/react';

interface FaceProps{
    name: string;
    src?: string | null;
    size?: number;
}

const hueOf = (name: string): number => [...name].reduce((sum, char) => sum + char.charCodeAt(0) * 7, 0) % 360;

const initialsOf = (name: string): string => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();

const Face = ({ name, src = null, size = 20 }: FaceProps) => (
    <AvatarRoot className='shrink-0' style={{ width: size, height: size, minWidth: size }}>
        {src === null ? null : <AvatarImage src={src} alt='' />}
        <AvatarFallback className='font-medium text-white' style={{ background: `oklch(0.6 0.1 ${hueOf(name)})`, fontSize: Math.max(8, size * 0.4) }}>
            {initialsOf(name)}
        </AvatarFallback>
    </AvatarRoot>
);

export default Face;
