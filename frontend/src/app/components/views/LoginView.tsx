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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl relative z-10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/20">
            <Server className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Helpdesk TI</h1>
          <p className="text-slate-400">Entre com suas credenciais GLPI</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">E-mail Corporativo</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-slate-600"
                placeholder="usuario@empresa.com"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium text-slate-300">Senha</label>
              <a href="#" className="text-xs text-blue-400 hover:text-blue-300">Esqueceu a senha?</a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-slate-600"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
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

        <div className="mt-8 text-center text-xs text-slate-500">
          Versão 2.5.0 • Build 2026
        </div>
      </div>
    </div>
  );
}
