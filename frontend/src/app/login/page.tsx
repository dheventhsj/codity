'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAppStore((s) => s.setAuth);
  const setProject = useAppStore((s) => s.setProject);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('demo@codity.dev');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const body = isRegister ? { email, password, name } : { email, password };
      const res = await apiClient<{
        token: string;
        user: { id: string; email: string; name: string };
        organization?: { id: string; name: string; slug: string };
        organizations?: Array<{ id: string; name: string; slug: string }>;
      }>(endpoint, { method: 'POST', body });

      const data = res.data!;
      const org = data.organization ?? data.organizations?.[0] ?? null;
      setAuth(data.token, data.user, org);

      if (org) {
        const projects = await apiClient<Array<{ id: string; name: string }>>(
          `/projects?organizationId=${org.id}`,
          { token: data.token }
        );
        const paginated = projects as unknown as { data: Array<{ id: string; name: string }> };
        if (paginated.data?.[0]) {
          setProject(paginated.data[0]);
        }
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0B0B] p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#3B82F6]">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold">Codity</h1>
            <p className="text-sm text-[#A1A1AA]">Distributed Job Scheduler</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isRegister ? 'Create account' : 'Sign in'}</CardTitle>
            <CardDescription>
              {isRegister ? 'Start scheduling jobs at scale' : 'Access your job scheduling platform'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#A1A1AA]">Name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#A1A1AA]">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#A1A1AA]">Password</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              </div>
              {error && (
                <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Loading...' : isRegister ? 'Create account' : 'Sign in'}
              </Button>
            </form>
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="mt-4 w-full text-center text-xs text-[#A1A1AA] hover:text-white"
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
