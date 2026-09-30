import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';

// backend/uploads/<subdir>/ — plain local disk storage, no S3/MinIO, per
// project spec. Files are served back out via ServeStaticModule at
// /uploads/<subdir>/<filename> (see app.module.ts).
export const ISSUE_MEDIA_SUBDIR = 'issues'; // citizen-submitted report photos
export const EVIDENCE_MEDIA_SUBDIR = 'evidence'; // officer repair-evidence photos

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]);

function resolveUploadsRoot(): string {
  // dist/main.js at runtime -> ../uploads ; ts-node-dev runs from src/ but
  // both live directly under backend/, so anchoring on process.cwd()
  // (always the backend/ dir the app is launched from) works for both.
  return join(process.cwd(), 'uploads');
}

function buildMulterOptions(subdir: string) {
  const destination = join(resolveUploadsRoot(), subdir);
  if (!existsSync(destination)) {
    mkdirSync(destination, { recursive: true });
  }

  const maxFileSizeMb = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10);

  return {
    storage: diskStorage({
      destination,
      filename: (_req, file, callback) => {
        const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
        callback(null, uniqueName);
      },
    }),
    limits: {
      fileSize: maxFileSizeMb * 1024 * 1024,
    },
    fileFilter: (
      _req: unknown,
      file: Express.Multer.File,
      callback: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        callback(
          new BadRequestException(
            `Unsupported file type: ${file.mimetype}. Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}`,
          ),
          false,
        );
        return;
      }
      callback(null, true);
    },
  };
}

export function issueMediaMulterOptions() {
  return buildMulterOptions(ISSUE_MEDIA_SUBDIR);
}

export function evidenceMediaMulterOptions() {
  return buildMulterOptions(EVIDENCE_MEDIA_SUBDIR);
}

// Relative path stored in issue_media.file_path, and the public URL the
// frontend uses to display it.
export function relativeMediaPath(
  filename: string,
  subdir: string = ISSUE_MEDIA_SUBDIR,
): string {
  return join(subdir, filename);
}

export function mediaPublicUrl(filePath: string): string {
  return `/uploads/${filePath.split('\\').join('/')}`;
}
