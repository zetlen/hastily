/**
 * Simulate the [Fastly ImageOpto](https://docs.fastly.com/api/imageopto/) API.
 * Returns a middleware which attempts to run image responses through `sharp`.
 */

import makeDebug from 'debug';
import { Request } from 'express';
import mime from 'mime-types';
import sharp, { FormatEnum } from 'sharp';
import vary from 'vary';
import { DebugLogger, MutableResponse, WorkStream } from './imageopto-types';
import mapOptions from './map-options';
import splice from './splice-response';

/**
 * Receives an [express Request](https://expressjs.com/en/api.html#req) and
 * returns `true` if hastily should attempt to optimize the current request.
 * The default implementation tests the file extension for files supported as
 * input formats by `sharp`.
 */
type RequestFilter = (request: Request) => boolean;

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
 * @param filter {RequestFilter} Optionally, supply a {@link RequestFilter}
 * function here to filter requests.
 */
export function imageopto(
  filter: RequestFilter = hasSupportedExtension
): (req: Request, res: MutableResponse, next: () => any) => any {
  makeDebug('hastily:middleware:construct')('creating new middleware');
  return function hastily(req, res, next) {
    const debug = makeDebug('hastily:middleware:' + req.path);
    if (!filter(req)) {
      return next();
    }
    debug('testing hastily for %s', req.rawHeaders);
    splice(req, res, next, () => {
      // determine if the entity should be transformed
      if (!shouldTransform(req, res, debug)) {
        return false;
      }

      debug(
        'hastily will handle this image by transforming the response through sharp'
      );
      vary(res, 'Accept');
      res.setHeader(HASTILY_HEADER.NAME, HASTILY_HEADER.VALUE);

      // image opto stream
      const sharpStream = mapOptions(req.query, sharp(), req, res);
      debug('mapped options and created sharp stream');
      return (sharpStream as unknown) as WorkStream;
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
  res: MutableResponse,
  debug: DebugLogger
) {
  if (req.method === 'HEAD') {
    debug('no transform: request method is HEAD');
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
