import { Mapper } from '../imageopto-types';
import { regionFromParam } from '../helpers';

const extractCrop: Mapper = (sharp, params) => {
  return sharp.extract(regionFromParam(params, 'crop'));
};

export default extractCrop;
