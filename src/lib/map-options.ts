/**
 * Only partial compatibility is achieved here. Notes:
 *
 * - Cannot do percentage-based dimension changes using our streaming strategy
 * - Same for percentage-based crops and aspect-ratio-based crops
 */

'use strict';

import accepts from 'accepts';
import makeDebug from 'debug';
import sharp from 'sharp';
import { Format, IFastlyParams, Mapper, Param } from './imageopto-types';

import bgFlatten from './mappers/background-flatten';
import blur from './mappers/blur';
import extend from './mappers/extend';
import extractCrop from './mappers/extract-crop';
import orient from './mappers/orient';
import resize from './mappers/resize';
import resizeCanvas from './mappers/resize-canvas';
import unsupported from './mappers/unsupported';

const debug = makeDebug('hastily:options');

const mappers: Record<Param, Mapper> = {
  'bg-color': bgFlatten,
  blur,
  brightness: unsupported('brightness', 'absolute brightness adjustment'),
  canvas: resizeCanvas,
  contrast: unsupported('contrast', 'absolute contrast adjustment'),
  crop: extractCrop,
  disable: resize,
  dpr: resize,
  enable: resize,
  fit: resize,
  height: resize,
  orient,
  pad: extend,
  'resize-filter': resize,
  saturation: unsupported('saturation', 'absolute saturation adjustment'),
  sharpen: unsupported('sharpen', 'unsharp mask'),
  trim: unsupported('trim', 'relative trimming from all four sides'),
  width: resize
};

const formatters: Record<Format, Mapper> = {
  gif: unsupported('format' as Param, 'GIF output unsupported by node-hastily'),
  jpg: (transform, params) => transform.jpeg({ quality: params.quality }),
  pjpg: (transform, params) =>
    transform.jpeg({ quality: params.quality, progressive: true }),
  png: (transform, params) => transform.png({ quality: params.quality }),
  png8: (transform, params) =>
    transform.png({ palette: true, quality: params.quality }),
  webp: (transform, params) => transform.webp({ quality: params.quality }),
  webpll: (transform, params) =>
    transform.webp({ quality: params.quality, lossless: true }),
  webply: (transform, params) => transform.webp({ quality: params.quality })
};

/**
 * @hidden
 */
export default function optoToSharp(params: IFastlyParams) {
  const applied = new Set();
  const { req, res } = params;
  const { query } = req;
  const paramKeys = Object.keys(query);
  let transform = sharp();
  for (const param of paramKeys) {
    const mapper = mappers[param as Param];
    if (mapper && !applied.has(mapper)) {
      debug('running mapper for %s', param);
      const out = mapper(transform, params);
      if (out) {
        applied.add(mapper);
        transform = out;
      }
    }
  }

  if (query.auto === 'webp' && accepts(req).type('image/webp')) {
    debug('returning webp');
    res.type('image/webp');
    return formatters.webp(transform, params);
  }

  const arguedFormat = query.format as Format;
  const tryJpeg: Mapper = (xform, { quality }) => {
    if (applied.size === 0) {
      debug('no mappers or formatters applied, doing nothing');
      return false;
    }
    return xform.jpeg({
      force: false,
      quality
    });
  };

  if (!arguedFormat) {
    debug('no format argument, returning jpeg or whatever');
    res.type('image/jpeg');
    return tryJpeg(transform, params);
  }

  const mapFormat = formatters[arguedFormat];

  if (typeof mapFormat !== 'function') {
    debug('bad format argument %s, returning jpeg', arguedFormat);
    return tryJpeg(transform, params);
  }
  debug('attempting "%s" transform', arguedFormat);
  res.type(`image/${arguedFormat}`);
  return mapFormat(transform, params);
}
