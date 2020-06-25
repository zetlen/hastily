import makeDebug from 'debug';
import { FitEnum, KernelEnum, ResizeOptions } from 'sharp';
import { Mapper, Param } from '../imageopto-types';

const debug = makeDebug('hastily:resize');

export const optoFitToSharp: Record<string, keyof FitEnum> = {
  bounds: 'inside',
  cover: 'outside',
  crop: 'cover',
};

// sharp supports mitchell interpolation and not bilinear,
// but who's gonna notice?
export const optoResizeFilterToSharp: Record<string, keyof KernelEnum> = {
  bicubic: 'cubic',
  bilinear: 'mitchell',
  cubic: 'cubic',
  lanczos: 'lanczos3',
  lanczos2: 'lanczos2',
  lanczos3: 'lanczos3',
  linear: 'mitchell',
  nearest: 'nearest',
};

/**
 * @hidden
 */
const resize: Mapper = (sharp, params) => {
  if (!params.has('width')) {
    params.warn(
      'unsupported',
      'width',
      'resize without width param. Will not resize.'
    );
    return false;
  }
  const nums = params.toNumbers(['width', 'height', 'dpr']);
  const width: number = nums[0] as number;
  let height: number | undefined = nums[1] as number;
  const dpr = nums[2];
  for (const [name, param] of [
    ['width', width],
    ['height', height],
  ]) {
    if (param < 1 && param > 0) {
      params.warn(
        'unsupported',
        name as Param,
        'ratio-based resize/crop. Will not apply.'
      );
      return false;
    }
  }
  if (isNaN(width)) {
    params.warn('invalid', 'width', 'resize with non-numeric width param');
    return false;
  }
  if (isNaN(height)) {
    height = undefined;
  }
  debug('width %s, height %s, dpr %s', width, height, dpr);
  const options: ResizeOptions = {
    withoutEnlargement: true,
  };
  if (params.has('fit')) {
    const fitOpt = params.get('fit') as string;
    const fit = optoFitToSharp[fitOpt];
    if (fit) {
      options.fit = fit;
    } else {
      params.warn('unsupported', 'fit');
    }
    debug('mapped options.fit from %s -> %s', fitOpt, options.fit);
  } else if (typeof height === 'number' && height > 0) {
    options.fit = 'fill';
  }
  if (params.get('enable') === 'true' || params.get('disable') === 'false') {
    debug('overriding withoutEnlargement to false, yucky enlargement enabled');
    options.withoutEnlargement = false;
  }
  if (params.has('resize-filter')) {
    const filterOpt = params.get('resize-filter') as string;
    const kernel = optoResizeFilterToSharp[filterOpt];
    if (kernel) {
      options.kernel = kernel;
    } else {
      params.warn('unsupported', 'fit');
    }
    debug(
      'mapped options.resize-filter from %s -> %s',
      filterOpt,
      options.kernel
    );
  }
  debug('sharp.resize(%s, %s, %o)', width, height, options);
  return sharp.resize(width, height, options);
};

export default resize;
