'use client'

import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from 'next/navigation'
import { useToast } from "@/hooks/useToast";

const Register = () => {
  const router = useRouter();

  const toast = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !password) {
      toast.error("Заполните все поля");
      return;
    }

    if (password.length < 6) {
      toast.error("Пароль должен быть не менее 6 символов");
      return;
    }

    setIsLoading(true);
    const result = await register(name, email, password);
    setIsLoading(false);

    if (result.success) {
      toast.success("Регистрация успешна!");
      router.push("/")
    } else {
      toast.error(result.error || "Ошибка регистрации");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[430px] mx-auto min-h-screen bg-background pb-8">
        <Header />
        
        <main className="px-6 space-y-8 mt-10">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Регистрация</h1>
            <p className="text-muted-foreground text-sm">
              Создайте аккаунт для начала работы
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">Имя</Label>
              <Input
                id="name"
                type="text"
                placeholder="Введите имя"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 bg-card border-border"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-card border-border"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Минимум 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-card border-border"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:opacity-90 text-foreground font-medium rounded-xl h-12"
              disabled={isLoading}
            >
              {isLoading ? "Регистрация..." : "Зарегистрироваться"}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Уже есть аккаунт?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="text-primary hover:underline"
                >
                  Войти
                </button>
              </p>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default Register;
