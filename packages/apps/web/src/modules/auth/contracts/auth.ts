import { Instance, InstanceApp } from '@omni/contracts/instance/domain';

export interface AuthFlow{
    instance: Instance;
    app: InstanceApp;
    next: string | null;
}
