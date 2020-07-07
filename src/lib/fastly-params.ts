import { Request } from 'express';
import { Color, ExtendOptions, Region, RGBA } from 'sharp';
import {
  IFastlyParams,
  IMutableResponse,
  NumericParams,
  Param,
  ParamMap,
  Warning,
  WarnType,
} from './imageopto-types';
import { Logger } from 'pino';
import { createLogger } from './logging';

const paramsLogger = createLogger('params');

const QUALITY = 'quality' as Param;
const UNSET = Symbol('unset');

export default class FastlyParams implements IFastlyParams {
  get quality(): number | undefined {
    if (this.cachedQuality !== UNSET) {
      return this.cachedQuality as number | undefined;
    }
    if (!this.has(QUALITY)) {
      this.cachedQuality = undefined;
      return this.cachedQuality;
    }
    this.cachedQuality = Number(this.get(QUALITY));
    if (isNaN(this.cachedQuality)) {
      this.cachedQuality = undefined;
    }
    return this.cachedQuality;
  }
  public req: Request;
  public res: IMutableResponse;
  public log: Logger;
  private raw: ParamMap;
  private warnings: Warning[] = [];
  private cachedQuality: number | undefined | symbol = UNSET;

  private rgbRE = /^(?:[0-9a-fA-F]{3}){1,2}$/;

  constructor(
    params: Map<string, string | undefined>,
    req: Request,
    res: IMutableResponse
  ) {
    this.raw = params as ParamMap;
    this.req = req;
    this.res = res;
    this.log = paramsLogger.child({ req });
  }

  public get(param: Param) {
    return this.raw.get(param) as Param;
  }

  public has(param: Param) {
    return this.raw.has(param);
  }

  public warn(type: WarnType, param: Param, msg?: string): void {
    this.warnings.push({
      msg: `Parameter "${param}=${this.get(param)}" is ${type}${
        msg ? ' -- ' + msg : ''
      }`,
      type,
    });
  }

  public getWarnings() {
    return this.warnings.slice();
  }

  public toNumbers(names: Param[]): NumericParams {
    const nums: NumericParams = [];
    for (const name of names) {
      if (this.has(name)) {
        const param = this.get(name);
        const num = Number(param);
        if (isNaN(num)) {
          this.warn('invalid', name, 'must be a valid number');
        }
        nums.push(num);
      } else {
        nums.push(undefined);
      }
    }
    return nums;
  }

  public toCssBox(name: Param): ExtendOptions {
    const csv = this.get(name) as string;
    const values: string[] = csv.split(',');
    if (values.length > 4) {
      this.warnFail(
        'invalid',
        name,
        'must be 1 to 4 comma-separated pixel values'
      );
    }
    const nums: number[] = [];
    for (const value of values) {
      const num = Number(value);
      if (isNaN(num)) {
        this.warnFail('invalid', name, 'values must be numeric');
      }
      if (num > 0 && num < 1) {
        this.warnFail('unsupported', name, 'percentage-based padding');
      }
      nums.push(num);
    }
    if (nums.length === 4) {
      return {
        bottom: nums[2],
        left: nums[3],
        right: nums[1],
        top: nums[0],
      };
    }
    if (nums.length === 3) {
      return {
        bottom: nums[2],
        left: nums[1],
        right: nums[1],
        top: nums[0],
      };
    }
    if (nums.length === 2) {
      return {
        bottom: nums[0],
        left: nums[1],
        right: nums[1],
        top: nums[0],
      };
    }
    return {
      bottom: nums[0],
      left: nums[0],
      right: nums[0],
      top: nums[0],
    };
  }

  public toColor(name: Param): Color {
    const die = () => {
      return (this.warnFail(
        'invalid',
        name,
        'must be formatted as RGB 0-255,0-255,0-255 or as RGBA 0-255,0-255,0-255,0-1.0'
      ) as unknown) as Color;
    };
    const param = this.get(name) as string;
    if (this.rgbRE.test(param)) {
      // sharp can support a plain color name, as long as it has a #
      return '#' + param;
    }
    const values: string[] = param.split(',');
    const toRgb = (nums: number[]): RGBA => {
      if (nums.some((num) => num < 0 || num > 255)) {
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
  }

  public toTaggedValues(
    name: Param,
    positional: string[],
    named: string[]
  ): { [key: string]: string | null } {
    const csv = this.get(name) as string;
    const values = csv.split(',').map((v) => v.toLowerCase().trim());
    const tagged: { [key: string]: string | null } = {};
    named.forEach((n) => {
      const valueIndex = values.findIndex((value) => value.startsWith(n));
      if (valueIndex > -1) {
        tagged[n] = values[valueIndex].slice(n.length);
        values.splice(valueIndex, 1);
      }
    });
    // values should just be required positional now
    if (values.length !== positional.length) {
      this.warnFail(
        'invalid',
        name,
        `got ${values.length} arguments, expected ${positional}`
      );
    } else {
      values.forEach((value, i) => {
        tagged[positional[i]] = value;
      });
    }
    return tagged;
  }

  public toRegion(name: Param): Partial<Region> {
    const csv = this.get(name) as string;
    if (csv.includes(':') || csv.includes('offset')) {
      this.warnFail('unsupported', name, 'ratio-based regions');
    }
    const values = this.toTaggedValues(
      name,
      ['width', 'height'],
      ['x', 'y', 'smart', 'offset-x', 'offset-y']
    );
    if (values.hasOwnProperty('smart')) {
      this.warnFail('unsupported', name, 'smart image cropping');
    }

    const validate: (tag: string, optional?: true) => any = (tag, optional) => {
      if (optional && !values.hasOwnProperty(tag)) {
        return;
      }
      const value = Number(values[tag]);
      if (isNaN(value)) {
        if (optional) {
          this.warn('invalid', name, `${tag} must be a number`);
          return undefined;
        } else {
          this.warnFail('invalid', name, `${tag} must be a number`);
        }
      }
      if (value < 1 && value !== 0) {
        this.warnFail(
          'unsupported',
          name,
          `percentage ${tag} value in regions (must use absolute pixels)`
        );
      }
      return value;
    };
    const region: Partial<Region> = {
      height: validate('height'),
      width: validate('width'),
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
  }

  private warnFail(type: Warning['type'], name: Param, msg: string) {
    this.warn(type, name, msg);
    throw new Error(`[${type} ${name}] ${msg}`);
  }
}
