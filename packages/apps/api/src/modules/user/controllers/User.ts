import AvatarService from '../services/account/Avatar';
import UserService from '../services/account/User';
import AuthenticatedController from '@readable/auth/AuthenticatedController';
import { CurrentUser } from '@readable/auth/CurrentUser';
import { UploadedFile as UploadedFilePayload } from '@readable/contracts/upload';
import { Controller } from '@readable/decorators/controllers/Controller';
import { Body, UploadedFile } from '@readable/decorators/controllers/RequestParams';
import { Route } from '@readable/decorators/controllers/Route';
import { ChangeEmailInput, ChangePasswordInput, ChangePhoneInput, SetActiveOrganizationInput, UpdateProfileInput } from '@omni/contracts/user/http';
import { userRoutes } from '@omni/contracts/user/routes';

@Controller('')
export default class UserController extends AuthenticatedController{
    #service = new UserService();
    #avatar = new AvatarService();

    @Route(userRoutes.me)
    getProfile(@CurrentUser() userId: string){
        return this.#service.getProfile(userId);
    }

    @Route(userRoutes.updateProfile)
    updateProfile(@CurrentUser() userId: string, @Body() body: UpdateProfileInput){
        return this.#service.updateProfile(userId, body);
    }

    @Route(userRoutes.changePassword)
    changePassword(@CurrentUser() userId: string, @Body() body: ChangePasswordInput){
        return this.#service.changePassword(userId, body);
    }

    @Route(userRoutes.changeEmail)
    changeEmail(@CurrentUser() userId: string, @Body() body: ChangeEmailInput){
        return this.#service.changeEmail(userId, body);
    }

    @Route(userRoutes.changePhone)
    changePhone(@CurrentUser() userId: string, @Body() body: ChangePhoneInput){
        return this.#service.changePhone(userId, body);
    }

    @Route(userRoutes.uploadAvatar)
    uploadAvatar(@CurrentUser() userId: string, @UploadedFile() file: UploadedFilePayload){
        return this.#avatar.replace(userId, file.buffer);
    }

    @Route(userRoutes.deleteMe)
    deleteProfile(@CurrentUser() userId: string){
        return this.#service.deleteProfile(userId);
    }

    @Route(userRoutes.setActiveOrganization)
    setActiveOrganization(@CurrentUser() userId: string, @Body() body: SetActiveOrganizationInput){
        return this.#service.setActiveOrganization(userId, body);
    }
}
