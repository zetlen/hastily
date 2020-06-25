// tslint:disable:no-expression-statement
import test from 'ava';
import { runMapperWithParams } from './__testhelpers';
import backgroundFlatten from './background-flatten';

type Case = [
  string,
  string | { b: number; g: number; r: number; alpha?: number }
];
const valid: Case[] = [
  ['255,255,0', { b: 0, g: 255, r: 255 }],
  ['ABC', '#ABC'],
  ['AABBCC', '#AABBCC'],
  ['C0FFEE', '#C0FFEE'],
  ['abc', '#abc'],
  ['aabbcc', '#aabbcc'],
  ['c0ffee', '#c0ffee'],
  ['30,140,200,0.5', { b: 200, g: 140, r: 30, alpha: 0.5 }],
];

const invalid: string[] = ['300,300,-04', 'fb98n', '2,3,4,9'];

valid.forEach(([input, background]) =>
  test(`flattens with bg-color=${input}`, (t) => {
    const { mock, mapped } = runMapperWithParams(
      backgroundFlatten,
      `bg-color=${input}`
    );
    t.true(mock === mapped, 'returns sharp instance');
    t.deepEqual(
      mock.calls[0],
      ['flatten', [{ background }]],
      'calls sharp.flatten'
    );
  })
);

invalid.forEach((input) =>
  test(`returns false and warns for out of range bg-color=${input}`, (t) => {
    const { mock, warnings, mapped } = runMapperWithParams(
      backgroundFlatten,
      `bg-color=${input}`
    );
    t.false(mapped, 'returns false');
    t.is(mock.calls.length, 0, 'does not call sharp');
    t.true(warnings.length > 0, 'logs warning');
    t.is(warnings[0].type, 'invalid', 'warning is for invalid parameter');
  })
);
