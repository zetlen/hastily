import { regionFromParam } from '../helpers';
import { Mapper } from '../imageopto-types';

const extractCrop: Mapper = (sharp, params) => {
  return sharp.extract(regionFromParam(params, 'crop'));
};

export default extractCrop;
