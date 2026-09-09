import { ConflictException, Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";

const SAFE_SELECT = {
  id: true,
  username: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({ select: SAFE_SELECT, orderBy: { username: "asc" } });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (existing) {
      throw new ConflictException("El nombre de usuario ya existe");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: { username: dto.username, passwordHash, role: dto.role },
      select: SAFE_SELECT,
    });
  }

  async remove(id: string) {
    await this.prisma.user.delete({ where: { id } });
  }
}
