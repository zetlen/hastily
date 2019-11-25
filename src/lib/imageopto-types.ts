import { Request, Response } from 'express';
import { ServerResponse } from 'http';
import { Sharp } from 'sharp';
import { Duplex } from 'stream';

export type DebugLogger = (message: string, ...args: readonly any[]) => any;

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
export type NumericParams = Array<number | undefined>;

export type Mapper = (
  sharp: Sharp,
  params: Params,
  quality: number | undefined,
  req: Request,
  res: MutableResponse
) => Sharp;

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

export interface MutableResponse extends ServerResponse, Response {
  _header: any;
  flush(): any;
  _implicitHeader(): any;
}

export type Handler = (...args: readonly any[]) => any;

export type EventName = string | symbol;

export type Listener = readonly [EventName, Handler];

export interface WorkStream extends Duplex {
  flush(): any;
}
