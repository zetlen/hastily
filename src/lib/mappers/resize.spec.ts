// tslint:disable:no-expression-statement
import test from 'ava';
import { ResizeOptions } from 'sharp';
import { WarnType } from '../imageopto-types';
import { runMapperWithParams } from './__testhelpers';
import resize from './resize';

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
        fit: 'fill',
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
        fit: 'inside',
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
        fit: 'fill',
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
        fit: 'fill',
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
        fit: 'fill',
        kernel: 'cubic',
        withoutEnlargement: true
      }
    ]
  ]
];

type BadCase = [string, boolean];
const invalid: BadCase[] = [
  ['width=asgakshd', true],
  ['width=15&dpr=-5', false],
  ['width=15&dpr=iuahsdk', false]
];
const unsupported: BadCase[] = [
  ['width=0.5', true],
  ['height=50', true],
  ['width=9&fit=blorf', false],
  ['width=29&resize-filter=blurf', false]
];

valid.forEach(([query, [width, height, options]]) => {
  test(`calls extend with ${query}`, t => {
    const { mock, mapped } = runMapperWithParams(resize, query);
    t.true(mock === mapped, 'returns sharp');
    t.deepEqual(
      mock.calls[0],
      ['resize', [width, height, options]],
      'calls sharp.resize'
    );
  });
});

function testWarning(
  query: string,
  cancelled: boolean,
  warningType: WarnType
): void {
  test(`warns for ${warningType} arguments ${query}`, t => {
    const { mock, mapped, warnings } = runMapperWithParams(resize, query);
    if (cancelled) {
      t.false(mapped, 'returns false');
      t.is(mock.calls.length, 0, 'does not call sharp');
    } else {
      t.true(mock === mapped);
    }
    t.true(warnings.length > 0, 'logs warning');
    t.true(
      warnings.some(({ type }) => type === warningType),
      `warning is for ${warningType} parameter`
    );
  });
}

invalid.forEach(([query, cancelled]) =>
  testWarning(query, cancelled, 'invalid')
);
unsupported.forEach(([query, cancelled]) =>
  testWarning(query, cancelled, 'unsupported')
);
