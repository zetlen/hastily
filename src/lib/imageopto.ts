/**
 * Simulate the [Fastly ImageOpto](https://docs.fastly.com/api/imageopto/) API.
 * Returns a middleware which attempts to run image responses through `sharp`.
 */

import { createLogger } from './logging';
import { Request } from 'express';
import mime from 'mime-types';
import sharp, { FormatEnum } from 'sharp';
import { URLSearchParams } from 'url';
import vary from 'vary';
import RequestErrors from './errors';
import FastlyParams from './fastly-params';
import {
  ErrorLogger,
  IMutableResponse,
  IWorkStream,
  Middleware,
  Param,
  RequestFilter,
} from './imageopto-types';
import mapOptions from './map-options';
import splice from './splice-response';
import { Logger } from 'pino';

export interface ImageOptoOptions {
  errorLog?: ErrorLogger;
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

export const HASTILY_HEADER = {
  NAME: 'X-Optimized',
  VALUE: 'hastily',
};

export const HASTILY_STREAMABLE_FILETYPES = new Set(
  Object.keys(sharp.format).filter(
    (ext) => sharp.format[ext as keyof FormatEnum].input.stream
  )
);
// plus the one sharp doesn't mention outright, the alias to jpeg...
HASTILY_STREAMABLE_FILETYPES.add('jpg');
// minus SVGs, which are widely supported in 2019 and we should not rasterize
HASTILY_STREAMABLE_FILETYPES.delete('svg');
export const HASTILY_STREAMABLE_PATH_REGEXP = new RegExp(
  `/.+\\.(${[...HASTILY_STREAMABLE_FILETYPES].join('|')})(?:[?#].*)?`
);

/**
 * Use the `sharp.format` manifest to determine if the current request's file
 * extension matches a format that sharp can stream in to optimize.
 * @param req {Request}
 */
export const hasSupportedExtension: RequestFilter = (req) =>
  HASTILY_STREAMABLE_PATH_REGEXP.test(req.originalUrl);

/**
 * Returns a new imageopto middleware for use in Express `app.use()`.
 * Won't do anything if the Express app isn't already serving images!
 *
 */
export function imageopto(
  filterOrOpts: RequestFilter | ImageOptoOptions
): Middleware {
  const options: ImageOptoOptions = {
    filter: hasSupportedExtension,
    force: false,
  };
  if (typeof filterOrOpts === 'function') {
    options.filter = filterOrOpts;
  } else if (typeof filterOrOpts === 'object') {
    options.filter = filterOrOpts.filter || options.filter;
    options.force = filterOrOpts.force;
    options.errorLog = options.quiet ? (_) => void 0 : filterOrOpts.errorLog;
  }
  const constructorLog = createLogger('middleware');
  constructorLog.debug('creating new middleware');
  if (options.filter === hasSupportedExtension) {
    constructorLog.debug(
      'middleware filtering req.originalUrl for %s',
      HASTILY_STREAMABLE_PATH_REGEXP.source
    );
  }
  const requestLog = createLogger('request');
  return function hastily(req, res, next) {
    const reqLog = requestLog.child({ req });
    if (!options.filter(req)) {
      reqLog.debug('did not pass supplied filter function');
      return next();
    }
    splice(req, res, next, () => {
      // determine if the entity should be transformed
      if (!shouldTransform(req, res, reqLog, options)) {
        return false;
      }

      reqLog.debug(
        'hastily will handle this image by transforming the response through sharp'
      );
      vary(res, 'Accept');
      res.setHeader(HASTILY_HEADER.NAME, HASTILY_HEADER.VALUE);

      // image opto stream
      const params = new FastlyParams(
        new Map<Param, string>(
          (new URLSearchParams(
            req.query as { [key: string]: string | string[] }
          ).entries() as unknown) as Map<Param, string>
        ),
        req,
        res
      );
      const sharpStream = sharp();
      const emitSharpError = (error: Error) => {
        if (options.errorLog) {
          options.errorLog(error);
        } else {
          reqLog.error('Image processing failed: %s', error.toString());
        }
      };
      sharpStream.on('error', emitSharpError);
      try {
        const transformStream = mapOptions(params, sharpStream);
        const warnings = params.getWarnings();
        if (warnings.length > 0) {
          const requestErrors = new RequestErrors(req.url, warnings);
          if (options.errorLog) {
            options.errorLog(requestErrors);
          } else {
            reqLog.warn(requestErrors.toString());
          }
        }
        reqLog.debug('mapped options and created sharp stream');
        return (transformStream as unknown) as IWorkStream;
      } catch (e) {
        emitSharpError(e);
        return false;
      }
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
  reqLog: Logger,
  options: ImageOptoOptions
) {
  if (req.method !== 'GET') {
    reqLog.debug(
      'no transform: request method must be GET but is %s',
      req.method
    );
    return false;
  }

  if (res.statusCode > 299 || res.statusCode < 200) {
    reqLog.debug(
      'no transform: res.statusCode must be 2xx but is %s',
      res.statusCode
    );
    return false;
  }

  const cacheControl = res.getHeader('Cache-Control');

  // Don't optimize for Cache-Control: no-transform
  // https://tools.ietf.org/html/rfc7234#section-5.2.2.4
  if (
    cacheControl &&
    cacheControlNoTransformRegExp.test(cacheControl.toString())
  ) {
    reqLog.debug('no transform: cache control header: "%s"', cacheControl);
    return false;
  }

  if (!options.force) {
    // Don't optimize if we've already done it somewhere
    const hastilyHeader = res.getHeader(HASTILY_HEADER.NAME);
    if (hastilyHeader === HASTILY_HEADER.VALUE) {
      reqLog.warn(
        'no transform: header %o, hastily alrady transformed this earlier',
        HASTILY_HEADER
      );
      return false;
    }

    // Don't optimize if Fastly has already done it for us
    const fastlyHeader = res.getHeader('fastly-io-info');
    if (fastlyHeader) {
      reqLog.debug(
        'no transform: fastly already transformed according to fastly-io-info header: "%s"',
        fastlyHeader
      );
      return false;
    }
  }

  const contentType = res.getHeader('content-type');
  const extension = mime.extension(contentType as string);
  if (!extension) {
    reqLog.error('no transform: no valid content-type could not be detected');
    return false;
  }
  const sharpFormatCapabilities = sharp.format[extension as keyof FormatEnum];
  if (!sharpFormatCapabilities || !sharpFormatCapabilities.input.stream) {
    reqLog.error(
      'no transform: sharp does not support input of type "%s"',
      contentType
    );
    return false;
  }

  const contentEncoding = res.getHeader('content-encoding');
  if (
    contentEncoding &&
    typeof contentEncoding === 'string' &&
    contentEncoding.trim()
  ) {
    reqLog.error(
      'no transform: image is compressed with content-encoding "%s"; hastily does not support decompressing images. The server *should not* be compressing images! HTTP content encoding is only recommended for text documents. Binary files will not get smaller, and may evem get larger!'
    );
  }

  return true;
}
