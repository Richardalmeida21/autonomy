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

      await assertSignupFieldsAvailable({ document, email, language });

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
        if (isAlreadyRegisteredError(signUpError.message)) {
          const { data: signInData, error: existingAccountSignInError } =
            await supabase.auth.signInWithPassword({
              email,
              password
            });

          if (existingAccountSignInError || !signInData.session?.access_token) {
            throw signUpError;
          }

          await startCheckout(signInData.session.access_token);
          return;
        }

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
          ? getFriendlyAuthError(caughtError.message, language)
          : tx(language, "Não foi possível continuar.", "Could not continue.")
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function startCheckout(token: string) {
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
          tx(language, "Nao foi possivel iniciar o pagamento.", "Could not start checkout.")
      );
    }

    window.location.href = checkout.url;
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="auth-logo" href="/">
          <Image src={logoImg} alt="Autonomy Logo" height={44} className="logo-img" />
        </Link>
        <h1>
          {mode === "login"
            ? tx(language, "Acesse seu painel", "Access your dashboard")
            : tx(language, "Crie sua conta", "Create your account")}
        </h1>
        {mode === "signup" && <SignupSteps language={language} />}
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

function SignupSteps({ language }: { language: Language }) {
  return (
    <div className="signup-steps" aria-label={tx(language, "Etapas do cadastro", "Signup steps")}>
      <div className="active">
        <span>1</span>
        <strong>{tx(language, "Dados", "Details")}</strong>
      </div>
      <div>
        <span>2</span>
        <strong>{tx(language, "Plano", "Plan")}</strong>
      </div>
      <div>
        <span>3</span>
        <strong>{tx(language, "Pagamento", "Payment")}</strong>
      </div>
    </div>
  );
}

async function assertSignupFieldsAvailable({
  document,
  email,
  language
}: {
  document: string;
  email: string;
  language: Language;
}) {
  const response = await fetch("/api/signup/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document, email })
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
        tx(language, "Nao foi possivel verificar seus dados.", "Could not verify your details.")
    );
  }

  if (data.documentExists) {
    throw new Error(
      tx(
        language,
        "Ja existe um usuario com esse CPF ou CNPJ.",
        "There is already a user with this tax ID."
      )
    );
  }

  if (data.emailExists) {
    throw new Error(
      tx(
        language,
        "Ja existe um usuario com esse email.",
        "There is already a user with this email."
      )
    );
  }
}

function getFriendlyAuthError(message: string, language: Language) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("already registered") ||
    normalizedMessage.includes("user already") ||
    normalizedMessage.includes("already exists") ||
    normalizedMessage.includes("usuario ja existe") ||
    normalizedMessage.includes("usuário já existe")
  ) {
    return tx(
      language,
      "Ja existe um usuario com esse email.",
      "There is already a user with this email."
    );
  }

  if (
    normalizedMessage.includes("cpf") ||
    normalizedMessage.includes("cnpj") ||
    normalizedMessage.includes("document")
  ) {
    return tx(
      language,
      "Ja existe um usuario com esse CPF ou CNPJ.",
      "There is already a user with this tax ID."
    );
  }

  if (normalizedMessage.includes("no such price")) {
    return tx(
      language,
      "Nao foi possivel encontrar o plano selecionado. Tente novamente em instantes.",
      "Could not find the selected plan. Please try again shortly."
    );
  }

  if (normalizedMessage.includes("stripe_secret_key")) {
    return tx(
      language,
      "Pagamento indisponivel no momento. Tente novamente em instantes.",
      "Payment is temporarily unavailable. Please try again shortly."
    );
  }

  if (normalizedMessage.includes("invalid login credentials")) {
    return tx(language, "Email ou senha incorretos.", "Incorrect email or password.");
  }

  return message;
}

function isAlreadyRegisteredError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("already registered") ||
    normalizedMessage.includes("user already") ||
    normalizedMessage.includes("already exists") ||
    normalizedMessage.includes("usuario ja existe") ||
    normalizedMessage.includes("usuÃ¡rio jÃ¡ existe")
  );
}
