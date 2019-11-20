import { Params, Param } from './imageopto-types';

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

export class FastlyCompatError extends FastlyParamError {
  constructor(params: Params, name: Param, feature: string) {
    super(
      params,
      name,
      `Fastly imageopto ${feature} unsupported by node-hastily`
    );
  }
}
