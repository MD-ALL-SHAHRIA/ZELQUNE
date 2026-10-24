import {
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Options,
  Param,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { APP_CONFIG, AppError } from '@zelqune/common';
import { type Request, type Response } from 'express';
import { type CatalogEnv } from '../config/catalog-env';
import {
  LocalStorageProvider,
  type SignedUploadParams,
  UploadRejectedError,
} from './local-storage.provider';
import { STORAGE_PROVIDER, type StorageProvider } from './storage.provider';

/** Key prefixes the service writes: product media and content images (ADR 0015). */
const FOLDERS = new Set(['media', 'content']);

/**
 * Upload/download endpoints for LocalStorageProvider only (404 with R2). Catalog-service HTTP
 * is never exposed publicly; in dev it binds to 127.0.0.1 so the browser can reach it. Uploads
 * come straight from the dashboard in the browser, so allowed origins get CORS headers.
 */
@Controller('dev-storage')
export class DevStorageController {
  constructor(
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    @Inject(APP_CONFIG) private readonly config: CatalogEnv,
  ) {}

  @Options(':folder/:file')
  @HttpCode(204)
  preflight(@Req() req: Request, @Res({ passthrough: true }) res: Response): void {
    this.local();
    this.cors(req, res);
    res.setHeader('Access-Control-Allow-Methods', 'PUT, GET');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.setHeader('Access-Control-Max-Age', '600');
  }

  @Put(':folder/:file')
  @HttpCode(200)
  async upload(
    @Param('folder') folder: string,
    @Param('file') file: string,
    @Query() query: SignedUploadParams,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const local = this.local();
    this.cors(req, res);
    try {
      await local.acceptUpload(this.key(folder, file), query, req.headers['content-type'], req);
    } catch (err) {
      if (err instanceof UploadRejectedError)
        throw new AppError('UPLOAD_REJECTED', err.message, 400);
      throw err;
    }
    return { ok: true };
  }

  @Get(':folder/:file')
  async download(
    @Param('folder') folder: string,
    @Param('file') file: string,
    @Res() res: Response,
  ): Promise<void> {
    const local = this.local();
    const key = this.key(folder, file);
    const object = await local.head(key).catch(() => null);
    if (!object) throw new NotFoundException();
    res.type(object.contentType ?? 'application/octet-stream').sendFile(local.filePath(key));
  }

  private key(folder: string, file: string): string {
    if (!FOLDERS.has(folder)) throw new NotFoundException();
    return `${folder}/${file}`;
  }

  /** Echoes the Origin when it is allowed (never `*`). */
  private cors(req: Request, res: Response): void {
    const origin = req.headers.origin;
    if (origin && this.config.DEV_STORAGE_CORS_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
  }

  private local(): LocalStorageProvider {
    if (!(this.storage instanceof LocalStorageProvider)) throw new NotFoundException();
    return this.storage;
  }
}
