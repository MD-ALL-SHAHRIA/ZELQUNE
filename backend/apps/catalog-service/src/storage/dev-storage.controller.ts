import {
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { AppError } from '@zelqune/common';
import { type Request, type Response } from 'express';
import {
  LocalStorageProvider,
  type SignedUploadParams,
  UploadRejectedError,
} from './local-storage.provider';
import { STORAGE_PROVIDER, type StorageProvider } from './storage.provider';

/**
 * Upload/download endpoints for LocalStorageProvider only (404 with R2). Catalog-service HTTP
 * is never exposed publicly; in dev it binds to 127.0.0.1 so the browser can reach it.
 */
@Controller('dev-storage')
export class DevStorageController {
  constructor(@Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider) {}

  @Put('media/:file')
  @HttpCode(200)
  async upload(
    @Param('file') file: string,
    @Query() query: SignedUploadParams,
    @Req() req: Request,
  ): Promise<{ ok: true }> {
    const local = this.local();
    try {
      await local.acceptUpload(`media/${file}`, query, req.headers['content-type'], req);
    } catch (err) {
      if (err instanceof UploadRejectedError)
        throw new AppError('UPLOAD_REJECTED', err.message, 400);
      throw err;
    }
    return { ok: true };
  }

  @Get('media/:file')
  async download(@Param('file') file: string, @Res() res: Response): Promise<void> {
    const local = this.local();
    const key = `media/${file}`;
    const object = await local.head(key).catch(() => null);
    if (!object) throw new NotFoundException();
    res.type(object.contentType ?? 'application/octet-stream').sendFile(local.filePath(key));
  }

  private local(): LocalStorageProvider {
    if (!(this.storage instanceof LocalStorageProvider)) throw new NotFoundException();
    return this.storage;
  }
}
