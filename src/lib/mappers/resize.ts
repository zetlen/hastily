import { MParam, Mapper } from '../mapping-types';
import { FastlyCompatError, FastlyParamError } from '../errors';
import { paramsToNumbers } from '../helpers';
import { FitEnum, ResizeOptions, KernelEnum } from 'sharp';

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
  if (!params.has('width') || !params.has('height')) {
    return sharp;
  }
  let [width, height, dpr] = paramsToNumbers(params, [
    'width',
    'height',
    'dpr'
  ]);
  for (let [name, param] of [
    ['width', width],
    ['height', height]
  ]) {
    if (param && param < 1 && param > 0) {
      throw new FastlyCompatError(
        params,
        <MParam>name,
        'ratio-based resize/crop'
      );
    }
  }
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
    }
    if (height) {
      height *= dpr;
    }
  }
  const options: ResizeOptions = {
    withoutEnlargement: true
  };
  if (params.has('fit')) {
    options.fit = optoFitToSharp[<string>params.get('fit')];
  }
  if (params.get('enable') === 'true' || params.get('disable') === 'false')
    if (params.has('resize-filter')) {
      options.kernel =
        optoResizeFilterToSharp[<string>params.get('resize-filter')];
    }
  return sharp.resize(width, height, options);
};

export default resize;
