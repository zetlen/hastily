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
    const { mock, mapped } = runMapperWithParams(blur, `blur=${input}`);
    t.true(mock === mapped, 'returns sharp');
    t.deepEqual(mock.calls[0], ['blur', [output]], 'runs sharp.blur');
  })
);

invalid.forEach(input =>
  test(`throws exception for out of range sigma=${input}`, t => {
    const { mock, mapped, warnings } = runMapperWithParams(
      blur,
      `blur=${input}`
    );
    t.false(mapped, 'returns false');
    t.is(mock.calls.length, 0, 'does not call sharp');
    t.true(warnings.length > 0, 'logs warning');
    t.is(warnings[0].type, 'invalid', 'warning is for invalid parameter');
  })
);
