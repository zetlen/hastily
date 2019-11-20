'use strict';

import onHeaders from 'on-headers';
import {
  MutableResponse,
  Handler,
  Listener,
  WorkStream
} from './imageopto-types';

const debug = require('debug')('hastily:splice');

export default function splice(
  res: MutableResponse,
  next: (e?: Error) => any,
  makeStream: () => WorkStream | false
) {
  let ended = false;
  let length;
  let listeners: Listener[] = [];
  let stream: WorkStream | false;

  const _end = res.end.bind(res);
  const _on = res.on.bind(res);
  const _write = res.write.bind(res);

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
    if (stream) {
      stream.flush();
    }
  };

  // proxy

  res.write = function write(chunk: any, encoding: any) {
    debug(
      'outgoing response.write() called with %s of length %s',
      encoding || Object.prototype.toString.call(chunk),
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
    return _write.call(this, chunk, encoding);
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
      return _end.call(this, chunk, encoding);
    }
    debug('response.end(): stream is available, flushing? %s', chunk);
    // mark ended
    ended = true;

    // write Buffer for Node.js 0.8
    return chunk ? stream.end(Buffer.from(chunk, encoding)) : stream.end();
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
      return _on.call(this, type, listener);
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
      if (ended) return;
      stream = makeStream();

      if (!stream) {
        // request is filtered
        addListeners(res, _on, listeners);
        listeners.length = 0;
        return;
      }

      // add buffered listeners to stream
      addListeners(stream, stream.on, listeners);

      // header fields
      res.removeHeader('Content-Length');

      // compression
      stream.on('data', function onStreamData(chunk) {
        if (_write(chunk) === false) {
          (stream as WorkStream).pause();
        }
      });

      stream.on('end', _end);

      _on.call(res, 'drain', function onResponseDrain() {
        (stream as WorkStream).resume();
      });
    } catch (e) {
      console.error(e);
      res.statusCode = 400;
      res.statusMessage = e.message;
      _end();
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
) {
  for (let i = 0; i < listeners.length; i++) {
    on.apply(stream, listeners[i]);
  }
}

/**
 * Get the length of a given chunk
 */

function chunkLength(chunk: any, encoding: any) {
  if (!chunk) {
    return 0;
  }

  return !Buffer.isBuffer(chunk)
    ? Buffer.byteLength(chunk, encoding)
    : chunk.length;
}
