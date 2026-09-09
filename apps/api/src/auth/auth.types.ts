import { Role } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: Role;
}

export interface AccessTokenPayload {
  sub: string;
  username: string;
  role: Role;
}
