import test from 'ava';
import { mockParams } from './mappers/__testhelpers';

test('quality getter works', (t) => {
  const noQuality = mockParams('');
  t.is(noQuality.quality, undefined, 'unset quality is undefined');
  t.is(noQuality.quality, undefined, 'cached quality');
  t.is(
    mockParams('quality=nothing').quality,
    undefined,
    'NaN quality is undefined'
  );
  t.is(mockParams('quality=50').quality, 50, 'numeric quality is stored');
});

test('toTaggedValues honors positionals', (t) => {
  t.deepEqual(
    mockParams('canvas=a,b,ccee,ddee,feff,eeee').toTaggedValues(
      'canvas',
      ['ay', 'bee'],
      ['c', 'd', 'e', 'f']
    ),
    {
      ay: 'a',
      bee: 'b',
      c: 'cee',
      d: 'dee',
      e: 'eee',
      f: 'eff',
    }
  );
});

test('toTaggedValues honors positionals 2 s', (t) => {
  t.deepEqual(
    mockParams('canvas=300,300,x90,y10').toTaggedValues(
      'canvas',
      ['width', 'height'],
      ['x', 'y', 'smart', 'offset-x', 'offset-y']
    ),
    {
      height: '300',
      width: '300',
      x: '90',
      y: '10',
    }
  );
});

test('toTaggedValues does not put named params in positionals', (t) => {
  t.throws(() =>
    mockParams('canvas=400,gutter5').toTaggedValues(
      'canvas',
      ['width', 'height'],
      ['gutter']
    )
  );
});
