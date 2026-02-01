import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsEnum, IsOptional, validateSync, IsUrl } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  // Database
  @IsString()
  DATABASE_URL: string;

  // Redis
  @IsString()
  REDIS_HOST: string;

  @IsNumber()
  @IsOptional()
  REDIS_PORT: number = 6379;

  // RabbitMQ
  @IsString()
  RABBITMQ_URL: string;

  // JWT
  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '7d';

  // GLPI
  @IsUrl({ require_tld: false })
  GLPI_URL: string;

  @IsString()
  GLPI_APP_TOKEN: string;

  @IsString()
  GLPI_USER_TOKEN: string;

  // Frontend
  @IsString()
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:5173';

  // Backend
  @IsString()
  @IsOptional()
  BACKEND_URL: string = 'http://localhost:3000';

  // WhatsApp Bot
  @IsString()
  @IsOptional()
  BOT_PHONE: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors.map((error) => {
      const constraints = Object.values(error.constraints || {}).join(', ');
      return `${error.property}: ${constraints}`;
    });

    throw new Error(
      `❌ Environment validation failed:\n${messages.join('\n')}\n\nPlease check your .env file.`
    );
  }

  return validatedConfig;
}
