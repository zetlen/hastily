// tslint:disable:no-expression-statement
import test from 'ava';
import { Sharp } from 'sharp';
import { FastlyParamError } from '../errors';
import { Orientation } from '../imageopto-types';
import { runMapperWithParams } from './__testhelpers';
import orient from './orient';

type OrientCall = [keyof Sharp, any?];
type OrientCallSequence = OrientCall[];
type Case = [Orientation, OrientCallSequence];

function call(name: keyof Sharp, arg?: any): OrientCall {
  return [name, arg ? [arg] : []];
}

const valid: Case[] = [
  ['1', [call('rotate')]],
  ['2', [call('flop')]],
  ['3', [call('flop'), call('flip')]],
  ['4', [call('flip')]],
  ['5', [call('rotate', 270), call('flop')]],
  ['6', [call('rotate', 270)]],
  ['7', [call('rotate', 90), call('flop')]],
  ['8', [call('rotate', 90)]],
  ['h', [call('flop')]],
  ['hv', [call('flop'), call('flip')]],
  ['l', [call('rotate', 90)]],
  ['r', [call('rotate', 270)]],
  ['v', [call('flip')]],
  ['vh', [call('flop'), call('flip')]]
];

valid.forEach(([orientation, calls]) => {
  test(`calls extract with orient=${orientation}`, t => {
    const mockSharp = runMapperWithParams(orient, `orient=${orientation}`);
    t.deepEqual(mockSharp.calls, calls);
  });
});

test(`throws exception for bad orient=wrong`, t => {
  t.throws(() => runMapperWithParams(orient, `orient=wrong`), FastlyParamError);
});
