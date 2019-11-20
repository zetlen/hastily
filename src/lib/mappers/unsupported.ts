import { Param, Params, Mapper } from '../imageopto-types';
import { FastlyCompatError } from '../errors';

const unsupported = (param: Param, msg: string): Mapper => (
  _,
  params: Params
) => {
  throw new FastlyCompatError(params, param, msg);
};

export default unsupported;
