/// <reference types="@types/express" />
/**
 * Simulate the [Fastly ImageOpto](https://docs.fastly.com/api/imageopto/) API.
 * Returns a middleware which attempts to run image responses through `sharp`.
 */

import accepts from 'accepts';
import onHeaders from 'on-headers';
import vary from 'vary';
import mime from 'mime-types';
import sharp, { Sharp } from 'sharp';
import { ServerResponse } from 'http';

const debug = require('debug')('hastily:imageopto');

const imageTypes = new Set(
  ['jpeg', 'jpg', 'png', 'webp', 'gif', 'svg', 'tiff'].map(
    ext => mime.types[ext]
  )
);

interface MutableResponse extends ServerResponse, Express.Response {
  flush(): void;
}

export function imageopto(): (
  req: Express.Request,
  res: MutableResponse,
  next: () => any
) => any {
  return function optimizeImages(req, res, next) {
    let listeners: [];
    let ended = false;
    let sharpStream: Sharp;

    const _end = res.end;
    const _on = res.on;
    const _write = res.write;

    // flush
    res.flush = function flush() {
      if (sharpStream) {
        sharpStream.flush();
      }
    };

    // proxy

    res.write = function write(
      this: MutableResponse,
      chunk: Buffer,
      encoding: BufferEncoding
    ) {
      if (ended) {
        return false;
      }

      if (!this.headersSent) {
        this.writeHead(this.statusCode);
      }

      if (sharpStream) {
        sharpStream.write(toBuffer(chunk, encoding));
      } else {
        _write.call(this, chunk, encoding);
      }
      return true;
    } as ServerResponse['write'];

    res.end = function end(
      this: MutableResponse,
      chunk: Buffer,
      encoding: BufferEncoding
    ) {
      if (ended) {
        return false;
      }

      if (!this.headersSent) {
        this.writeHead(this.statusCode);
      }

      if (!sharpStream) {
        return _end.call(this, chunk, encoding as BufferEncoding);
      }

      // mark ended
      ended = true;
      sharpStream.end();
      return false;
    } as ServerResponse['end'];

    res.on = function on(
      this: MutableResponse,
      type: string,
      listener: Listener
    ) {
      if (!listeners || type !== 'drain') {
        return _on.call(this, type, listener);
      }

      if (sharpStream) {
        return sharpStream.on(type, listener);
      }

      // buffer listeners for future stream
      listeners.push([type, listener]);

      return this;
    };

    function nocompress(msg) {
      debug('no compression: %s', msg);
      addListeners(res, _on, listeners);
      listeners = null;
    }

    onHeaders(res, function onResponseHeaders() {
      // determine if request is filtered
      if (!filter(req, res)) {
        nocompress('filtered');
        return;
      }

      // determine if the entity should be transformed
      if (!shouldTransform(req, res)) {
        nocompress('no transform');
        return;
      }

      // vary
      vary(res, 'Accept-Encoding');

      var encoding = res.getHeader('Content-Encoding') || 'identity';

      // already encoded
      if (encoding !== 'identity') {
        nocompress('already encoded');
        return;
      }

      // head
      if (req.method === 'HEAD') {
        nocompress('HEAD request');
        return;
      }

      // compression method
      var accept = accepts(req);
      var method = accept.encoding(['gzip', 'deflate', 'identity']);

      // we really don't prefer deflate
      if (method === 'deflate' && accept.encoding(['gzip'])) {
        method = accept.encoding(['gzip', 'identity']);
      }

      // negotiation failed
      if (!method || method === 'identity') {
        nocompress('not acceptable');
        return;
      }

      // image opto stream
      sharpStream = sharp()
        // add buffered listeners to stream
        .addListeners(sharpStream, sharpStream.on, listeners);

      // header fields
      res.setHeader('Content-Encoding', method);
      res.removeHeader('Content-Length');

      // compression
      sharpStream.on('data', function onStreamData(chunk) {
        if (_write.call(res, chunk) === false) {
          sharpStream.pause();
        }
      });

      sharpStream.on('end', function onStreamEnd() {
        _end.call(res);
      });

      _on.call(res, 'drain', function onResponseDrain() {
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

function addListeners(stream, on, listeners) {
  for (var i = 0; i < listeners.length; i++) {
    on.apply(stream, listeners[i]);
  }
}

/**
 * Get the length of a given chunk
 */

function chunkLength(chunk, encoding) {
  if (!chunk) {
    return 0;
  }

  return !Buffer.isBuffer(chunk)
    ? Buffer.byteLength(chunk, encoding)
    : chunk.length;
}

/**
 * Default filter function.
 * @private
 */

function shouldOptimize(req, res) {
  var type = res.getHeader('Content-Type');

  if (type === undefined || !imageTypes.has(type)) {
    debug('%s not an optimizable image', type);
    return false;
  }

  return true;
}

/**
 * Determine if the entity should be transformed.
 * @private
 */

function shouldTransform(req, res) {
  var cacheControl = res.getHeader('Cache-Control');

  // Don't compress for Cache-Control: no-transform
  // https://tools.ietf.org/html/rfc7234#section-5.2.2.4
  return !cacheControl || !cacheControlNoTransformRegExp.test(cacheControl);
}

/**
 * Coerce arguments to Buffer
 * @private
 */

function toBuffer(chunk, encoding) {
  return !Buffer.isBuffer(chunk) ? Buffer.from(chunk, encoding) : chunk;
}
