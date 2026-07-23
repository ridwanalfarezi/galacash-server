import { describe, expect, it } from 'bun:test';
import type { NextFunction, Request, Response } from 'express';
import { Readable } from 'node:stream';
import {
  handleFileUpload,
  handleOptionalFileUpload,
} from '@/middlewares/upload.middleware';
import { ValidationError } from '@/utils/errors';
import { validPngBuffer } from '../../helpers/files';

function createFile(
  buffer: Buffer,
  originalname = 'proof.png',
  mimetype = 'image/png'
): Express.Multer.File {
  return {
    fieldname: 'paymentProof',
    originalname,
    encoding: '7bit',
    mimetype,
    size: buffer.length,
    destination: '',
    filename: originalname,
    path: '',
    buffer,
    stream: Readable.from(buffer),
  };
}

async function runMiddleware(
  middleware: ReturnType<typeof handleFileUpload>,
  file?: Express.Multer.File
): Promise<{ error?: unknown; fileUrl?: string }> {
  const request = { file } as Request;
  let error: unknown;
  const next: NextFunction = (nextError?: unknown) => {
    error = nextError;
  };

  await middleware(request, {} as Response, next);
  return { error, fileUrl: request.fileUrl };
}

describe('upload middleware', () => {
  it('rejects a required upload when no file is supplied', async () => {
    const result = await runMiddleware(handleFileUpload('payments'));

    expect(result.error).toBeInstanceOf(ValidationError);
    expect((result.error as Error).message).toBe('File is required');
  });

  it('accepts a PNG with a valid signature and returns a deterministic test URL', async () => {
    const result = await runMiddleware(
      handleFileUpload('payments'),
      createFile(validPngBuffer)
    );

    expect(result.error).toBeUndefined();
    expect(result.fileUrl).toBe('mock://test-uploads/payments/proof.png');
  });

  it('rejects an image whose content does not match its declared type', async () => {
    const result = await runMiddleware(
      handleFileUpload('payments'),
      createFile(Buffer.from('not-a-png'))
    );

    expect(result.error).toBeInstanceOf(ValidationError);
    expect((result.error as Error).message).toContain('does not match');
  });

  it('rejects an extension that does not match an allowed upload type', async () => {
    const result = await runMiddleware(
      handleFileUpload('payments'),
      createFile(validPngBuffer, 'proof.gif', 'image/png')
    );

    expect(result.error).toBeInstanceOf(ValidationError);
    expect((result.error as Error).message).toContain('Invalid file extension');
  });

  it('allows an optional upload to be omitted', async () => {
    const result = await runMiddleware(handleOptionalFileUpload('payments'));

    expect(result.error).toBeUndefined();
    expect(result.fileUrl).toBeUndefined();
  });
});
