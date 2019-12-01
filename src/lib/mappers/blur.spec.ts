// tslint:disable:no-expression-statement
import test from 'ava';
import { runMapperWithParams } from './__testhelpers';
import blur from './blur';

const valid: Array<[string, number]> = [
  ['1', 1],
  ['4.923', 4.923],
  ['1000', 1000]
];

const invalid: string[] = ['-70', '3000'];

valid.forEach(([input, output]) =>
  test(`calls blur with sigma=${input}`, t => {
    const mockSharp = runMapperWithParams(blur, `blur=${input}`);
    t.deepEqual(mockSharp.calls[0], ['blur', [output]]);
  })
);

invalid.forEach(input =>
  test(`throws exception for out of range sigma=${input}`, t => {
    t.throws(() => runMapperWithParams(blur, `blur=${input}`));
  })
);
