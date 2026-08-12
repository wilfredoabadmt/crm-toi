import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareText } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api';
import type { User } from '@/lib/types';

export function LoginPage() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const login = useMutation({
    mutationFn: () => api.post<{ user: User }>('/api/auth/login', { email, password }),
    onSuccess: (data) => {
      queryClient.setQueryData(['me'], data);
      queryClient.invalidateQueries();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión'),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    login.mutate();
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#060709] text-slate-100 overflow-hidden p-4">
      {/* Resplandores de fondo estilo landing TOI */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#1a75ff]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#00e5ff]/5 blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl glass-card overflow-hidden p-3">
            <img src="/logo.png" alt="Logo" className="h-full w-full object-contain logo-glow" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">SaaS TOI</h1>
            <p className="mt-1 text-sm text-slate-400">Plataforma de Cobranza ISP</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="glass-card p-8">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@negocio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="glass-input"
              />
            </div>
            {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}
            
            <Button 
              type="submit" 
              className="w-full mt-2 btn-glossy-primary py-2.5 rounded-xl" 
              loading={login.isPending}
            >
              Iniciar sesión
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <Link href="/register" className="text-xs text-slate-400 hover:text-white font-medium transition-colors">
            ¿Eres nuevo? Inicia una prueba gratuita de 5 días
          </Link>
        </div>
      </div>
    </div>
  );
}
