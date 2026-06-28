import * as path from 'path';

/**
 * Resolve o caminho absoluto em disco de uma mídia a partir do `mediaUrl`
 * relativo servido estaticamente (ex.: `/uploads/messages/<f>`,
 * `/uploads/attachments/<f>`).
 *
 * Garantias:
 * - Restringe o resultado ao diretório `uploads/` (defesa contra path traversal
 *   e contra URLs http legadas que apontavam para endpoints, não arquivos).
 * - Decodifica antes de checar, bloqueando traversal codificado (`%2e%2e`).
 *
 * Retorna o caminho absoluto, ou `null` se não puder resolver com segurança.
 */
export function resolveOutgoingMediaPath(
  mediaUrl: string,
  cwd: string = process.cwd(),
): string | null {
  if (!mediaUrl) return null;

  // Remove origem http(s) e querystring/hash.
  let rel = String(mediaUrl).replace(/^https?:\/\/[^/]+/i, '').split(/[?#]/)[0];
  try {
    rel = decodeURIComponent(rel);
  } catch {
    /* mantém como veio se não for percent-encoding válido */
  }
  rel = rel.replace(/^\/+/, '');
  if (!rel) return null;

  const uploadsRoot = path.resolve(cwd, 'uploads');
  const resolved = path.resolve(cwd, rel);

  if (resolved !== uploadsRoot && !resolved.startsWith(uploadsRoot + path.sep)) {
    return null;
  }
  return resolved;
}
