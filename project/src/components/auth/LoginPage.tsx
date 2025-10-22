import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError('Credenciales inválidas. Por favor inténtalo de nuevo.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <img
        src="/Copia de LATAM Template  copy.png"
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ imageRendering: 'crisp-edges' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/40 to-white/50" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/40 p-8 animate-fade-in">
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-2xl p-4 shadow-md border border-secondary-200">
              <img
                src="/logotipo solo.png"
                alt="Logo"
                className="w-20 h-20 object-contain"
              />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary-900 mb-2">
              E-Procurement
            </h1>
            <p className="text-secondary-600 text-sm">
              Sistema de Gestión de Compras
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg text-sm animate-slide-in">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-secondary-900 mb-1.5">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 disabled:bg-secondary-50 disabled:cursor-not-allowed hover:border-primary-300 text-secondary-900 placeholder:text-secondary-400"
                placeholder="tu@correo.com"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-secondary-900 mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 disabled:bg-secondary-50 disabled:cursor-not-allowed hover:border-primary-300 text-secondary-900 placeholder:text-secondary-400"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-700 to-primary-900 text-white py-2.5 rounded-lg font-medium hover:from-primary-800 hover:to-primary-950 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-secondary-200">
            <p className="text-xs text-center text-secondary-500">
              Usuarios de prueba disponibles en el sistema
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
