import test from 'ava';
import { FastlyParamError } from './errors';
import * as h from './helpers';
import { Param } from './imageopto-types';

test('getTaggedValues honors positionals', t => {
  t.deepEqual(
    h.getTaggedValues(
      new Map<Param, string>([['canvas', 'a,b,ccee,ddee,feff,eeee']]),
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
      f: 'eff'
    }
  );
});

test('getTaggedValues honors positionals 2 s', t => {
  t.deepEqual(
    h.getTaggedValues(
      new Map<Param, string>([['canvas', '300,300,x90,y10']]),
      'canvas',
      ['width', 'height'],
      ['x', 'y', 'smart', 'offset-x', 'offset-y']
    ),
    {
      height: '300',
      width: '300',
      x: '90',
      y: '10'
    }
  );
});

test('getTaggedValues does not put named params in positionals', t => {
  t.throws(
    () =>
      h.getTaggedValues(
        new Map<Param, string>([['canvas', '400,gutter5']]),
        'canvas',
        ['width', 'height'],
        ['gutter']
      ),
    FastlyParamError
  );
});
