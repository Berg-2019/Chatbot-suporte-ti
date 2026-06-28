import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

/** Limite de tamanho de upload — 25MB cobre foto de celular e mídia de WhatsApp. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Limites multer reutilizáveis (tamanho + 1 arquivo por request). */
export const UPLOAD_LIMITS = { fileSize: MAX_UPLOAD_BYTES, files: 1 };

/**
 * Allowlist de tipos MIME aceitos: imagens, áudio, vídeo, PDF e documentos
 * comuns de office. Bloqueia `application/*` genérico (executáveis, octet-stream).
 */
const ALLOWED_MIME: RegExp[] = [
  /^image\/(jpe?g|png|gif|webp|heic|heif|bmp)$/i,
  /^audio\//i,
  /^video\//i,
  /^application\/pdf$/i,
  /^application\/(msword|vnd\.ms-excel|vnd\.ms-powerpoint)$/i,
  /^application\/vnd\.openxmlformats-officedocument\.[\w.-]+$/i,
  /^text\/plain$/i,
];

/** Extensões perigosas barradas mesmo se o MIME for forjado (defesa em profundidade). */
const BLOCKED_EXT =
  /\.(exe|bat|cmd|com|sh|js|mjs|cjs|php|phtml|pl|py|rb|ps1|jar|msi|dll|scr|vbs|svg|html?)$/i;

/**
 * fileFilter multer compartilhado: barra extensão perigosa e exige MIME na allowlist.
 * Usar junto de `UPLOAD_LIMITS` em todo `MulterModule.register`/`FileInterceptor`.
 */
export function uploadFileFilter(
  _req: unknown,
  file: { mimetype: string; originalname: string },
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  const ext = extname(file.originalname || '').toLowerCase();
  if (BLOCKED_EXT.test(ext)) {
    return cb(new BadRequestException(`Extensão de arquivo não permitida: ${ext}`), false);
  }
  const ok = ALLOWED_MIME.some((re) => re.test(file.mimetype));
  cb(ok ? null : new BadRequestException(`Tipo de arquivo não permitido: ${file.mimetype}`), ok);
}
