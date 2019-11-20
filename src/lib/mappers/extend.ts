import { Mapper } from '../imageopto-types';

import { cssBoxFromParam, colorFromParam } from '../helpers';
import { ExtendOptions } from 'sharp';

const extend: Mapper = (sharp, params) => {
  const options = cssBoxFromParam(params, 'pad') as ExtendOptions;
  options.background = params.has('bg-color')
    ? colorFromParam(params, 'bg-color')
    : 'white';
  return sharp.extend(options);
};

export default extend;
