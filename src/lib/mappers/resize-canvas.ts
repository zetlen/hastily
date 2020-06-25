import makeDebug from 'debug';
import { Color, ResizeOptions } from 'sharp';
import { Mapper } from '../imageopto-types';
import { optoFitToSharp } from './resize';

const debug = makeDebug('hastily:resize-canvas');
/**
 * @hidden
 */
const resizeCanvas: Mapper = (sharp, params) => {
  let background: Color = 'white';
  if (params.has('bg-color')) {
    try {
      background = params.toColor('bg-color');
    } catch (e) {
      // let it be the original;
    }
  }
  const options: Partial<ResizeOptions> = {
    background,
    fit: 'contain',
    withoutEnlargement: false,
  };
  let region;
  try {
    region = params.toRegion('canvas');
  } catch (e) {
    return false;
  }
  if (Number(region.left) > 0 || Number(region.top) > 0) {
    params.warn(
      'unsupported',
      'canvas',
      'pixel-specific (greater than 0) canvas offsets. Will not apply canvas.'
    );
    return false;
  }
  const positions: string[] = [];
  if (region.left === 0) {
    positions.push('left');
  }
  if (region.top === 0) {
    positions.push('top');
  }
  if (positions.length > 0) {
    options.position = positions.join(' ');
  }
  if (params.has('fit')) {
    const fitOpt = params.get('fit') as string;
    const fit = optoFitToSharp[fitOpt];
    if (fit) {
      options.fit = fit;
    } else {
      params.warn('unsupported', 'fit');
    }
  }
  debug('sharp.resize(%s, %s, %o)', region.width, region.height, options);
  return sharp.resize(region.width, region.height, options);
};

export default resizeCanvas;
