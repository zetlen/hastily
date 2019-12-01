// tslint:disable:no-expression-statement
import test from 'ava';
import { FastlyParamError } from '../errors';
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
  ['30,140,200,0.5', { b: 200, g: 140, r: 30, alpha: 0.5 }]
];

const invalid: string[] = ['300,300,-04', 'fb98n', '2,3,4,9'];

valid.forEach(([input, background]) =>
  test(`flattens with bg-color=${input}`, t => {
    const mockSharp = runMapperWithParams(
      backgroundFlatten,
      `bg-color=${input}`
    );
    t.deepEqual(mockSharp.calls[0], ['flatten', [{ background }]]);
  })
);

invalid.forEach(input =>
  test(`throws exception for out of range bg-color=${input}`, t => {
    t.throws(
      () => runMapperWithParams(backgroundFlatten, `bg-color=${input}`),
      FastlyParamError
    );
  })
);
