import { Region } from 'sharp';
import { FastlyCompatError } from '../errors';
import { regionFromParam } from '../helpers';
import { Mapper } from '../imageopto-types';

/**
 * @hidden
 */
const extractCrop: Mapper = (sharp, params) => {
  const region = regionFromParam(params, 'crop');
  if (region.left === undefined || region.top === undefined) {
    throw new FastlyCompatError(
      params,
      'crop',
      'relative image cropping to center without absolute x and y params'
    );
  }
  return sharp.extract(region as Region);
};

export default extractCrop;
