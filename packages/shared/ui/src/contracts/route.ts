import { ComponentType } from 'react';

export interface PageModule{
    default: ComponentType;
}

export type PageLoader = () => Promise<PageModule>;
