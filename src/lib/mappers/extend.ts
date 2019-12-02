import { Mapper } from '../imageopto-types';

import { ExtendOptions } from 'sharp';
import { colorFromParam, cssBoxFromParam } from '../helpers';

/**
 * @hidden
 */
const extend: Mapper = (sharp, params) => {
  const options = cssBoxFromParam(params, 'pad') as ExtendOptions;
  options.background = params.has('bg-color')
    ? colorFromParam(params, 'bg-color')
    : 'white';
  return sharp.extend(options);
};

export default extend;
