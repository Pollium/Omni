import AvatarService from '../services/account/Avatar';
import BaseController from '@readable/controllers/BaseController';
import { Controller } from '@readable/decorators/controllers/Controller';
import { IdParam } from '@readable/decorators/controllers/RequestParams';
import { Route } from '@readable/decorators/controllers/Route';
import { userRoutes } from '@omni/contracts/user/routes';

@Controller('')
export default class AvatarController extends BaseController{
    #service = new AvatarService();

    @Route(userRoutes.avatar)
    read(@IdParam('userId') userId: string){
        return this.#service.read(userId);
    }
}
