import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { Lock, Mail, Loader2, Server } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginView() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        toast.success('Login realizado com sucesso', {
          description: 'Conectado ao servidor GLPI'
        });
      } else {
        toast.error('Falha na autenticação', {
          description: 'Verifique suas credenciais'
        });
      }
    } catch (error) {
      toast.error('Erro no servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: 'var(--cw-bg-primary)' }}>
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[100px]" style={{ backgroundColor: 'rgba(31, 147, 255, 0.08)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[100px]" style={{ backgroundColor: 'rgba(139, 92, 246, 0.06)' }} />
      </div>

      <div
        className="w-full max-w-md rounded-2xl p-8 backdrop-blur-xl relative z-10 shadow-2xl border"
        style={{
          backgroundColor: 'var(--cw-bg-secondary)',
          borderColor: 'var(--cw-border)',
        }}
      >
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--cw-accent), #6366F1)' }}
          >
            <Server className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--cw-text-primary)' }}>Helpdesk TI</h1>
          <p style={{ color: 'var(--cw-text-secondary)' }}>Entre com suas credenciais GLPI</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--cw-text-secondary)' }}>Usuário ou E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2" size={20} style={{ color: 'var(--cw-text-tertiary)' }} />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg pl-10 pr-4 py-3 outline-none transition-all border"
                style={{
                  backgroundColor: 'var(--cw-bg-tertiary)',
                  borderColor: 'var(--cw-border)',
                  color: 'var(--cw-text-primary)',
                }}
                placeholder="usuario ou usuario@empresa.com"
                disabled={isLoading}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--cw-accent)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--cw-border)'}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium" style={{ color: 'var(--cw-text-secondary)' }}>Senha</label>
              <a href="#" className="text-xs" style={{ color: 'var(--cw-accent)' }}>Esqueceu a senha?</a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2" size={20} style={{ color: 'var(--cw-text-tertiary)' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg pl-10 pr-4 py-3 outline-none transition-all border"
                style={{
                  backgroundColor: 'var(--cw-bg-tertiary)',
                  borderColor: 'var(--cw-border)',
                  color: 'var(--cw-text-primary)',
                }}
                placeholder="••••••••"
                disabled={isLoading}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--cw-accent)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--cw-border)'}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            style={{
              backgroundColor: 'var(--cw-accent)',
            }}
            onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = 'var(--cw-accent-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--cw-accent)' }}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Autenticando...
              </>
            ) : (
              'Acessar Sistema'
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>
          Versão 2.5.0 • Build 2026
        </div>
      </div>
    </div>
  );
}
