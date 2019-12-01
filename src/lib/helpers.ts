import { Color, ExtendOptions, Region, RGBA } from 'sharp';
import { FastlyCompatError, FastlyParamError } from './errors';
import { NumericParams, Param, Params } from './imageopto-types';

export function paramsToNumbers(params: Params, names: Param[]): NumericParams {
  const nums: NumericParams = [];
  for (const name of names) {
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
  for (const value of values) {
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
      bottom: nums[2],
      left: nums[3],
      right: nums[1],
      top: nums[0]
    };
  }
  if (nums.length === 3) {
    return {
      bottom: nums[2],
      left: nums[1],
      right: nums[1],
      top: nums[0]
    };
  }
  if (nums.length === 2) {
    return {
      bottom: nums[0],
      left: nums[1],
      right: nums[1],
      top: nums[0]
    };
  }
  return {
    bottom: nums[0],
    left: nums[0],
    right: nums[0],
    top: nums[0]
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

export function getTaggedValues(
  params: Params,
  name: Param,
  positional: string[],
  named: string[]
): { [key: string]: string | null } {
  const csv = params.get(name) as string;
  const values = csv.split(',').map(v => v.toLowerCase().trim());
  const tagged: { [key: string]: string | null } = {};
  named.forEach(n => {
    const valueIndex = values.findIndex(value => value.startsWith(n));
    if (valueIndex > -1) {
      tagged[n] = values[valueIndex].slice(n.length);
      values.splice(valueIndex, 1);
    }
  });
  // values should just be required positional now
  if (values.length > positional.length) {
    throw new FastlyParamError(params, name);
  } else if (values.length < positional.length) {
    throw new FastlyParamError(
      params,
      name,
      `${positional} arguments required`
    );
  } else {
    values.forEach((value, i) => {
      tagged[positional[i]] = value;
    });
  }
  return tagged;
}

export const regionFromParam = (
  params: Params,
  name: Param
): Partial<Region> => {
  const csv = params.get(name) as string;
  if (csv.includes(':') || csv.includes('offset')) {
    throw new FastlyCompatError(params, name, 'ratio-based regions');
  }
  const values = getTaggedValues(
    params,
    name,
    ['width', 'height'],
    ['x', 'y', 'smart', 'offset-x', 'offset-y']
  );
  if (values.hasOwnProperty('smart')) {
    throw new FastlyCompatError(params, name, 'smart image cropping');
  }

  function validate(tag: string, optional?: true) {
    if (optional && !values.hasOwnProperty(tag)) {
      return;
    }
    const value = Number(values[tag]);
    if (isNaN(value)) {
      throw new FastlyParamError(params, name, `${tag} is ${values[tag]}`);
    }
    if (value < 1 && value !== 0) {
      throw new FastlyCompatError(
        params,
        name,
        `percentage ${tag} value in regions (must use absolute pixels)`
      );
    }
    return value;
  }
  const region: Partial<Region> = {
    height: validate('height'),
    width: validate('width')
  };
  const left = validate('x', true);
  if (left !== undefined) {
    region.left = left;
  }
  const top = validate('y', true);
  if (top !== undefined) {
    region.top = top;
  }
  return region;
};
