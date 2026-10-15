import { detectImageType } from './image-upload.interceptor';

describe('image upload - Unitary Test', () => {
  const pad = (bytes: number[] | Buffer): Buffer => Buffer.concat([Buffer.from(bytes), Buffer.alloc(32)]).subarray(0, 32);

  it.each([
    ['image/jpeg', pad([0xff, 0xd8, 0xff, 0xe0])],
    ['image/png', pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ['image/gif', pad(Buffer.from('GIF89a'))],
    ['image/webp', pad(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]))],
    ['image/avif', pad(Buffer.concat([Buffer.from([0, 0, 0, 0x1c]), Buffer.from('ftypavif')]))],
  ])('should recognize %s by its first bytes', (expected, header) => {
    expect(detectImageType(header)).toBe(expected);
  });

  it.each([
    ['a PDF renamed to .jpg', pad(Buffer.from('%PDF-1.7'))],
    ['an HTML page', pad(Buffer.from('<!doctype html>'))],
    ['a Windows executable', pad(Buffer.from('MZ'))],
    ['an empty file', Buffer.alloc(0)],
  ])('should refuse %s', (_label, header) => {
    expect(detectImageType(header)).toBeNull();
  });
});
