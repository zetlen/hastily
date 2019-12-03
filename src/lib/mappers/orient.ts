import { Sharp } from 'sharp';
import { Mapper, Orientation } from '../imageopto-types';

type Orienter = (x: Sharp) => Sharp;
const exif: Orienter = sharp => sharp.rotate();
const right: Orienter = sharp => sharp.rotate(270);
const left: Orienter = sharp => sharp.rotate(90);
const flipH: Orienter = sharp => sharp.flop();
const flipV: Orienter = sharp => sharp.flip();
const flipHV: Orienter = sharp => sharp.flop().flip();

const orienters: Record<Orientation, Orienter> = {
  '1': exif,
  '2': flipH,
  '3': flipHV,
  '4': flipV,
  '5': sharp => flipH(right(sharp)),
  '6': right,
  '7': sharp => flipH(left(sharp)),
  '8': left,
  h: flipH,
  hv: flipHV,
  l: left,
  r: right,
  v: flipV,
  vh: flipHV
};

/**
 * @hidden
 */
const orient: Mapper = (sharp, params) => {
  const orientation = params.get('orient') as Orientation;
  const orienter = orienters[orientation];
  if (!orienter) {
    params.warn(
      'invalid',
      'orient',
      `legal values are ${Object.keys(orienters)}. Will not orient.`
    );
    return false;
  }
  return orienter(sharp);
};

export default orient;
