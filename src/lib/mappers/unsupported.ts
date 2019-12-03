import { Mapper, Param } from '../imageopto-types';

/**
 * @hidden
 */
const unsupported = (param: Param, msg: string): Mapper => (_, params) => {
  params.warn('unsupported', param, msg);
  return false;
};

export default unsupported;
