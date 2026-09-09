import { Body, Controller, Delete, Get, Param, Post, UseGuards, Version } from "@nestjs/common";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Version("1")
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Version("1")
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Version("1")
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.usersService.remove(id);
  }
}
