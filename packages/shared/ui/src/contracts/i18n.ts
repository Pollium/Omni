import { Messages } from '@lingui/core';

export interface Catalog{
    messages: Messages;
}

export type Catalogs = Record<string, () => Promise<Catalog>>;
