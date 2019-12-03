import { Region } from 'sharp';
import { Mapper } from '../imageopto-types';

/**
 * @hidden
 */
const extractCrop: Mapper = (sharp, params) => {
  let region;
  try {
    region = params.toRegion('crop');
  } catch (e) {
    return false;
  }
  if (region.left === undefined || region.top === undefined) {
    params.warn(
      'unsupported',
      'crop',
      'relative image cropping to center without absolute x and y params. Will not crop.'
    );
    return false;
  }
  return sharp.extract(region as Region);
};

export default extractCrop;
