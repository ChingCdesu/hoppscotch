import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthProvider, authProviderCheck, throwHTTPErr } from '../helper';
import { Observable } from 'rxjs';
import { AUTH_PROVIDER_NOT_SPECIFIED } from 'src/errors';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OpenidSSOGuard extends AuthGuard('openid') implements CanActivate {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    if (
      !authProviderCheck(
        AuthProvider.OPENID,
        this.configService.get('INFRA.VITE_ALLOWED_AUTH_PROVIDERS'),
      )
    ) {
      throwHTTPErr({ message: AUTH_PROVIDER_NOT_SPECIFIED, statusCode: 404 });
    }

    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();

    return {
      redirect: req.query.redirect_uri,
    };
  }
}
