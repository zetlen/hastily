import { ServerResponse } from 'http';
import { Response, Request } from 'express';
import { Sharp } from 'sharp';

export type Param =
  | 'bg-color'
  | 'blur'
  | 'brightness'
  | 'canvas'
  | 'crop'
  | 'contrast'
  | 'disable'
  | 'dpr'
  | 'enable'
  | 'fit'
  | 'height'
  | 'orient'
  | 'pad'
  | 'resize-filter'
  | 'saturation'
  | 'sharpen'
  | 'trim'
  | 'width';

export type Params = Map<Param, string>;
export type NumericParams = (number | undefined)[];

export interface Mapper {
  (
    sharp: Sharp,
    params: Params,
    quality: number | undefined,
    req: Request,
    res: MutableResponse
  ): Sharp;
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

export type Format =
  | 'gif'
  | 'png'
  | 'png8'
  | 'jpg'
  | 'pjpg'
  | 'webp'
  | 'webpll'
  | 'webply';

export interface MutableResponse extends ServerResponse, Response {}

export type Handler = (...args: any[]) => any;

export type EventName = string | symbol;

export type Listener = [EventName, Handler];
