import { Mapper } from '../imageopto-types';

/**
 * @hidden
 */
const blur: Mapper = (sharp, params) => {
  const [sigma] = params.toNumbers(['blur']) as [number];
  if (isNaN(sigma) || sigma < 1 || sigma > 1000) {
    params.warn('invalid', 'blur', 'must be 1-1000. Will not blur');
    return false;
  }
  return sharp.blur(sigma);
};

export default blur;
