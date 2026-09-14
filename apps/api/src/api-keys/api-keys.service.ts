import { Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes, createHash } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateApiKeyDto } from "./dto/create-api-key.dto";

const SAFE_SELECT = {
  id: true,
  name: true,
  prefix: true,
  role: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
} as const;

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.apiKey.findMany({ select: SAFE_SELECT, orderBy: { createdAt: "desc" } });
  }

  async create(dto: CreateApiKeyDto, createdById: string | undefined) {
    const rawKey = `siasa_${randomBytes(32).toString("base64url")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const prefix = rawKey.slice(0, 14);

    const apiKey = await this.prisma.apiKey.create({
      data: { name: dto.name, role: dto.role, keyHash, prefix, createdById },
      select: SAFE_SELECT,
    });

    // El valor crudo solo existe en este response; keyHash es lo unico que persiste.
    return { ...apiKey, key: rawKey };
  }

  async revoke(id: string) {
    const apiKey = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!apiKey) {
      throw new NotFoundException("API key no encontrada");
    }

    return this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
      select: SAFE_SELECT,
    });
  }
}
