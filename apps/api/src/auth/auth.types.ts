import { Role } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: Role;
  /** "user" = JWT de sesion (id referencia users.id); "apikey" = ApiKey.id, no es un usuario real. */
  authType: "user" | "apikey";
}

export interface AccessTokenPayload {
  sub: string;
  username: string;
  role: Role;
}

/** Id a usar en columnas FK hacia `users` (createdBy/requestedBy): null para API keys, que no son usuarios reales. */
export function ownerUserId(user: AuthenticatedUser): string | undefined {
  return user.authType === "user" ? user.id : undefined;
}
