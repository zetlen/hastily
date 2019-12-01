// tslint:disable:no-expression-statement
import test from 'ava';
import { Region } from 'sharp';
import { FastlyParamError } from '../errors';
import { runMapperWithParams } from './__testhelpers';
import extractCrop from './extract-crop';

const valid: Array<[string, Region]> = [
  ['250,500,x40,y6', { height: 500, left: 40, top: 6, width: 250 }],
  ['500,250,y34,x100', { height: 250, left: 100, top: 34, width: 500 }]
];

const invalid: string[] = [
  // these would never work on fastly either
  '',
  '250',
  ',400',
  '500,-1000,x',
  '20,40,x6,y0,q39',
  '20,40,x14,yjhksda39',
  'a9oh'
];

const unsupported: string[] = [
  // these would work on fastly, so we apologize
  '2:3',
  '50,x9',
  '500,4,x6',
  '500,3,y2',
  '500,x6,y0.2',
  '20,50,y23,x98,offset-x0.2',
  '20,40,x39,y0.2',
  '20,300,smart'
];

valid.forEach(([crop, expected]) => {
  test(`calls extract with crop=${crop}`, t => {
    const mockSharp = runMapperWithParams(extractCrop, `crop=${crop}`);
    t.deepEqual(mockSharp.calls[0], ['extract', [expected]]);
  });
});

invalid.forEach(crop => {
  test(`throws exception for invalid crop=${crop}`, t => {
    t.throws(
      () => runMapperWithParams(extractCrop, `crop=${crop}`),
      FastlyParamError
    );
  });
});

unsupported.forEach(crop => {
  test(`throws exception for unsupported crop=${crop}`, t => {
    t.throws(
      () => runMapperWithParams(extractCrop, `crop=${crop}`),
      FastlyParamError
    );
  });
});
