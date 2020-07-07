import debug from 'debug';
import pino, { Logger, LoggerOptions } from 'pino';
import { Request } from 'express';

export function createLogger(label: string): Logger {
  // Respect the usual DEBUG=hastily:* environment vars
  const name = `hastily:${label}`;
  const debugging = debug(name).enabled;
  const level = debugging
    ? 'debug'
    : process.env.NODE_ENV === 'production'
    ? 'error'
    : 'warn';
  const options: LoggerOptions = {
    name,
    level,
    prettyPrint: debugging,
    serializers: {
      ...pino.stdSerializers,
      req: (req: Request) => req.originalUrl,
    },
  };

  return pino(options, pino.destination(2));
}
