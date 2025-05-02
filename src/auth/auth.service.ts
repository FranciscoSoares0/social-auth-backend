import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { Response } from 'express';
import { User } from 'src/users/schema/user.schema';
import { UsersService } from 'src/users/users.service';
import { TokenPayload } from './token-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async login(user: User, response: Response, redirect = false) {
    //calculate expiration date for access token
    const expiresAcessToken = new Date();
    expiresAcessToken.setMilliseconds(
      expiresAcessToken.getTime() +
        parseInt(
          this.configService.getOrThrow(
            'JWT_ACCESS_TOKEN_EXPIRATION_MS',
          ),
        ),
    );

    //calculate expiration date for refresh token
    const expiresRefreshToken = new Date();
    expiresRefreshToken.setMilliseconds(
        expiresRefreshToken.getTime() +
        parseInt(
          this.configService.getOrThrow(
            'JWT_REFRESH_TOKEN_EXPIRATION_MS',
          ),
        ),
    );
    
    const tokenPayload: TokenPayload = {
        userId: user._id.toHexString(),
    };

    //create access token
    const accessToken = this.jwtService.sign(tokenPayload, {
      secret: this.configService.getOrThrow(
        'JWT_ACCESS_TOKEN_SECRET',
      ),
      expiresIn: `${this.configService.getOrThrow('JWT_ACCESS_TOKEN_EXPIRATION_MS')}ms`,

    });

    //create refresh token
    const refreshToken = this.jwtService.sign(tokenPayload, {
        secret: this.configService.getOrThrow(
            'JWT_REFRESH_TOKEN_SECRET',
          ),
          expiresIn: `${this.configService.getOrThrow('JWT_REFRESH_TOKEN_EXPIRATION_MS')}ms`,
    });

    await this.usersService.updateUser(
        {
            _id: user._id,
        },
        {
           $set:{ refreshToken: await hash(refreshToken, 10) },
        }
    )

    response.cookie('access_token', accessToken,{
      httpOnly: true,
      secure: this.configService.getOrThrow('NODE_ENV') === 'production',
      expires: expiresAcessToken,
    });

    response.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: this.configService.getOrThrow('NODE_ENV') === 'production',
        expires: expiresRefreshToken,
      });

      if (redirect) {
        response.redirect(this.configService.getOrThrow('AUTH_UI_REDIRECT'));
      }
  }

  async verifyUser(email: string, password: string) {
    try {
      const user = await this.usersService.getUser({ email });
      const authenticated = await compare(password, user.password);
      if (!authenticated) {
        throw new UnauthorizedException();
      }
      return user;
    } catch (e) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async verifyUserRefreshToken(refreshToken: string, userId: string){
    try{
        const user = await this.usersService.getUser({ _id: userId });
        const authenticated = await compare(refreshToken, user.refreshToken!);
        if (!authenticated) {
            throw new UnauthorizedException();
        }
        return user;
    }
    catch(e){
        throw new UnauthorizedException('Invalid Refresh Token');
    }
  }
}
