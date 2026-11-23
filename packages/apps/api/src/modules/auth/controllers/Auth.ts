import AuthService from '../services/session/Auth';
import PasswordResetService from '../services/session/PasswordReset';
import BaseController from '@readable/controllers/BaseController';
import { Controller } from '@readable/decorators/controllers/Controller';
import { Body, Query } from '@readable/decorators/controllers/RequestParams';
import { Route } from '@readable/decorators/controllers/Route';
import { Status } from '@readable/decorators/controllers/Status';
import { RateLimit } from '@readable/decorators/middleware/RateLimit';
import { SignInInput, SignUpInput, ForgotPasswordInput, ResetPasswordInput } from '@omni/contracts/auth/http';
import { authRoutes } from '@omni/contracts/auth/routes';

@Controller('')
export default class AuthController extends BaseController{
    #service = new AuthService();
    #passwordReset = new PasswordResetService();

    @Route(authRoutes.signIn)
    @RateLimit({ max: 5, window: '1m' })
    signIn(@Body() body: SignInInput){
        return this.#service.signIn(body);
    }

    @Route(authRoutes.signUp)
    @RateLimit({ max: 5, window: '1h' })
    @Status(201)
    signUp(@Body() body: SignUpInput){
        return this.#service.signUp(body);
    }

    @Route(authRoutes.checkEmail)
    @RateLimit({ max: 30, window: '1m' })
    checkEmail(@Query('email') email: string | undefined){
        return this.#service.checkEmail(email);
    }

    @Route(authRoutes.forgotPassword)
    @RateLimit({ max: 3, window: '15m' })
    forgotPassword(@Body() body: ForgotPasswordInput){
        return this.#passwordReset.requestReset(body);
    }

    @Route(authRoutes.resetPassword)
    @RateLimit({ max: 10, window: '15m' })
    resetPassword(@Body() body: ResetPasswordInput){
        return this.#passwordReset.resetPassword(body);
    }
}
