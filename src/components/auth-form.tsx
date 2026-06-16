"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get("plan") || "pro";
  const [fullName, setFullName] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();

      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          throw signInError;
        }

        router.push("/dashboard");
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            document,
            phone,
            plan: selectedPlan
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      const checkoutResponse = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          plan: selectedPlan,
          email,
          name: fullName,
          document,
          phone
        })
      });
      const checkout = await checkoutResponse.json();

      if (!checkoutResponse.ok) {
        throw new Error(checkout.error || "Nao foi possivel iniciar o pagamento.");
      }

      window.location.href = checkout.url;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Nao foi possivel continuar."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="auth-logo" href="/">
          <span>
            <Sparkles size={21} />
          </span>
          Autonomy
        </Link>
        <p className="eyebrow">{mode === "login" ? "Entrar" : "Criar conta"}</p>
        <h1>
          {mode === "login"
            ? "Acesse seu painel."
            : "Crie sua conta e escolha seu plano."}
        </h1>
        <form className="form-stack" onSubmit={submit}>
          {mode === "signup" && (
            <>
              <label>
                <span>Nome completo</span>
                <input
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </label>
              <label>
                <span>CPF ou CNPJ</span>
                <input
                  inputMode="numeric"
                  value={document}
                  onChange={(event) => setDocument(event.target.value)}
                  required
                />
              </label>
              <label>
                <span>Celular</span>
                <input
                  autoComplete="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                />
              </label>
            </>
          )}
          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            <span>Senha</span>
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>
          {error && <p className="error-message">{error}</p>}
          <button className="primary-button" type="submit" disabled={isLoading}>
            <ArrowRight size={18} />
            {isLoading
              ? "Aguarde..."
              : mode === "login"
                ? "Entrar"
                : "Criar conta e pagar"}
          </button>
        </form>
        <p className="auth-switch">
          {mode === "login" ? "Ainda nao tem conta?" : "Ja tem conta?"}{" "}
          <Link href={mode === "login" ? "/cadastro" : "/login"}>
            {mode === "login" ? "Criar conta" : "Entrar"}
          </Link>
        </p>
      </section>
    </main>
  );
}
