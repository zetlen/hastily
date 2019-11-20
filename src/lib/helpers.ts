import { NumericParams, Params, Param } from './imageopto-types';
import { FastlyParamError, FastlyCompatError } from './errors';
import { ExtendOptions, Color, RGBA, Region } from 'sharp';

export function paramsToNumbers(params: Params, names: Param[]): NumericParams {
  const nums: NumericParams = [];
  for (let name of names) {
    if (params.has(name)) {
      const param = params.get(name);
      const num = Number(param);
      if (isNaN(num)) {
        throw new FastlyParamError(
          params,
          name,
          `${name} must be a valid number`
        );
      }
      nums.push(num);
    } else {
      nums.push(undefined);
    }
  }
  return nums;
}
export const cssBoxFromParam = (params: Params, name: Param): ExtendOptions => {
  const csv = params.get(name) as string;
  const values: string[] = csv.split(',');
  if (values.length > 4) {
    throw new FastlyParamError(
      params,
      name,
      'must be 1 to 4 comma-separated pixel values'
    );
  }
  const nums: number[] = [];
  for (let value of values) {
    const num = Number(value);
    if (isNaN(num)) {
      throw new FastlyParamError(params, name, 'values must be numeric');
    }
    if (num > 0 && num < 1) {
      throw new FastlyCompatError(params, name, 'percentage-based padding');
    }
    nums.push(num);
  }
  if (nums.length === 4) {
    return {
      top: nums[0],
      right: nums[1],
      bottom: nums[2],
      left: nums[3]
    };
  }
  if (nums.length === 3) {
    return {
      top: nums[0],
      right: nums[1],
      bottom: nums[2],
      left: nums[1]
    };
  }
  if (nums.length === 2) {
    return {
      top: nums[0],
      right: nums[1],
      bottom: nums[0],
      left: nums[1]
    };
  }
  return {
    top: nums[0],
    right: nums[0],
    bottom: nums[0],
    left: nums[0]
  };
};

const rgbRE = /^(?:[0-9a-fA-F]{3}){1,2}$/;
export const colorFromParam = (params: Params, name: Param): Color => {
  const die = () => {
    throw new FastlyParamError(
      params,
      name,
      'must be formatted as RGB 0-255,0-255,0-255 or as RGBA 0-255,0-255,0-255,0-1.0'
    );
  };
  const param = params.get(name) as string;
  if (rgbRE.test(param)) {
    // sharp can support a plain color name, as long as it has a #
    return '#' + param;
  }
  const values: string[] = param.split(',');
  const toRgb = (nums: number[]): RGBA => {
    if (nums.some(num => num < 0 || num > 255)) {
      die();
    }
    const [r, g, b] = nums;
    return { r, g, b };
  };
  if (values.length === 4) {
    const nums = values.map(Number);
    const alpha = nums.pop() as number;
    if (alpha < 0 || alpha > 1) {
      die();
    }
    const rgba = toRgb(nums);
    rgba.alpha = alpha;
    return rgba;
  } else if (values.length === 3) {
    const rgba = toRgb(values.map(Number));
    return rgba;
  }
  return die();
};

export const regionFromParam = (params: Params, name: Param): Region => {
  const csv = <string>params.get(name);
  if (csv.includes(':') || csv.includes('offset')) {
    throw new FastlyCompatError(params, name, 'ratio-based regions');
  }
  if (!csv.includes(',')) {
    throw new FastlyParamError(params, name, 'width and height are required');
  }
  const [width, height, ...rest] = csv.split(',');
  const region = {} as Region;
  const numWidth = Number(width);
  if (isNaN(numWidth)) {
    throw new FastlyParamError(params, name, 'width must be numeric');
  }
  region.width = numWidth;
  const numHeight = Number(height);
  if (isNaN(numHeight)) {
    throw new FastlyParamError(params, name, 'height must be numeric');
  }
  region.height = numHeight;
  const validateDimension = (value: string, dim: 'x' | 'y') => {
    const matches = value.match(new RegExp(`^${dim}(\\d+)$`));
    if (!matches) {
      throw new FastlyParamError(
        params,
        name,
        `${dim} must be "${dim}<pixel>"`
      );
    }
    return Number(matches[1]);
  };
  if (rest.length > 2) {
    const last = rest.pop();
    if (
      last &&
      last
        .toString()
        .toLowerCase()
        .trim() === 'smart'
    ) {
      throw new FastlyCompatError(
        params,
        <Param>'smart',
        'smart image cropping'
      );
    }
    throw new FastlyParamError(
      params,
      name,
      `unrecognized parameters: ${rest.join(', ')}`
    );
  }
  if (rest.length === 2) {
    region.top = validateDimension(rest[1], 'y');
  }
  if (rest.length > 0) {
    region.left = validateDimension(rest[0], 'x');
  }
  return region;
};
