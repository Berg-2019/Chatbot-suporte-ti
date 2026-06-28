import { resolveOutgoingMediaPath } from './media-path.util';

describe('resolveOutgoingMediaPath', () => {
  const cwd = '/app';

  it('resolve mídia de chat (/uploads/messages/<f>)', () => {
    expect(resolveOutgoingMediaPath('/uploads/messages/abc.png', cwd)).toBe(
      '/app/uploads/messages/abc.png',
    );
  });

  it('resolve anexo de ticket (/uploads/attachments/<f>)', () => {
    expect(resolveOutgoingMediaPath('/uploads/attachments/123-456.jpg', cwd)).toBe(
      '/app/uploads/attachments/123-456.jpg',
    );
  });

  it('aceita caminho sem barra inicial', () => {
    expect(resolveOutgoingMediaPath('uploads/messages/x.ogg', cwd)).toBe(
      '/app/uploads/messages/x.ogg',
    );
  });

  it('ignora querystring/hash', () => {
    expect(resolveOutgoingMediaPath('/uploads/messages/x.png?token=1#frag', cwd)).toBe(
      '/app/uploads/messages/x.png',
    );
  });

  it('REJEITA a URL http legada para o endpoint de attachment (causa do bug)', () => {
    // Formato antigo gerado pelo addAttachment — apontava para um endpoint, não
    // para um arquivo em uploads/. O bot então procurava em uploads/messages/file.
    expect(
      resolveOutgoingMediaPath('http://backend:3000/api/tickets/attachments/abc/file', cwd),
    ).toBeNull();
  });

  it('REJEITA path traversal (escapa de uploads/)', () => {
    expect(resolveOutgoingMediaPath('/uploads/../../etc/passwd', cwd)).toBeNull();
    expect(resolveOutgoingMediaPath('/uploads/%2e%2e/%2e%2e/etc/passwd', cwd)).toBeNull();
  });

  it('REJEITA vazio/inválido', () => {
    expect(resolveOutgoingMediaPath('', cwd)).toBeNull();
    expect(resolveOutgoingMediaPath('/', cwd)).toBeNull();
    expect(resolveOutgoingMediaPath('/etc/passwd', cwd)).toBeNull();
  });
});
