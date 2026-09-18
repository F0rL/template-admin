import { Type, type Static } from 'typebox'

export const envSchema = Type.Object({
  NODE_ENV: Type.Union([
    Type.Literal('development'),
    Type.Literal('production'),
    Type.Literal('test'),
  ]),
  PORT: Type.Number({ default: 3000 }),
  DATABASE_URL: Type.String(),
  DB_POOL_SIZE: Type.Number({ default: 10 }),
  REDIS_URL: Type.String(),
  BETTER_AUTH_SECRET: Type.String({ minLength: 32 }),
  BETTER_AUTH_URL: Type.String(),
  WEB_ORIGIN: Type.String(),
  LOG_LEVEL: Type.Optional(Type.String({ default: 'info' })),
})

export type Env = Static<typeof envSchema>
