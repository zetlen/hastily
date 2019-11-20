/**
 * Simulate the [Fastly ImageOpto](https://docs.fastly.com/api/imageopto/) API.
 * Returns a middleware which attempts to run image responses through `sharp`.
 */

import vary from 'vary';
import mime from 'mime-types';
import sharp, { FormatEnum } from 'sharp';
import { Request } from 'express';
import mapOptions from './map-options';
import { MutableResponse, WorkStream } from './imageopto-types';
import splice from './splice-response';

const debug = require('debug')('hastily:imageopto');

export function imageopto(): (
  req: Request,
  res: MutableResponse,
  next: () => any
) => any {
  return function optimizeImages(req, res, next) {
    debug('testing hastily for %s: %s', req.path, req.rawHeaders);
    splice(res, next, () => {
      // determine if the entity should be transformed
      if (!shouldTransform(req, res)) {
        return false;
      }

      debug(
        'hastily will handle this image by transforming the response through sharp'
      );
      vary(res, 'Accept');

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

function shouldTransform(req: Request, res: MutableResponse) {
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
  const extension = mime.extension(<string>contentType);
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
