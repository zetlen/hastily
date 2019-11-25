import makeDebug from 'debug';
import { FitEnum, KernelEnum, ResizeOptions } from 'sharp';
import { FastlyCompatError, FastlyParamError } from '../errors';
import { paramsToNumbers } from '../helpers';
import { Mapper, Param } from '../imageopto-types';

const debug = makeDebug('hastily:resize');

const optoFitToSharp: Record<string, keyof FitEnum> = {
  bounds: 'contain',
  cover: 'outside',
  crop: 'cover'
};

// sharp supports mitchell interpolation and not bilinear,
// but who's gonna notice?
const optoResizeFilterToSharp: Record<string, keyof KernelEnum> = {
  bicubic: 'cubic',
  bilinear: 'mitchell',
  cubic: 'cubic',
  lanczos: 'lanczos3',
  lanczos2: 'lanczos2',
  lanczos3: 'lanczos3',
  linear: 'mitchell',
  nearest: 'nearest'
};

const resize: Mapper = (sharp, params) => {
  if (!params.has('width')) {
    debug('resize called without width param');
    return sharp;
  }
  const nums = paramsToNumbers(params, ['width', 'height', 'dpr']);
  let [width, height] = nums;
  const dpr = nums[2];
  for (const [name, param] of [
    ['width', width],
    ['height', height]
  ]) {
    if (param && param < 1 && param > 0) {
      throw new FastlyCompatError(
        params,
        name as Param,
        'ratio-based resize/crop'
      );
    }
  }
  debug('width %s, height %s, dpr %s', width, height, dpr);
  if (dpr) {
    if (dpr < 1) {
      throw new FastlyParamError(
        params,
        'dpr',
        'dot pixel ratio must be above 1'
      );
    }
    if (width) {
      width *= dpr;
      debug('width *= dpr == %s', width);
    }
    if (height) {
      height *= dpr;
      debug('height *= dpr == %s', height);
    }
  }
  const options: ResizeOptions = {
    withoutEnlargement: true
  };
  if (params.has('fit')) {
    const fitOpt = params.get('fit') as string;
    options.fit = optoFitToSharp[fitOpt];
    debug('mapped options.fit from %s -> %s', fitOpt, options.fit);
  }
  if (params.get('enable') === 'true' || params.get('disable') === 'false') {
    debug('overriding withoutEnlargement to false, yucky enlargement enabled');
    options.withoutEnlargement = false;
  }
  if (params.has('resize-filter')) {
    const filterOpt = params.get('resize-filter') as string;
    options.kernel = optoResizeFilterToSharp[filterOpt];
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
