/**
 * Simulate the [Fastly ImageOpto](https://docs.fastly.com/api/imageopto/) API.
 * Returns a middleware which attempts to run image responses through `sharp`.
 */

import makeDebug from 'debug';
import { Request } from 'express';
import mime from 'mime-types';
import sharp, { FormatEnum } from 'sharp';
import { URLSearchParams } from 'url';
import vary from 'vary';
import RequestErrors from './errors';
import FastlyParams from './fastly-params';
import {
  DebugLogger,
  ErrorLogger,
  IMutableResponse,
  IWorkStream,
  Middleware,
  Param,
  RequestFilter
} from './imageopto-types';
import mapOptions from './map-options';
import splice from './splice-response';

export interface ImageOptoOptions {
  errorLog: ErrorLogger;
  filter: RequestFilter;
  /**
   * Hastily detects when the served image has already been optimized by
   * Hastily or the real Fastly API, by looking for headers. By default, it
   * disables its own optimizer for such images. Set this to `false` explicitly
   * to force hastily to re-optimize those images anyway.
   */
  force?: boolean;
  /**
   * Set true to disable error logging; the errorLog function will never be
   * called.
   */
  quiet?: boolean;
}

const HASTILY_HEADER = {
  NAME: 'X-Optimized',
  VALUE: 'hastily'
};

const streamableFileExtensions = new Set(
  ...Object.keys(sharp.format).filter(
    ext => sharp.format[ext as keyof FormatEnum].input.stream
  )
);
// plus the one sharp doesn't mention outright, the alias to jpeg...
streamableFileExtensions.add('jpg');
// minus SVGs, which are widely supported in 2019 and we should not rasterize
streamableFileExtensions.delete('svg');
const imageExtensionRE = new RegExp(
  `\\.(?:${[...streamableFileExtensions].join('|')})$`
);

/**
 * Use the `sharp.format` manifest to determine if the current request's file
 * extension matches a format that sharp can stream in to optimize.
 * @param req {Request}
 */
export const hasSupportedExtension: RequestFilter = req =>
  imageExtensionRE.test(req.path);

/**
 * Returns a new imageopto middleware for use in Express `app.use()`.
 * Won't do anything if the Express app isn't already serving images!
 *
 */
export function imageopto(
  filterOrOpts: RequestFilter | ImageOptoOptions
): Middleware {
  const options: ImageOptoOptions = {
    errorLog: errors => console.error(errors.toString()),
    filter: hasSupportedExtension,
    force: false
  };
  if (typeof filterOrOpts === 'function') {
    options.filter = filterOrOpts;
  } else if (typeof filterOrOpts === 'object') {
    options.filter = filterOrOpts.filter || options.filter;
    options.force = filterOrOpts.force;
    options.errorLog = options.quiet
      ? _ => void 0
      : filterOrOpts.errorLog || options.errorLog;
  }
  makeDebug('hastily:middleware:construct')('creating new middleware');
  return function hastily(req, res, next) {
    const debug = makeDebug('hastily:middleware:' + req.path);
    if (!options.filter(req)) {
      return next();
    }
    debug('testing hastily for %s', req.rawHeaders);
    splice(req, res, next, () => {
      // determine if the entity should be transformed
      if (!shouldTransform(req, res, options, debug)) {
        return false;
      }

      debug(
        'hastily will handle this image by transforming the response through sharp'
      );
      vary(res, 'Accept');
      res.setHeader(HASTILY_HEADER.NAME, HASTILY_HEADER.VALUE);

      // image opto stream
      const params = new FastlyParams(
        new Map<Param, string>(
          (new URLSearchParams(req.query).entries() as unknown) as Map<
            Param,
            string
          >
        ),
        req,
        res
      );
      const sharpStream = mapOptions(params);
      const warnings = params.getWarnings();
      if (warnings.length > 0) {
        options.errorLog(new RequestErrors(req.url, warnings));
      }
      debug('mapped options and created sharp stream');
      return (sharpStream as unknown) as IWorkStream;
    });
  };
}

const cacheControlNoTransformRegExp = /(?:^|,)\s*?no-transform\s*?(?:,|$)/;
/**
 * Determine if the entity should be transformed.
 * @private
 */

function shouldTransform(
  req: Request,
  res: IMutableResponse,
  options: ImageOptoOptions,
  debug: DebugLogger
) {
  if (req.method === 'HEAD') {
    debug('no transform: request method is HEAD');
    return false;
  }

  if (res.statusCode > 299 || res.statusCode < 200) {
    debug('no transform: res.statusCode is %s', res.statusCode);
    return false;
  }

  const cacheControl = res.getHeader('Cache-Control');

  // Don't optimize for Cache-Control: no-transform
  // https://tools.ietf.org/html/rfc7234#section-5.2.2.4
  if (
    cacheControl &&
    cacheControlNoTransformRegExp.test(cacheControl.toString())
  ) {
    debug('no transform: cache control header: "%s"', cacheControl);
    return false;
  }

  if (!options.force) {
    // Don't optimize if we've already done it somewhere
    const hastilyHeader = res.getHeader(HASTILY_HEADER.NAME);
    if (hastilyHeader === HASTILY_HEADER.VALUE) {
      debug(
        'no transform: header %o, hastily alrady transformed this earlier',
        HASTILY_HEADER
      );
      return false;
    }

    // Don't optimize if Fastly has already done it for us
    const fastlyHeader = res.getHeader('fastly-io-info');
    if (fastlyHeader) {
      debug(
        'no transform: fastly already transformed according to fastly-io-info header: "%s"',
        fastlyHeader
      );
      return false;
    }
  }

  const contentType = res.getHeader('content-type');
  const extension = mime.extension(contentType as string);
  if (!extension) {
    debug('no transform: no valid content-type could not be detected');
    return false;
  }
  const sharpFormatCapabilities = sharp.format[extension as keyof FormatEnum];
  if (!sharpFormatCapabilities || !sharpFormatCapabilities.input.stream) {
    debug(
      'no transform: sharp does not support input of type "%s"',
      contentType
    );
    return false;
  }

  return true;
}
