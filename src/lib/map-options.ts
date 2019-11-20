/**
 * Only partial compatibility is achieved here. Notes:
 *
 * - Cannot do percentage-based dimension changes using our streaming strategy
 * - Same for percentage-based crops and aspect-ratio-based crops
 */

'use strict';

import { MParam, MParams, Mapper } from './mapping-types';
import extend from './mappers/extend';
import extractCrop from './mappers/extract-crop';
import resize from './mappers/resize';
import resizeCanvas from './mappers/resize-canvas';
import unsupported from './mappers/unsupported';
import sharp from 'sharp';
import bgFlatten from './mappers/background-flatten';
import orient from './mappers/orient';
import blur from './mappers/blur';

const mappers: Record<MParam, Mapper> = {
  'bg-color': bgFlatten,
  blur: blur,
  brightness: unsupported('brightness', 'absolute brightness adjustment'),
  contrast: unsupported('contrast', 'absolute contrast adjustment'),
  canvas: resizeCanvas,
  crop: extractCrop,
  dpr: resize,
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

export default function optoToSharp(options: Partial<Record<MParam, string>>) {
  const params = new Map(Object.entries(options)) as MParams;
  let applied = new Set();
  let transform = sharp();
  for (let param of params.keys()) {
    const strategy = mappers[param];
    if (strategy && !applied.has(strategy)) {
      applied.add(strategy);
      transform = strategy(transform, params);
    }
  }
  return transform;
}
