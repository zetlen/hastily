// tslint:disable:no-expression-statement
import test from 'ava';
import { ResizeOptions } from 'sharp';
import { FastlyCompatError, FastlyParamError } from '../errors';
import { runMapperWithParams } from './__testhelpers';
import resize from './resize';

test('does nothing without width', t => {
  const mockSharp = runMapperWithParams(resize, 'height=100');
  t.is(mockSharp.calls.length, 0);
});

const valid: Array<[
  string,
  [number | undefined, number | undefined, ResizeOptions]
]> = [
  [
    'width=400',
    [
      400,
      undefined,
      {
        withoutEnlargement: true
      }
    ]
  ],
  [
    'width=400&height=300&dpr=1.8',
    [
      720,
      540,
      {
        withoutEnlargement: true
      }
    ]
  ],
  [
    'width=400&dpr=2',
    [
      800,
      undefined,
      {
        withoutEnlargement: true
      }
    ]
  ],
  [
    'width=4&height=6&fit=bounds',
    [
      4,
      6,
      {
        fit: 'contain',
        withoutEnlargement: true
      }
    ]
  ],
  [
    'width=4&height=6&enable=true',
    [
      4,
      6,
      {
        withoutEnlargement: false
      }
    ]
  ],
  [
    'width=4&height=6&disable=false',
    [
      4,
      6,
      {
        withoutEnlargement: false
      }
    ]
  ],
  [
    'width=4&height=6&resize-filter=bicubic',
    [
      4,
      6,
      {
        kernel: 'cubic',
        withoutEnlargement: true
      }
    ]
  ]
];

const invalid: string[] = [
  'width=asgakshd',
  'width=15&dpr=-5',
  'width=9&fit=blorf',
  'width=29&resize-filter=blurf'
];
const unsupported: string[] = ['width=0.5'];

valid.forEach(([query, [width, height, options]]) => {
  test(`calls extend with ${query}`, t => {
    const mockSharp = runMapperWithParams(resize, query);
    t.deepEqual(mockSharp.calls[0], ['resize', [width, height, options]]);
  });
});

invalid.forEach(query => {
  test(`throws exception for bad arguments ${query}`, t => {
    t.throws(() => runMapperWithParams(resize, query), FastlyParamError);
  });
});

unsupported.forEach(query => {
  test(`throws exception for unsupported arguments ${query}`, t => {
    t.throws(() => runMapperWithParams(resize, query), FastlyCompatError);
  });
});
