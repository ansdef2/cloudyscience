'use client'

import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";

const Login = () => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Заполните все поля");
      return;
    }

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      toast.success("Добро пожаловать!");
      router.push("/");
    } else {
      toast.error(result.error || "Ошибка входа");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[430px] mx-auto min-h-screen bg-background pb-8">
        <Header />

        <main className="px-6 space-y-8 mt-10">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Войти</h1>
            <p className="text-muted-foreground text-sm">
              Войдите в аккаунт для доступа ко всем функциям
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="Введите пароль"
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
              {isLoading ? "Вход..." : "Войти"}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Нет аккаунта?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/register")}
                  className="text-primary hover:underline"
                >
                  Зарегистрироваться
                </button>
              </p>
            </div>
          </form>

          <div className="pt-8">
            <div className="bg-card/30 rounded-2xl p-4 space-y-3">
              <h3 className="font-semibold text-foreground">Тестовый аккаунт</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="text-foreground">user@cloudco.ru</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Пароль:</span>
                  <span className="text-foreground">user123</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Login;
