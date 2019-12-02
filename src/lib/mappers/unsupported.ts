import { FastlyCompatError } from '../errors';
import { Mapper, Param, Params } from '../imageopto-types';

/**
 * @hidden
 */
const unsupported = (param: Param, msg: string): Mapper => (
  _,
  params: Params
) => {
  throw new FastlyCompatError(params, param, msg);
};

export default unsupported;
