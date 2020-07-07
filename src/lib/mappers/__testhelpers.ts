/* tslint:disable:variable-name */
import { Request } from 'express';
import sharp, { OutputInfo, Sharp, Matrix3x3 } from 'sharp';
import { Duplex } from 'stream';
import { URLSearchParams } from 'url';
import FastlyParams from '../fastly-params';
import {
  IFastlyParams,
  IMutableResponse,
  Mapper,
  Param,
  Warning,
} from '../imageopto-types';

type SharpCall = [keyof Sharp, any[]];

type Promiseable<T> = sharp.Sharp | Promise<T>;
type CallbackOf<T> = (err: Error, res: T) => void;

class MockSharp extends Duplex implements Sharp {
  public calls: SharpCall[] = [];
  public removeAlpha(): sharp.Sharp {
    throw new Error('Method not implemented.');
  }
  public ensureAlpha(): sharp.Sharp {
    throw new Error('Method not implemented.');
  }
  public extractChannel(..._: any[]): sharp.Sharp {
    throw new Error('Method not implemented.');
  }
  public joinChannel(..._: any[]): sharp.Sharp {
    throw new Error('Method not implemented.');
  }
  public bandbool(..._: any[]): sharp.Sharp {
    throw new Error('Method not implemented.');
  }
  public tint(..._: any[]): sharp.Sharp {
    throw new Error('Method not implemented.');
  }
  public greyscale(..._: any[]): sharp.Sharp {
    throw new Error('Method not implemented.');
  }
  public grayscale(..._: any[]): sharp.Sharp {
    throw new Error('Method not implemented.');
  }
  public toColourspace(..._: any[]): sharp.Sharp {
    throw new Error('Method not implemented.');
  }
  public toColorspace(..._: any[]): sharp.Sharp {
    throw new Error('Method not implemented.');
  }
  public composite(..._: any[]): sharp.Sharp {
    throw new Error('Method not implemented.');
  }
  public clone(): sharp.Sharp {
    throw new Error('Method not implemented.');
  }
  public metadata(
    callback: (err: Error, metadata: sharp.Metadata) => void
  ): sharp.Sharp;
  public metadata(): Promise<sharp.Metadata>;
  public metadata(..._: any[]): sharp.Sharp | Promise<sharp.Metadata> {
    throw new Error('Method not implemented.');
  }
  public stats(callback: (err: Error, stats: sharp.Stats) => void): sharp.Sharp;
  public stats(): Promise<sharp.Stats>;
  public stats(..._: any[]): sharp.Sharp | Promise<sharp.Stats> {
    throw new Error('Method not implemented.');
  }
  public limitInputPixels(..._: any[]): sharp.Sharp {
    throw new Error('Method not implemented.');
  }
  public sequentialRead(..._: any[]): sharp.Sharp {
    throw new Error('Method not implemented.');
  }
  public rotate(
    _angle?: number | undefined,
    _options?: sharp.RotateOptions | undefined
  ): sharp.Sharp {
    return this.track('rotate', arguments);
  }
  public flip(_flip?: boolean | undefined): sharp.Sharp {
    return this.track('flip', arguments);
  }
  public flop(_flop?: boolean | undefined): sharp.Sharp {
    return this.track('flop', arguments);
  }
  public sharpen(
    _sigma?: number | undefined,
    _flat?: number | undefined,
    _jagged?: number | undefined
  ): sharp.Sharp {
    return this.track('sharpen', arguments);
  }
  public median(_size?: number | undefined): sharp.Sharp {
    return this.track('median', arguments);
  }
  public blur(_sigma?: number | undefined): sharp.Sharp {
    return this.track('blur', arguments);
  }
  public flatten(
    _flatten?: boolean | sharp.FlattenOptions | undefined
  ): sharp.Sharp {
    return this.track('flatten', arguments);
  }
  public gamma(_gamma?: number | undefined): sharp.Sharp {
    return this.track('gamma', arguments);
  }
  public negate(_negate?: boolean | undefined): sharp.Sharp {
    return this.track('negate', arguments);
  }
  public normalise(_normalise?: boolean | undefined): sharp.Sharp {
    return this.track('normalise', arguments);
  }
  public normalize(_normalize?: boolean | undefined): sharp.Sharp {
    return this.track('normalize', arguments);
  }
  public convolve(_kernel: sharp.Kernel): sharp.Sharp {
    return this.track('convolve', arguments);
  }
  public threshold(
    _threshold?: number | undefined,
    _options?: sharp.ThresholdOptions | undefined
  ): sharp.Sharp {
    return this.track('threshold', arguments);
  }
  public boolean(
    _operand: string | Buffer,
    _operator: string,
    _options?: { raw: sharp.Raw } | undefined
  ): sharp.Sharp {
    return this.track('boolean', arguments);
  }
  public linear(
    _a?: number | null | undefined,
    _b?: number | undefined
  ): sharp.Sharp {
    return this.track('linear', arguments);
  }
  public recomb(_matrix: Matrix3x3) {
    return this.track('recomb', arguments);
  }
  // public recomb(
  //   _inputMatrix: [
  //     [number, number, number],
  //     [number, number, number],
  //     [number, number, number]
  //   ]
  // ) {
  //   return this.track('recomb', arguments);
  // }
  public modulate(..._: any[]): sharp.Sharp {
    throw new Error('Method not implemented.');
  }

