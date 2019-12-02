import { colorFromParam } from '../helpers';
import { Mapper } from '../imageopto-types';

/**
 * @hidden
 */
const bgFlatten: Mapper = (sharp, params) =>
  sharp.flatten({ background: colorFromParam(params, 'bg-color') });

export default bgFlatten;
