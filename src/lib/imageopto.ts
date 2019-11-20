/**
 * Simulate the [Fastly ImageOpto](https://docs.fastly.com/api/imageopto/) API.
 * Returns a middleware which attempts to run image responses through `sharp`.
 */

import onHeaders from 'on-headers';
import vary from 'vary';
import mime from 'mime-types';
import sharp, { Sharp, FormatEnum } from 'sharp';
import { ServerResponse } from 'http';
import { Request } from 'express';
import mapOptions from './map-options';
import {
  MutableResponse,
  Handler,
  Listener,
  EventName
} from './imageopto-types';

const debug = require('debug')('hastily:imageopto');

export function imageopto(): (
  req: Request,
  res: MutableResponse,
  next: () => any
) => any {
  return function optimizeImages(req, res, next) {
    debug('testing hastily for %s: %s', req.path, req.rawHeaders);
    const listeners: Listener[] = [];
    let ended = false;
    let sharpStream: Sharp;

    const resEnd = res.end.bind(res);
    const resOn = res.on.bind(res);
    const resWrite = res.write.bind(res);

    res.write = function write(
      this: MutableResponse,
      chunk: Buffer,
      encoding: BufferEncoding
    ) {
      debug(
        'outgoing response.write() called with %s of length %s',
        encoding,
        chunk.length
      );
      if (ended) {
        debug('response.write(): ended flag is true, returning');
        return false;
      }

      if (!this.headersSent) {
        debug(
          'response.write(): this.headersSent is false, writing head to this.statusCode: %s',
          this.statusCode
        );
        this.writeHead(this.statusCode);
      }

      if (sharpStream) {
        debug('sharpStream exists, writing to it');
        sharpStream.write(toBuffer(chunk, encoding));
      } else {
        debug('no sharpStream, writing directly to response');
        resWrite(chunk, encoding);
      }
      return true;
    } as ServerResponse['write'];

    res.end = function end(
      this: MutableResponse,
      chunk: Buffer,
      encoding: BufferEncoding
    ) {
      debug('outgoing response.end() called');
      if (ended) {
        debug('response.end(): ended is already true, returning');
        return false;
      }

      if (!this.headersSent) {
        debug(
          'response.end(): this.headersSent is false, writing head to this.statusCode: %s',
          this.statusCode
        );
        this.writeHead(this.statusCode);
      }

      if (!sharpStream) {
        debug('sharpStream never existed! ending response directly');
        return resEnd.call(this, chunk, encoding as BufferEncoding);
      }

      // mark ended
      ended = true;
      debug('marked ended');
      sharpStream.end();
      debug('called sharpStream.end()');
      return false;
    } as ServerResponse['end'];

    function addResponseListener(
      this: MutableResponse,
      type: string | symbol,
      listener: Handler
    ): MutableResponse {
      debug('addResponseListener called for "%s" event', type);
      if (listeners.length == 0 || type !== 'drain') {
        debug(
          'zero listeners or not drain. calling method directly on response'
        );
        resOn.call(this, type, listener);
        return this;
      }

      if (sharpStream) {
        debug('sharpStream exists, subscribing');
        const mapSharpType: (x: EventName) => string = x => x.toString();
        sharpStream.on(mapSharpType(type), listener);
        return this;
      }

      debug(
        'sharpStream does not exist, buffering "%s" listener (now %n listeners)',
        type,
        listeners.length + 1
      );
      // buffer listeners for future stream
      listeners.push([type, listener]);

      return this;
    }

    res.on = addResponseListener;

    onHeaders(res, function onResponseHeaders() {
      // determine if the entity should be transformed
      if (!shouldTransform(req, res)) {
        addListeners(res, resOn, listeners);
        listeners.length = 0;
        return;
      }

      debug(
        'hastily will handle this image by transforming the response through sharp'
      );
      vary(res, 'Accept');

      // image opto stream
      sharpStream = mapOptions(req.query, sharp(), req, res);
      debug('mapped options and created sharp stream');
      // add buffered listeners to stream
      addListeners(sharpStream, sharpStream.on, listeners);
      debug('added listeners to sharp stream');

      res.removeHeader('Content-Length');

      // compression
      sharpStream.on('data', function onStreamData(chunk: any, enc: any) {
        debug(
          'sharpStream received %s of length %n from response',
          enc,
          chunk.length
        );
        if (resWrite(chunk, enc) === false) {
          debug('response buffer is full, pausing sharpStream');
          sharpStream.pause();
        }
      });

      sharpStream.on('end', resEnd);

      resOn.call(res, 'drain', function onResponseDrain() {
        debug('response buffer is empty, resuming sharpStream');
        sharpStream.resume();
      });
    });

    next();
  };
}

/**
 * Add bufferred listeners to stream
 * @private
 */

function addListeners<T>(
  stream: T,
  on: (e: EventName, h: Handler) => any,
  listeners: Listener[]
) {
  for (var i = 0; i < listeners.length; i++) {
    on.apply(stream, listeners[i]);
  }
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

/**
 * Coerce arguments to Buffer
 * @private
 */

function toBuffer(chunk: any, encoding: BufferEncoding) {
  return !Buffer.isBuffer(chunk) ? Buffer.from(chunk, encoding) : chunk;
}
