import { colorFromParam } from '../helpers';
import { Mapper } from '../mapping-types';

const bgFlatten: Mapper = (sharp, params) =>
  sharp.flatten({ background: colorFromParam(params, 'bg-color') });

export default bgFlatten;