  public toFile(
    fileOut: string,
    callback: CallbackOf<sharp.OutputInfo>
  ): sharp.Sharp;
  public toFile(fileOut: string): Promise<sharp.OutputInfo>;
  public toFile(..._: any[]): Promiseable<sharp.OutputInfo> {
    throw new Error('Method not implemented.');
  }

  public toBuffer(
    callback: (err: Error, buffer: Buffer, info: sharp.OutputInfo) => void
  ): sharp.Sharp;
  public toBuffer(
    options?: { resolveWithObject: false } | undefined
  ): Promise<Buffer>;
  public toBuffer(options: {
    resolveWithObject: true;
  }): Promise<{ data: Buffer; info: sharp.OutputInfo }>;
  public toBuffer(
    options?: any
  ): Promiseable<Buffer> | Promise<{ data: Buffer; info: OutputInfo }> {
    if (typeof options === 'function') {
      setImmediate(() => options(new Error(), Buffer.from([]), {}));
      return this;
    }
    if (options === undefined) {
      return Promise.resolve(Buffer.from([]));
    }
    const resolved: { data: Buffer; info: OutputInfo } = {
      data: Buffer.from([]),
      info: {
        channels: 2,
        format: 'nothing',
        height: 10,
        premultiplied: false,
        size: 10,
        width: 10,
      },
    };
    return Promise.resolve(resolved);
  }
  public withMetadata(..._: any[]): sharp.Sharp {
    throw new Error('Method not implemented.');
  }
  public jpeg(..._: any[]): sharp.Sharp {
    throw new Error('Method not implemented.');
  }
  public png(..._: any[]): sharp.Sharp {
    throw new Error('Method not implemented.');
  }
  public webp(..._: any[]): sharp.Sharp {
    throw new Error('Method not implemented.');
  }
  public tiff(..._: any[]): sharp.Sharp {
    throw new Error('Method not implemented.');
  }
  public raw(): sharp.Sharp {
    throw new Error('Method not implemented.');
  }
  public toFormat(
    _format: string | sharp.AvailableFormatInfo,
    _options?:
      | sharp.JpegOptions
      | sharp.OutputOptions
      | sharp.PngOptions
      | sharp.WebpOptions
      | sharp.TiffOptions
      | undefined
  ): sharp.Sharp {
    return this.track('toFormat', arguments);
  }
  public tile(_tile?: sharp.TileOptions | undefined): sharp.Sharp {
    return this.track('tile', arguments);
  }
  public resize(
    _width?: sharp.ResizeOptions | number | null | undefined,
    _height?: number | null | undefined,
    _options?: sharp.ResizeOptions | undefined
  ): sharp.Sharp {
    return this.track('resize', arguments);
  }
  public extend(_extend: number | sharp.ExtendOptions): sharp.Sharp {
    return this.track('extend', arguments);
  }
  public extract(_region: sharp.Region): sharp.Sharp {
    return this.track('extract', arguments);
  }
  public trim(_threshold?: number | undefined): sharp.Sharp {
    return this.track('threshold', arguments);
  }
  private track(name: keyof Sharp, args: IArguments): MockSharp {
    this.calls.push([name, [...args]]);
    return this;
  }
}

export function mockParams(query: string): IFastlyParams {
  return new FastlyParams(
    new Map<Param, string>(
      (new URLSearchParams(query).entries() as unknown) as Map<Param, string>
    ),
    ({} as unknown) as Request,
    ({} as unknown) as IMutableResponse
  );
}

export function runMapperWithParams(
  mapper: Mapper,
  query: string
): { mock: MockSharp; warnings: Warning[]; mapped: MockSharp | false } {
  const mock = new MockSharp();
  const params = mockParams(query);
  return {
    mapped: mapper(mock, params) as MockSharp | false,
    mock,
    warnings: params.getWarnings(),
  };
}
