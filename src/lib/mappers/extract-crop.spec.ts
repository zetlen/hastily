// tslint:disable:no-expression-statement
import test from 'ava';
import { Region } from 'sharp';
import { runMapperWithParams } from './__testhelpers';
import extractCrop from './extract-crop';

const valid: [string, Partial<Region>][] = [
  ['250,500,x40,y6', { height: 500, left: 40, top: 6, width: 250 }],
  ['500,250,y34,x100', { height: 250, left: 100, top: 34, width: 500 }]
];

const invalid: string[] = [
  // these would never work on fastly either
  '',
  '250',
  '20,40,x6,y0,q39',
  '20,40x6,x14,yjhksda',
  '500,x6,y0.2',
  '40,50,x0,ykjabsd',
  '50,x9',
  'a9oh'
];

const unsupported: string[] = [
  // these would work on fastly, so we apologize
  '2:3',
  ',400',
  '500,4,x6',
  '500,3,y2',
  '500,-1000,x',
  '20,50,y23,x98,offset-x0.2',
  '20,40,x39,y0.2',
  '20,300,smart'
];

valid.forEach(([crop, expected]) => {
  test(`calls extract with crop=${crop}`, t => {
    const { mock, mapped } = runMapperWithParams(extractCrop, `crop=${crop}`);
    t.true(mock === mapped, 'returns sharp');
    t.deepEqual(mock.calls[0], ['extract', [expected]], 'calls sharp.extract');
  });
});

invalid.forEach(input =>
  test(`warns for invalid crop=${input}`, t => {
    const { mock, mapped, warnings } = runMapperWithParams(
      extractCrop,
      `crop=${input}`
    );
    t.true(mapped === false, 'returns false');
    t.is(mock.calls.length, 0, 'does not call sharp');
    t.true(warnings.length > 0, 'logs warning');
    t.true(
      warnings.some(({ type }) => type === 'invalid'),
      `warning is for invalid parameter: ${JSON.stringify(warnings)}`
    );
  })
);

unsupported.forEach(crop => {
  test(`warns for unsupported crop=${crop}`, t => {
    const { mock, mapped, warnings } = runMapperWithParams(
      extractCrop,
      `crop=${crop}`
    );
    t.true(mapped === false, 'returns false');
    t.is(mock.calls.length, 0, 'does not call sharp');
    t.true(warnings.length > 0, 'logs warning');
    t.true(
      warnings.some(({ type }) => type === 'unsupported'),
      'warning is for unsupported parameter'
    );
  });
});
