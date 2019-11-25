// tslint:disable:no-expression-statement
import test from 'ava';
import { Request } from 'express';
import { Sharp } from 'sharp';
import { Mapper, MutableResponse, Param, Params } from '../imageopto-types';
import backgroundFlatten from './background-flatten';

const sharp = {
  flatten<T>(x: T) {
    return x;
  }
};

const runMapperWithParams = (mapper: Mapper, params: Params) =>
  mapper(
    sharp as Sharp,
    params,
    undefined,
    ({} as unknown) as Request,
    ({} as unknown) as MutableResponse
  );

test('calls flatten with background as color from param', async t => {
  t.deepEqual(
    runMapperWithParams(
      backgroundFlatten,
      new Map<Param, string>([['bg-color', '255,255,0']])
    ),
    ({ background: { b: 0, g: 255, r: 255 } } as unknown) as Sharp
  );
});
