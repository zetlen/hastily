// tslint:disable:no-expression-statement
import test from 'ava';
import { ExtendOptions } from 'sharp';
import { FastlyParamError } from '../errors';
import { runMapperWithParams } from './__testhelpers';
import extend from './extend';

const valid: Array<[string, ExtendOptions]> = [
  [
    'pad=10,25,35,45',
    { background: 'white', bottom: 35, left: 45, right: 25, top: 10 }
  ],
  [
    'pad=10,25,35',
    { background: 'white', bottom: 35, left: 25, right: 25, top: 10 }
  ],
  [
    'pad=10,25',
    {
      background: 'white',
      bottom: 10,
      left: 25,
      right: 25,
      top: 10
    }
  ],
  ['pad=25', { background: 'white', bottom: 25, left: 25, right: 25, top: 25 }],
  [
    'pad=25&bg-color=0,0,16,0.2',
    {
      background: { alpha: 0.2, b: 16, g: 0, r: 0 },
      bottom: 25,
      left: 25,
      right: 25,
      top: 25
    }
  ]
];

const invalid: string[] = [
  'pad=klajshdlajsh',
  'pad=4&bg-color=kajhsdladh89',
  'pad=5,5,5,5,5,5,5',
  'pad=0.5,bg-color=666',
  'pad=20,bg-color=5,6,7,8'
];

valid.forEach(([query, output]) => {
  test(`calls extend with ${query}`, t => {
    const mockSharp = runMapperWithParams(extend, query);
    t.deepEqual(mockSharp.calls[0], ['extend', [output]]);
  });
});

invalid.forEach(query => {
  test(`throws exception for bad arguments ${query}`, t => {
    t.throws(() => runMapperWithParams(extend, query), FastlyParamError);
  });
});
