import { LogOptionsOpts, Meta } from "./types";

export class LogOptions {
  meta?: Meta;

  constructor({ meta }: LogOptionsOpts) {
    this.meta = meta;
  }
}
