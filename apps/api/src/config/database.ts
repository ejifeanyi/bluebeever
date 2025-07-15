import { PrismaClient } from "@prisma/client";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const buildConnectionUrl = (baseUrl: string) => {
  const url = new URL(baseUrl);
  url.searchParams.set("connection_limit", env.DB_CONNECTION_LIMIT.toString());
  url.searchParams.set("connect_timeout", env.DB_CONNECT_TIMEOUT.toString());
  url.searchParams.set("pool_timeout", env.DB_POOL_TIMEOUT.toString());
  url.searchParams.set(
    "max_connection_lifetime",
    env.DB_MAX_CONNECTION_LIFETIME.toString()
  );
  url.searchParams.set(
    "max_idle_lifetime",
    env.DB_MAX_IDLE_LIFETIME.toString()
  );
  return url.toString();
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: buildConnectionUrl(env.DATABASE_URL),
      },
    },
    log:
      env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["error"],
  });

export const dbConfig = {
  connectionLimit: env.DB_CONNECTION_LIMIT,
  connectTimeout: env.DB_CONNECT_TIMEOUT,
  poolTimeout: env.DB_POOL_TIMEOUT,
  maxConnectionLifetime: env.DB_MAX_CONNECTION_LIFETIME,
  maxIdleLifetime: env.DB_MAX_IDLE_LIFETIME,
};

export const disconnectDb = async () => {
  await prisma.$disconnect();
};

process.on("SIGTERM", disconnectDb);
process.on("SIGINT", disconnectDb);

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
