import { Request, Response } from 'express';
import { ServerResponse } from 'http';
import { Color, ExtendOptions, Region, Sharp } from 'sharp';
import { Duplex } from 'stream';

export type Middleware = (
  req: Request,
  res: IMutableResponse,
  next: () => any
) => any;

/**
 * Receives an [express Request](https://expressjs.com/en/api.html#req) and
 * returns `true` if hastily should attempt to optimize the current request.
 * The default implementation tests the file extension for files supported as
 * input formats by `sharp`.
 */
export type RequestFilter = (request: Request) => boolean;

export type DebugLogger = (message: string, ...args: readonly any[]) => any;

export interface IRequestErrors {
  url: string;
  warnings: Warning[];
}

/**
 * Receives a {@link RequestErrors} object to do side effects such as logging.
 * Default is a console log.
 */
export type ErrorLogger = (errors: IRequestErrors) => any;

export type Param =
  | 'bg-color'
  | 'blur'
  | 'brightness'
  | 'canvas'
  | 'crop'
  | 'contrast'
  | 'disable'
  | 'dpr'
  | 'enable'
  | 'fit'
  | 'height'
  | 'orient'
  | 'pad'
  | 'resize-filter'
  | 'saturation'
  | 'sharpen'
  | 'trim'
  | 'width';

export type ParamMap = Map<Param, string>;
export type NumericParams = (number | undefined)[];

export type Mapper = (transform: Sharp, params: IFastlyParams) => Sharp | false;

export type Orientation =
  | 'r'
  | 'l'
  | 'h'
  | 'v'
  | 'hv'
  | 'vh'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8';

export type Format =
  | 'gif'
  | 'png'
  | 'png8'
  | 'jpg'
  | 'pjpg'
  | 'webp'
  | 'webpll'
  | 'webply';

export interface IMutableResponse extends ServerResponse, Response {
  _header: any;
  flush(): any;
  _implicitHeader(): any;
}

export type Handler = (...args: readonly any[]) => any;

export type EventName = string | symbol;

export type Listener = readonly [EventName, Handler];

export interface IWorkStream extends Duplex {
  flush(): any;
}

export type WarnType = 'unsupported' | 'invalid';

export interface Warning {
  type: WarnType;
  msg: string;
}

export interface IFastlyParams {
  /**
   * The Express.Request being handled.
   */
  req: Request;

  /**
   * The Express.Response being transformed.
   */
  res: IMutableResponse;

  /**
   * The requested output quality, from 1-100 (optional, default 85 from sharp)
   */
  quality: number | undefined;

  /**
   * Get a string value from the raw query.
   */
  get(param: Param): string | undefined;

  /**
   * Test for the presence of a string value in the raw query.
   */
  has(param: Param): boolean;

  /**
   * Record that an unsupported or invalid value was passed, for optional later
   * logging.
   */
  warn(type: WarnType, param: Param, msg?: string): void;

  /**
   * Get list of warnings for optional logging.
   */
  getWarnings(): Warning[];

  /**
   * Cast parameters to numbers, and return them in order.
   * @example
   *     params.toNumbers(['width', 'dpr'])
   *     // from query width=400&dpr=1.300,
   *     // returns [400, 1.3]
   */
  toNumbers(names: Param[]): NumericParams;

  /**
   * Parse a comma-separated string specifying top, left, bottom, and right
   * pixel values, and optionally background color.
   * @example
   *     params.toCssBox('extend')
   *     // from query extend=25,30,80&bg-color=40,40,40
   *     // returns {
   *     //   top: 25,
   *     //   left: 30,
   *     //   bottom: 80,
   *     //   right: 30,
   *     //   background: { r: 40, g: 40, b: 40 }
   *     // }
   *
   */
  toCssBox(name: Param): ExtendOptions;

  /**
   * Parse a comma-separated string R,G,B into a color value usable by Sharp.
   * @example
   *     params.toColor('bg-color')
   *     // from query bg-color=ccc
   *     // returns '#ccc'
   *     // from query bg-color=3,50,40
   *     // returns { r: 3, g: 50, b: 40 }
   */
  toColor(name: Param): Color;

  /**
   * Parse a comma-separated string with optional tag-prefixed values and
   * required positional values.
   * @example
   *     params.toTaggedValues('canvas', ['width', 'foo'], ['smart', 'x'])
   *     // from query canvas=30,bar,smart,x5
   *     // returns { width: 30, foo: 'bar', smart: null, x: 5 }
   */
  toTaggedValues(
    name: Param,
    positional: string[],
    named: string[]
  ): { [key: string]: string | null };

  /**
   * Parse a comma-separated string into an absolutely positioned CSS box,
   * with optional top, left, width, and height values.
   * @example
   *     params.toRegion('extract')
   *     // from query extract=40,80,y0,x50
   *     // returns { width: 40, height: 80, left: 50, top: 0 }
   */
  toRegion(name: Param): Partial<Region>;
}
