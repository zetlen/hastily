// tslint:disable:no-expression-statement
import test from 'ava';
import { ExtendOptions } from 'sharp';
import { WarnType } from '../imageopto-types';
import { runMapperWithParams } from './__testhelpers';
import extend from './extend';

const valid: [string, ExtendOptions][] = [
  [
    'pad=10,25,35,45',
    { background: 'white', bottom: 35, left: 45, right: 25, top: 10 },
  ],
  [
    'pad=10,25,35',
    { background: 'white', bottom: 35, left: 25, right: 25, top: 10 },
  ],
  [
    'pad=10,25',
    {
      background: 'white',
      bottom: 10,
      left: 25,
      right: 25,
      top: 10,
    },
  ],
  ['pad=25', { background: 'white', bottom: 25, left: 25, right: 25, top: 25 }],
  [
    'pad=25&bg-color=0,0,16,0.2',
    {
      background: { alpha: 0.2, b: 16, g: 0, r: 0 },
      bottom: 25,
      left: 25,
      right: 25,
      top: 25,
    },
  ],
];

const invalid: string[] = [
  'pad=klajshdlajsh',
  'pad=5,5,5,5,5,5,5',
  'pad=20,bg-color=5,6,7,8',
];

const unsupported: string[] = ['pad=0.5,bg-color=666'];

valid.forEach(([query, output]) => {
  test(`calls extend with ${query}`, (t) => {
    const { mock, mapped } = runMapperWithParams(extend, query);
    t.true(mock === mapped, 'returns sharp');
    t.deepEqual(mock.calls[0], ['extend', [output]], 'runs sharp.extend');
  });
});

function testWarn(query: string, warnType: WarnType) {
  test(`warns for ${warnType} ${query}`, (t) => {
    const { mock, mapped, warnings } = runMapperWithParams(extend, query);
    t.false(mapped, 'returns false');
    t.is(mock.calls.length, 0, 'does not call sharp');
    t.true(warnings.length > 0, 'logs warning');
    t.true(
      warnings.some(({ type }) => type === warnType),
      `warning is for ${warnType} parameter`
    );
  });
}

invalid.forEach((query) => {
  testWarn(query, 'invalid');
});

unsupported.forEach((query) => {
  testWarn(query, 'unsupported');
});
