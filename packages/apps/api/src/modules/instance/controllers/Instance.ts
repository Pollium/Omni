import BaseController from '@readable/controllers/BaseController';
import { Controller } from '@readable/decorators/controllers/Controller';
import { Route } from '@readable/decorators/controllers/Route';
import { Instance } from '@omni/contracts/instance/domain';
import { instanceRoutes } from '@omni/contracts/instance/routes';
import { configuredProviders } from '@/modules/auth/providers/registry';
import { config } from '@/shared/config';

@Controller('')
export default class InstanceController extends BaseController{
    @Route(instanceRoutes.get)
    get(): Instance{
        return {
            name: config.name,
            apps: [...config.apps],
            console: config.console.app,
            providers: configuredProviders(),
            termsUrl: config.termsUrl,
            privacyUrl: config.privacyUrl
        };
    }
}
