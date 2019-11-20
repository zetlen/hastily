import { MParams, MParam } from './mapping-types';

export class FastlyParamError extends Error {
  constructor(params: MParams, name: MParam, customMessage?: string) {
    let message = `"${name}" cannot be "${params.get(name)}"`;
    if (customMessage) {
      message += `: ${customMessage}`;
    }
    super(message);
    Error.captureStackTrace(this, FastlyCompatError);
  }
}

export class FastlyCompatError extends FastlyParamError {
  constructor(params: MParams, name: MParam, feature: string) {
    super(
      params,
      name,
      `Fastly imageopto ${feature} unsupported by node-hastily`
    );
  }
}
