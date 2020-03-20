// tslint:disable:no-expression-statement
import test from 'ava';
import { ResizeOptions } from 'sharp';
import { WarnType } from '../imageopto-types';
import { runMapperWithParams } from './__testhelpers';
import resizeCanvas from './resize-canvas';

type ResizeArgs = [number | undefined, number | undefined, ResizeOptions];
const valid: [string, ResizeArgs][] = [
  [
    'canvas=400,200,x0,y0',
    [
      400,
      200,
      {
        background: 'white',
        fit: 'contain',
        position: 'left top',
        withoutEnlargement: false
      }
    ]
  ],
  [
    'canvas=400,200&bg-color=cef345',
    [
      400,
      200,
      {
        background: '#cef345',
        fit: 'contain',
        withoutEnlargement: false
      }
    ]
  ],
  [
    'canvas=400,200&bg-color=cef345&fit=bounds',
    [
      400,
      200,
      {
        background: '#cef345',
        fit: 'inside',
        withoutEnlargement: false
      }
    ]
  ],
  [
    'canvas=400,200&bg-color=cef345&fit=wrong',
    [
      400,
      200,
      {
        background: '#cef345',
        fit: 'contain',
        withoutEnlargement: false
      }
    ]
  ]
];

const invalid: string[] = ['canvas=iyuakgsjhd'];
const unsupported: string[] = ['canvas=300,300,x90,y10'];

valid.forEach(([query, [width, height, options]]) => {
  test(`calls extend with ${query}`, t => {
    const { mock, mapped } = runMapperWithParams(resizeCanvas, query);
    t.true(mock === mapped, 'returns sharp');
    t.deepEqual(
      mock.calls[0],
      ['resize', [width, height, options]],
      'calls sharp.resize'
    );
  });
});

const testWarning = (query: string, warningType: WarnType): void => {
  test(`warns for ${warningType} arguments ${query}`, t => {
    const { mock, mapped, warnings } = runMapperWithParams(resizeCanvas, query);
    t.false(mapped, 'returns false');
    t.is(mock.calls.length, 0, 'does not call sharp');
    t.true(warnings.length > 0, 'logs warning');
    t.true(
      warnings.some(({ type }) => type === warningType),
      `warning is for ${warningType} parameter`
    );
  });
};

invalid.forEach(query => testWarning(query, 'invalid'));
unsupported.forEach(query => testWarning(query, 'unsupported'));
