import { Sharp } from 'sharp';

export type OParam = 'auto' | 'format' | 'disable' | 'enable' | 'quality';

export type OParams = Map<OParam, string>;

export type MParam =
  | 'bg-color'
  | 'blur'
  | 'brightness'
  | 'canvas'
  | 'crop'
  | 'contrast'
  | 'dpr'
  | 'fit'
  | 'height'
  | 'orient'
  | 'pad'
  | 'resize-filter'
  | 'saturation'
  | 'sharpen'
  | 'trim'
  | 'width';

export type MParams = Map<MParam, string>;
export type NumericParams = (number | undefined)[];

export interface Mapper {
  (sharp: Sharp, params: MParams): Sharp;
}

export type Orientation =
  | 'r'
  | 'l'
  | 'h'
  | 'v'
  | 'hv'
  | 'vh'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8';
