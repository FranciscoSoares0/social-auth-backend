import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { User } from './schema/user.schema';

@Controller('users')
export class UsersController {

    constructor(private readonly usersService: UsersService){}

    @Post()
    async createUser(@Body() request: CreateUserDto) {
        await this.usersService.createUser(request);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getUsers(
        @CurrentUser() user: User
    ){
        console.log(user);
        return this.usersService.getUsers();
    }
}
