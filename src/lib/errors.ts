import { Param, Params } from './imageopto-types';

/**
 * @hidden
 */
export class FastlyParamError extends Error {
  constructor(params: Params, name: Param, customMessage?: string) {
    let message = `"${name}" cannot be "${params.get(name)}"`;
    if (customMessage) {
      message += `: ${customMessage}`;
    }
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * @hidden
 */
export class FastlyCompatError extends FastlyParamError {
  constructor(params: Params, name: Param, feature: string) {
    super(
      params,
      name,
      `Fastly imageopto ${feature} unsupported by node-hastily`
    );
  }
}
