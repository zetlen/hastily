import { IRequestErrors, Warning } from './imageopto-types';

export default class RequestErrors implements IRequestErrors {
  public url: string;
  public warnings: Warning[];
  constructor(url: string, warnings: Warning[]) {
    this.url = url;
    this.warnings = warnings;
  }
  public toJSON(): IRequestErrors {
    return { url: this.url, warnings: this.warnings };
  }
  public toString(): string {
    return `Processing "${this.url}" produced warnings:${this.warnings.map(
      ({ type, msg }) => `\n  - [${type}]: ${msg}`
    )}
`;
  }
}
