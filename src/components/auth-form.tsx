"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { saveProfile } from "@/lib/profile-client";
import { getSupabaseClient } from "@/lib/supabase-client";
import logoImg from "@/images/logo_autonomy.png";

type Language = "pt" | "en";

function tx(language: Language, pt: string, en: string) {
  return language === "en" ? en : pt;
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const language: Language =
    searchParams.get("lang") === "en" ||
    (typeof window !== "undefined" &&
      window.localStorage.getItem("autonomy.language") === "en")
      ? "en"
      : "pt";
  const selectedPlan = searchParams.get("plan") || "pro";
  const wasConfirmed = searchParams.get("confirmed") === "1";
  const [fullName, setFullName] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    window.localStorage.setItem("autonomy.language", language);

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

        router.push(language === "en" ? "/dashboard?lang=en" : "/dashboard");
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login?confirmed=1${language === "en" ? "&lang=en" : ""}`,
          data: {
            full_name: fullName,
            document,
            phone
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      const session = signUpData.session;
      const token = session?.access_token;

      if (!token) {
        throw new Error(
          tx(
            language,
            "Conta criada. Entre com seu email e senha para finalizar o pagamento.",
            "Account created. Sign in with your email and password to finish payment."
          )
        );
      }

      await saveProfile({
        email,
        fullName,
        document,
        phone
      });

      const checkoutResponse = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
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
        throw new Error(
          checkout.error ||
            tx(language, "Não foi possível iniciar o pagamento.", "Could not start checkout.")
        );
      }

      window.location.href = checkout.url;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : tx(language, "Não foi possível continuar.", "Could not continue.")
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="auth-logo" href="/">
          <Image src={logoImg} alt="Autonomy Logo" height={32} className="logo-img" />
        </Link>
        <p className="eyebrow">
          {mode === "login"
            ? tx(language, "Entrar", "Sign in")
            : tx(language, "Criar conta", "Create account")}
        </p>
        <h1>
          {mode === "login"
            ? tx(language, "Acesse seu painel.", "Access your dashboard.")
            : tx(language, "Crie sua conta e escolha seu plano.", "Create your account and choose your plan.")}
        </h1>
        <form className="form-stack" onSubmit={submit}>
          {mode === "signup" && (
            <>
              <label>
                <span>{tx(language, "Nome completo", "Full name")}</span>
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
                <span>{tx(language, "Celular", "Phone")}</span>
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
            <span>{tx(language, "Senha", "Password")}</span>
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
          {mode === "login" && wasConfirmed && (
            <p className="success-message">
              {tx(language, "Email confirmado. Agora você já pode entrar.", "Email confirmed. You can sign in now.")}
            </p>
          )}
          <button className="primary-button" type="submit" disabled={isLoading}>
            <ArrowRight size={18} />
            {isLoading
              ? tx(language, "Aguarde...", "Please wait...")
              : mode === "login"
                ? tx(language, "Entrar", "Sign in")
                : tx(language, "Criar conta e pagar", "Create account and pay")}
          </button>
        </form>
        <p className="auth-switch">
          {mode === "login"
            ? tx(language, "Ainda não tem conta?", "Do not have an account yet?")
            : tx(language, "Já tem conta?", "Already have an account?")}{" "}
          <Link href={mode === "login" ? `/cadastro?lang=${language}` : `/login?lang=${language}`}>
            {mode === "login"
              ? tx(language, "Criar conta", "Create account")
              : tx(language, "Entrar", "Sign in")}
          </Link>
        </p>
      </section>
    </main>
  );
}
