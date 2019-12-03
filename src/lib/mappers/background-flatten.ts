import { Mapper } from '../imageopto-types';

/**
 * @hidden
 */
const bgFlatten: Mapper = (sharp, params) => {
  try {
    return sharp.flatten({ background: params.toColor('bg-color') });
  } catch (e) {
    return false;
  }
};

export default bgFlatten;
