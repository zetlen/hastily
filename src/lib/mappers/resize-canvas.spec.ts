// tslint:disable:no-expression-statement
import test from 'ava';
import { ResizeOptions } from 'sharp';
import { FastlyCompatError, FastlyParamError } from '../errors';
import { runMapperWithParams } from './__testhelpers';
import resizeCanvas from './resize-canvas';

const valid: Array<[
  string,
  [number | undefined, number | undefined, ResizeOptions]
]> = [
  [
    'canvas=400,200,x0,y0',
    [
      400,
      200,
      {
        background: 'white',
        fit: 'contain',
        position: 'left top',
        withoutEnlargement: true
      }
    ]
  ],
  [
    'canvas=400,200&bg-color=cef345',
    [
      400,
      200,
      {
        background: '#cef345',
        fit: 'contain',
        withoutEnlargement: true
      }
    ]
  ]
];

const invalid: string[] = ['canvas=iyuakgsjhd'];
const unsupported: string[] = ['canvas=300,300,x90,y10'];

valid.forEach(([query, [width, height, options]]) => {
  test(`calls extend with ${query}`, t => {
    const mockSharp = runMapperWithParams(resizeCanvas, query);
    t.deepEqual(mockSharp.calls[0], ['resize', [width, height, options]]);
  });
});

invalid.forEach(query => {
  test(`throws exception for bad arguments ${query}`, t => {
    t.throws(() => runMapperWithParams(resizeCanvas, query), FastlyParamError);
  });
});

unsupported.forEach(query => {
  test(`throws exception for unsupported arguments ${query}`, t => {
    t.throws(() => runMapperWithParams(resizeCanvas, query), FastlyCompatError);
  });
});
