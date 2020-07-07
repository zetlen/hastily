import test from 'ava';
import debug from 'debug';
import { createLogger } from './logging';
import { Logger } from 'pino';

test.afterEach(() => {
  debug.disable();
  debug.enable(process.env.DEBUG || '');
});

test('respects DEBUG=hastily:*', (t) => {
  debug.enable('hastily:*');
  const log: Logger = createLogger('anything');
  t.is(log.level, 'debug');
});

test('respects DEBUG:hastily:something', (t) => {
  debug.enable('hastily:something');
  t.is(createLogger('anything').level, 'warn');
  t.is(createLogger('something').level, 'debug');
});

test('does not log warnings in prod', (t) => {
  const oldNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  t.is(createLogger('anything').level, 'error');
  process.env.NODE_ENV = oldNodeEnv;
});
