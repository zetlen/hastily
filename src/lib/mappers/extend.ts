import { Mapper } from '../imageopto-types';

import { ExtendOptions } from 'sharp';

/**
 * @hidden
 */
const extend: Mapper = (sharp, params) => {
  let options;
  try {
    options = params.toCssBox('pad') as ExtendOptions;
  } catch (e) {
    return false;
  }
  options.background = 'white';
  if (params.has('bg-color')) {
    try {
      options.background = params.toColor('bg-color');
    } catch (e) {
      // continue no prob
    }
  }
  return sharp.extend(options);
};

export default extend;
