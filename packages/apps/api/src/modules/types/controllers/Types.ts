import TypesService from '../services/Types';
import BaseController from '@readable/controllers/BaseController';
import { Controller } from '@readable/decorators/controllers/Controller';
import { Route } from '@readable/decorators/controllers/Route';
import { Middleware } from '@readable/decorators/middleware/Middleware';
import { ServiceKeyRoute } from '@readable/http/ServiceKeyRoute';
import { typeRoutes } from '@omni/contracts/types/routes';
import { config } from '@/shared/config';

@Controller('')
@Middleware(ServiceKeyRoute(config.serviceKeyHeader, config.serviceKey))
export default class TypesController extends BaseController{
    #types = new TypesService();

    @Route(typeRoutes.bundle)
    bundle(){
        return this.#types.bundle();
    }
}
