import * as http from "node:http";
import { Logger } from "@nestjs/common";

/**
 * Puerto separado para consumo externo (integraciones, sistemas de terceros): reenvia al puerto
 * interno de la API, pero SOLO si trae x-api-key y no toca auth/users/api-keys (login de usuario
 * y gestion de cuentas/keys quedan fuera de este puerto, aunque el caller tenga una key admin).
 * Es un proxy de un solo salto a nivel HTTP crudo, antes de que la request llegue a Fastify/Nest -
 * la validez de la key la sigue verificando ApiKeyAuthGuard como siempre.
 */
const BLOCKED_PREFIXES = ["/api/v1/auth", "/api/v1/users", "/api/v1/api-keys"];

export function startExternalGateway(externalPort: number, internalPort: number, internalHost = "127.0.0.1") {
  const logger = new Logger("ExternalGateway");

  const server = http.createServer((req, res) => {
    const path = req.url ?? "/";

    if (BLOCKED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "No encontrado" }));
      return;
    }

    if (!req.headers["x-api-key"]) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Este puerto es solo para consumo externo con x-api-key" }));
      return;
    }

    const headers = { ...req.headers };
    delete headers.authorization; // el login de usuario (JWT) no aplica en este puerto, aunque venga
    headers.host = `${internalHost}:${internalPort}`;

    const proxyReq = http.request(
      { host: internalHost, port: internalPort, path, method: req.method, headers },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );

    proxyReq.on("error", (err) => {
      logger.error(`Error reenviando ${req.method} ${path}: ${err.message}`);
      if (!res.headersSent) res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Error interno del gateway externo" }));
    });

    req.pipe(proxyReq);
  });

  server.listen(externalPort, "0.0.0.0", () => {
    logger.log(`Gateway externo (solo x-api-key) escuchando en http://0.0.0.0:${externalPort}`);
  });

  return server;
}
