import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";
import { ReadableStream, WritableStream, TransformStream } from "stream/web";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodeStreamWeb = require("stream/web");

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { MessageChannel, MessagePort, BroadcastChannel } = require("worker_threads");

Object.assign(global, {
  TextEncoder,
  TextDecoder,
  ReadableStream,
  WritableStream,
  TransformStream,
  MessageChannel,
  MessagePort,
  BroadcastChannel,
  TextEncoderStream: nodeStreamWeb.TextEncoderStream,
  TextDecoderStream: nodeStreamWeb.TextDecoderStream,
});

// undici's fetch/Response/Headers/Request implementation requires
// TextEncoder/TextDecoder/streams to already be on the global object,
// so it must be required after the assignment above.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const undici = require("undici");
Object.assign(global, {
  fetch: undici.fetch,
  Headers: undici.Headers,
  Request: undici.Request,
  Response: undici.Response,
});

// jsdom has no layout engine, so ResizeObserver (used by the composer's
// autosizing textarea) and scrollIntoView are not implemented.
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = ResizeObserverPolyfill;
if (typeof (window as any).Element !== "undefined") {
  (window as any).Element.prototype.scrollTo =
    (window as any).Element.prototype.scrollTo || (() => {});
}
if (typeof (window as any).HTMLElement !== "undefined") {
  (window as any).HTMLElement.prototype.scrollIntoView =
    (window as any).HTMLElement.prototype.scrollIntoView || (() => {});
}

// jsdom doesn't implement BroadcastChannel / structuredClone needed by some deps
if (typeof (global as any).structuredClone === "undefined") {
  (global as any).structuredClone = (v: any) => JSON.parse(JSON.stringify(v));
}
