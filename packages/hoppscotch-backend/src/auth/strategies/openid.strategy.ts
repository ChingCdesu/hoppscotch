import {
  Client,
  Issuer,
  Strategy,
  TokenSet,
  UserinfoResponse,
} from 'openid-client';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { UserService } from 'src/user/user.service';
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OpenidStrategy extends PassportStrategy(Strategy, 'openid') {
  private _client: Client;

  constructor(
    private authService: AuthService,
    private usersService: UserService,
    private configService: ConfigService,
  ) {
    const issuer = new Issuer({
      issuer: configService.get('INFRA.OPENID_ISSUER_URL'),
      authorization_endpoint: configService.get(
        'INFRA.OPENID_AUTHORIZATION_ENDPOINT',
      ),
      token_endpoint: configService.get('INFRA.OPENID_TOKEN_ENDPOINT'),
      userinfo_endpoint: configService.get('INFRA.OPENID_USERINFO_ENDPOINT'),
      end_session_endpoint: configService.get(
        'INFRA.OPENID_END_SESSION_ENDPOINT',
      ),
      jwks_uri: configService.get('INFRA.OPENID_JWKS_URI'),
    });
    const client = new issuer.Client({
      client_id: configService.get('INFRA.OPENID_CLIENT_ID'),
      client_secret: configService.get('INFRA.OPENID_CLIENT_SECRET'),
    });
    super({
      client,
      params: {
        scope: configService.get('INFRA.OPENID_SCOPE'),
        redirect_uri: configService.get('INFRA.OPENID_CALLBACK_URL'),
      },
    });
    this._client = client;
  }

  async validate(token_set: TokenSet) {
    const userinfo = await this._client.userinfo(token_set);

    const profile = {
      emails: [{ value: userinfo.email }],
      displayName: userinfo.given_name,
      provider: 'openid',
      id: userinfo.sub,
    };

    const user = await this.usersService.findUserByEmail(userinfo.email);

    if (O.isNone(user)) {
      const createdUser = await this.usersService.createUserSSO(
        token_set.access_token,
        token_set.refresh_token,
        profile,
      );
      return createdUser;
    }

    /**
     * * displayName and photoURL maybe null if user logged-in via magic-link before SSO
     */
    if (!user.value.displayName || !user.value.photoURL) {
      const updatedUser = await this.usersService.updateUserDetails(
        user.value,
        profile,
      );
      if (E.isLeft(updatedUser)) {
        throw new UnauthorizedException(updatedUser.left);
      }
    }

    /**
     * * Check to see if entry for Github is present in the Account table for user
     * * If user was created with another provider findUserByEmail may return true
     */
    const providerAccountExists =
      await this.authService.checkIfProviderAccountExists(user.value, userinfo);

    if (O.isNone(providerAccountExists))
      await this.usersService.createProviderAccount(
        user.value,
        token_set.access_token,
        token_set.refresh_token,
        profile,
      );

    return user.value;
  }
}
