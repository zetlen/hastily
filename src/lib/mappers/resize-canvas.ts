import { Color, ResizeOptions } from 'sharp';
import { Mapper } from '../imageopto-types';

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
  const options = ({
    background,
    fit: 'contain',
    withoutEnlargement: true
  } as unknown) as ResizeOptions;
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
  return sharp.resize(region.width, region.height, options);
};

export default resizeCanvas;
