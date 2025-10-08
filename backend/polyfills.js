// backend/polyfills.js

// TextEncoder/Decoder
try {
  const { TextEncoder, TextDecoder } = require('util');
  globalThis.TextEncoder ??= TextEncoder;
  globalThis.TextDecoder ??= TextDecoder;
} catch {}

// Web Streams
try {
  const web = require('stream/web');
  globalThis.ReadableStream  ??= web?.ReadableStream;
  globalThis.WritableStream  ??= web?.WritableStream;
  globalThis.TransformStream ??= web?.TransformStream;
} catch {}

// Blob (Node 16 expõe via 'buffer')
try {
  const { Blob } = require('buffer');
  globalThis.Blob ??= Blob;
} catch {}

// File (não existe em Node 16)
try {
  const File = require('fetch-blob/file.js');
  globalThis.File ??= File;
} catch {}

// fetch/Headers/Request/Response/FormData (undici 5.x)
try {
  const { fetch, Headers, Request, Response, FormData } = require('undici');
  globalThis.fetch    ??= fetch;
  globalThis.Headers  ??= Headers;
  globalThis.Request  ??= Request;
  globalThis.Response ??= Response;
  globalThis.FormData ??= FormData;
} catch {}

// AbortController
try {
  globalThis.AbortController ??= require('abort-controller');
} catch {}
