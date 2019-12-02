'use strict';

import makeDebug from 'debug';
import { Request } from 'express';
import onHeaders from 'on-headers';
import {
  Handler,
  Listener,
  MutableResponse,
  WorkStream
} from './imageopto-types';

/**
 * @hidden
 */
export default function splice(
  req: Request,
  res: MutableResponse,
  next: (e?: Error) => any,
  makeStream: () => WorkStream | false
) {
  const debug = makeDebug('hastily:splice:' + req.url);
  let ended = false;
  let length;
  const listeners: Listener[] = [];
  let stream: WorkStream | false;

  const resEnd = res.end.bind(res);
  const resOn = res.on.bind(res);
  const resWrite = res.write.bind(res);
  const resFlush =
    typeof res.flush === 'function' ? res.flush.bind(res) : () => null;

  const tryImplicitHeader = (instance: MutableResponse): boolean => {
    try {
      instance._implicitHeader();
      return true;
    } catch (e) {
      return false;
    }
  };

  // flush
  res.flush = function flush() {
    debug('response.flush() called');
    if (stream) {
      stream.flush();
    } else {
      resFlush();
    }
  };

  // proxy

  res.write = function write(chunk: any, encoding: any) {
    debug(
      'outgoing response.write() called with chunk of length %s',
      chunk.length
    );
    if (ended) {
      debug('response.write(): ended flag is true, returning');
      return false;
    }

    if (!this._header) {
      debug(
        'response.write(): this._header is false, calling this._implicitHeader()'
      );
      if (!tryImplicitHeader(this)) {
        return false;
      }
    }
    if (stream) {
      debug('res.write() has access to stream! writing buffer');
      return stream.write(Buffer.from(chunk, encoding));
    }
    debug(
      'res.write() has no access to stream yet. calling underlying response'
    );
    return resWrite.call(this, chunk, encoding);
  };

  res.end = function end(this: MutableResponse, chunk: any, encoding: any) {
    debug('outgoing response.end() called');
    if (ended) {
      debug('response.end(): ended is already true, returning');
      return false;
    }

    if (!this._header) {
      debug('response.end(): this._header is false, checking content length');
      if (!this.getHeader('Content-Length')) {
        length = chunkLength(chunk, encoding);
        debug(
          'response.end(): no Content-Length, %s bytes and counting',
          length
        );
      }
      debug('response.end(): calling this._implicitHeader()');
      if (tryImplicitHeader(this)) {
        return false;
      }
    }

    if (!stream) {
      debug('response.end(): stream never became available');
      return resEnd.call(this, chunk, encoding);
    }
    debug('response.end(): stream is available, flushing? %s', chunk);
    // mark ended
    ended = true;

    // write Buffer for Node.js 0.8
    if (chunk) {
      debug(
        'chunk of length %s exists in .end, writing it to stream',
        chunk.length
      );
      stream.end(Buffer.from(chunk, encoding));
    } else {
      debug('no chunk exists in .end, ending stream clean');
      stream.end();
    }
  } as MutableResponse['end'];

  function addBufferedListener(
    this: MutableResponse,
    type: string | symbol,
    listener: Handler
  ): MutableResponse {
    debug('res.on called for "%s" event', type);
    if (!listeners || type !== 'drain') {
      debug(
        '%s listeners, eventType %s, calling underlying res.on',
        listeners.length,
        type
      );
      return resOn.call(this, type, listener);
    }

    if (stream) {
      debug('res.on() has access to stream, passing listener');
      return (stream.on(type, listener) as unknown) as MutableResponse;
    }

    debug('stream does not exist; buffering listeners for future stream');
    listeners.push([type, listener]);

    return this;
  }

  res.on = addBufferedListener;

  onHeaders(res, function onResponseHeaders() {
    try {
      if (ended) {
        return;
      }
      stream = makeStream();

      if (!stream) {
        // request is filtered
        res.on = resOn;
        res.end = resEnd;
        res.write = resWrite;
        addListeners(res, resOn, listeners);
        listeners.length = 0;
        return;
      }

      // add buffered listeners to stream
      addListeners(stream, stream.on, listeners);

      // header fields
      res.removeHeader('Content-Length');

      // compression
      stream.on('data', function onStreamData(chunk) {
        if (resWrite(chunk) === false) {
          (stream as WorkStream).pause();
        }
      });

      stream.on('end', resEnd);

      resOn.call(res, 'drain', function onResponseDrain() {
        (stream as WorkStream).resume();
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
  stream: MutableResponse | WorkStream,
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
