import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const { login } = useAppContext();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(identifier)) {
      toast.success('Link mágico enviado para seu e-mail institucional!');
      // Simulate clicking the magic link
      setTimeout(() => {
        navigate('/create-password');
      }, 1500);
    } else {
      toast.error('SIAPE ou E-mail não encontrado na base do SIGRH.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 bg-green-700 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">IFES</span>
          </div>
          <CardTitle className="text-2xl">RSC-TAE</CardTitle>
          <CardDescription>
            Reconhecimento de Saberes e Competências
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">SIAPE ou E-mail Institucional</Label>
              <Input
                id="identifier"
                placeholder="Digite seu SIAPE ou e-mail"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">
                Dica: use "1234567" ou "joao.silva@ifes.edu.br" para testar.
              </p>
            </div>
            <Button type="submit" className="w-full bg-green-700 hover:bg-green-800">
              Receber Link de Acesso
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
