/**
 * Only partial compatibility is achieved here. Notes:
 *
 * - Cannot do percentage-based dimension changes using our streaming strategy
 * - Same for percentage-based crops and aspect-ratio-based crops
 */

'use strict';

import accepts from 'accepts';
import {
  Format,
  Param,
  Params,
  Mapper,
  MutableResponse
} from './imageopto-types';
import extend from './mappers/extend';
import extractCrop from './mappers/extract-crop';
import resize from './mappers/resize';
import resizeCanvas from './mappers/resize-canvas';
import unsupported from './mappers/unsupported';
import { Sharp } from 'sharp';
import bgFlatten from './mappers/background-flatten';
import orient from './mappers/orient';
import blur from './mappers/blur';
import { Request } from 'express';
import { FastlyParamError } from './errors';

const mappers: Record<Param, Mapper> = {
  'bg-color': bgFlatten,
  blur: blur,
  brightness: unsupported('brightness', 'absolute brightness adjustment'),
  contrast: unsupported('contrast', 'absolute contrast adjustment'),
  canvas: resizeCanvas,
  crop: extractCrop,
  disable: resize,
  dpr: resize,
  enable: resize,
  fit: resize,
  height: resize,
  orient: orient,
  pad: extend,
  'resize-filter': resize,
  saturation: unsupported('saturation', 'absolute saturation adjustment'),
  sharpen: unsupported('sharpen', 'unsharp mask'),
  trim: unsupported('trim', 'relative trimming from all four sides'),
  width: resize
};

const formatters: Record<Format, Mapper> = {
  gif: unsupported('format' as Param, 'GIF output unsupported by node-hastily'),
  png: (transform, _, quality) => transform.png({ quality }),
  png8: (transform, _, quality) => transform.png({ palette: true, quality }),
  jpg: (transform, _, quality) => transform.jpeg({ quality }),
  pjpg: (transform, _, quality) =>
    transform.jpeg({ quality, progressive: true }),
  webp: (transform, _, quality) => transform.webp({ quality }),
  webpll: (transform, _, quality) =>
    transform.webp({ quality, lossless: true }),
  webply: (transform, _, quality) => transform.webp({ quality })
};

export default function optoToSharp(
  options: Partial<Record<Param, string>>,
  transform: Sharp,
  req: Request,
  res: MutableResponse
) {
  const params = new Map(Object.entries(options));

  let quality = undefined;
  if (params.has('quality')) {
    quality = Number(params.get('quality'));
    if (isNaN(quality)) {
      quality = undefined;
    }
  }

  let applied = new Set();
  const paramKeys = params.keys();
  for (let param of paramKeys) {
    const mapper = mappers[<Param>param];
    if (mapper && !applied.has(mapper)) {
      applied.add(mapper);
      transform = mapper(transform, params as Params, quality, req, res);
    }
  }

  if (params.get('auto') === 'webp' && accepts(req).type('image/webp')) {
    res.type('image/webp');
    return transform.webp({
      quality
    });
  }

  const arguedFormat = <Format>params.get('format');

  if (!arguedFormat) {
    return transform.jpeg({
      quality,
      force: false
    });
  }

  const mapFormat = formatters[arguedFormat];

  if (typeof mapFormat !== 'function') {
    throw new FastlyParamError(params as Params, 'format' as Param);
  }
  return mapFormat(transform, params as Params, quality, req, res);
}
