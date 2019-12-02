/**
 * Only partial compatibility is achieved here. Notes:
 *
 * - Cannot do percentage-based dimension changes using our streaming strategy
 * - Same for percentage-based crops and aspect-ratio-based crops
 */

'use strict';

import accepts from 'accepts';
import makeDebug from 'debug';
import { Request } from 'express';
import { Sharp } from 'sharp';
import { FastlyParamError } from './errors';
import {
  Format,
  Mapper,
  MutableResponse,
  Param,
  Params
} from './imageopto-types';
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
  jpg: (transform, _, quality) => transform.jpeg({ quality }),
  pjpg: (transform, _, quality) =>
    transform.jpeg({ quality, progressive: true }),
  png: (transform, _, quality) => transform.png({ quality }),
  png8: (transform, _, quality) => transform.png({ palette: true, quality }),
  webp: (transform, _, quality) => transform.webp({ quality }),
  webpll: (transform, _, quality) =>
    transform.webp({ quality, lossless: true }),
  webply: (transform, _, quality) => transform.webp({ quality })
};

/**
 * @hidden
 */
export default function optoToSharp(
  options: Partial<Record<Param, string>>,
  transform: Sharp,
  req: Request,
  res: MutableResponse
) {
  debug('starting with %o', options);
  const params = new Map(Object.entries(options));

  let quality: number | undefined;
  if (params.has('quality')) {
    quality = Number(params.get('quality'));
    if (isNaN(quality)) {
      quality = undefined;
    }
  }

  const applied = new Set();
  const paramKeys = params.keys();
  for (const param of paramKeys) {
    const mapper = mappers[param as Param];
    if (mapper && !applied.has(mapper)) {
      debug('running mapper for %s', param);
      applied.add(mapper);
      transform = mapper(transform, params as Params, quality, req, res);
    }
  }

  if (params.get('auto') === 'webp' && accepts(req).type('image/webp')) {
    debug('returning webp');
    res.type('image/webp');
    return transform.webp({
      quality
    });
  }

  const arguedFormat = params.get('format') as Format;

  if (!arguedFormat) {
    debug('no format argument, returning jpeg or whatever');
    res.type('image/jpeg');
    return transform.jpeg({
      force: false,
      quality
    });
  }

  const mapFormat = formatters[arguedFormat];

  if (typeof mapFormat !== 'function') {
    throw new FastlyParamError(params as Params, 'format' as Param);
  }
  debug('attempting "%s" transform', arguedFormat);
  res.type(`image/${arguedFormat}`);
  return mapFormat(transform, params as Params, quality, req, res);
}
