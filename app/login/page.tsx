'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-light tracking-wide text-center mb-8">Pottery Inventory</h1>
        <form
          onSubmit={handleLogin}
          className="bg-white border border-[#e5e5e5] rounded-2xl p-8 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#6b6b6b] uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#111] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#6b6b6b] uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#111] transition-colors"
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-[#111] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
