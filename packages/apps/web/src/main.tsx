import '@/assets/styles/index.css';
import { mountApp } from '@omni/ui/app/mount';
import { Catalog } from '@omni/ui/contracts/i18n';
import { router } from '@/app/router';

void mountApp({
    router,
    catalogs: import.meta.glob<Catalog>('./locales/*/*.po')
});
