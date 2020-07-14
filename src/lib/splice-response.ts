'use strict';

import { Request } from 'express';
import onHeaders from 'on-headers';
import { createLogger } from './logging';
import {
  Handler,
  IMutableResponse,
  IWorkStream,
  Listener,
} from './imageopto-types';

const log = createLogger('splice');

/**
 * @hidden
 */
export default function splice(
  req: Request,
  res: IMutableResponse,
  next: (e?: Error) => any,
  makeStream: () => IWorkStream | false
) {
  log.debug({ res }, 'splicing hastily into response for %s', req.originalUrl);
  let ended = false;
  let length;
  const listeners: Listener[] = [];
  let stream: IWorkStream | false;

  const resEnd = res.end.bind(res);
  const resOn = res.on.bind(res);
  const resWrite = res.write.bind(res);
  const resFlush =
    typeof res.flush === 'function' ? res.flush.bind(res) : () => null;

  const tryImplicitHeader = (instance: IMutableResponse): boolean => {
    try {
      instance._implicitHeader();
      return true;
    } catch (e) {
      return false;
    }
  };

  // flush
  res.flush = function flush() {
    log.debug('response.flush() called');
    if (stream) {
      stream.flush();
    } else {
      resFlush();
    }
  };

  // proxy

  res.write = function write(chunk: any, encoding: any) {
    log.debug(
      'outgoing response.write() called with chunk of length %s',
      chunk.length
    );
    if (ended) {
      log.debug('response.write(): ended flag is true, returning');
      return false;
    }

    if (!this._header) {
      log.debug(
        'response.write(): this._header is false, calling this._implicitHeader()'
      );
      if (!tryImplicitHeader(this)) {
        return false;
      }
    }
    if (stream) {
      log.debug('res.write() has access to stream! writing buffer');
      return stream.write(Buffer.from(chunk, encoding));
    }
    log.debug(
      'res.write() has no access to stream yet. calling underlying response'
    );
    return resWrite.call(this, chunk, encoding);
  };

  res.end = function end(this: IMutableResponse, chunk: any, encoding: any) {
    log.debug('outgoing response.end() called');
    if (ended) {
      log.debug('response.end(): ended is already true, returning');
      return false;
    }

    if (!this._header) {
      log.debug(
        'response.end(): this._header is false, checking content length'
      );
      if (!this.getHeader('Content-Length')) {
        length = chunkLength(chunk, encoding);
        log.debug(
          'response.end(): no Content-Length, %s bytes and counting',
          length
        );
      }
      log.debug('response.end(): calling this._implicitHeader()');
      if (tryImplicitHeader(this)) {
        log.debug('tryImplicitHeader succeeded');
      }
    }

    if (!stream) {
      log.debug('response.end(): stream never became available');
      return resEnd.call(this, chunk, encoding);
    }
    log.debug('response.end(): stream is available, flushing? %s', chunk);
    // mark ended
    ended = true;

    // write Buffer for Node.js 0.8
    if (chunk) {
      log.debug(
        'chunk of length %s exists in .end, writing it to stream',
        chunk.length
      );
      stream.end(Buffer.from(chunk, encoding));
    } else {
      log.debug({ res }, 'no chunk exists in .end, ending stream clean');
      stream.end();
    }
  } as IMutableResponse['end'];

  function addBufferedListener(
    this: IMutableResponse,
    type: string | symbol,
    listener: Handler
  ): IMutableResponse {
    log.debug('res.on called for "%s" event', type);
    if (!listeners || type !== 'drain') {
      log.debug(
        '%s listeners, eventType %s, calling underlying res.on',
        listeners.length,
        type
      );
      return resOn.call(this, type, listener);
    }

    if (stream) {
      log.debug('res.on() has access to stream, passing listener');
      return (stream.on(type, listener) as unknown) as IMutableResponse;
    }

    log.debug('stream does not exist; buffering listeners for future stream');
    listeners.push([type, listener]);

    return this;
  }

  res.on = addBufferedListener;

  const unsplice = () => {
    res.on = resOn;
    res.end = resEnd;
    res.write = resWrite;
    addListeners(res, resOn, listeners);
    listeners.length = 0;
  };

  onHeaders(res, function onResponseHeaders() {
    try {
      if (ended) {
        return;
      }
      stream = makeStream();

      if (!stream) {
        // request is filtered
        unsplice();
        return;
      } else {
        stream.on('error', () => {
          log.debug('stream error, unsplicing');
          unsplice();
        });
      }

      // add buffered listeners to stream
      addListeners(stream, stream.on, listeners);

      // header fields
      res.removeHeader('Content-Length');

      // compression
      stream.on('data', function onStreamData(chunk) {
        if (resWrite(chunk) === false) {
          (stream as IWorkStream).pause();
        }
      });

      stream.on('end', resEnd);

      resOn.call(res, 'drain', function onResponseDrain() {
        (stream as IWorkStream).resume();
      });
    } catch (e) {
      console.error(e);
      res.statusCode = 400;
      res.statusMessage = e.message;
      resEnd();
      ended = true;
    }
  });
  next();
}

/**
 * Add bufferred listeners to stream
 * @private
 */

function addListeners(
  stream: IMutableResponse | IWorkStream,
  on: any,
  listeners: Listener[]
): void {
  for (const listener of listeners) {
    on.apply(stream, listener);
  }
}

/**
 * Get the length of a given chunk
 */

function chunkLength(chunk: any, encoding: any): number {
  if (!chunk) {
    return 0;
  }

  return !Buffer.isBuffer(chunk)
    ? Buffer.byteLength(chunk, encoding)
    : chunk.length;
}
