import { MParam, MParams, Mapper } from '../mapping-types';
import { FastlyCompatError } from '../errors';

const unsupported = (param: MParam, msg: string): Mapper => (
  _,
  params: MParams
) => {
  throw new FastlyCompatError(params, param, msg);
};

export default unsupported;
