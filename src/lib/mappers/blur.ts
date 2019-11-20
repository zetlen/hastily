import { Mapper } from '../imageopto-types';
import { paramsToNumbers } from '../helpers';
import { FastlyParamError } from '../errors';

const blur: Mapper = (sharp, params) => {
  const [sigma] = paramsToNumbers(params, ['blur']) as [number];
  if (sigma < 1 || sigma > 1000) {
    throw new FastlyParamError(params, 'blur', `must be 1-1000`);
  }
  return sharp.blur(sigma);
};

export default blur;
