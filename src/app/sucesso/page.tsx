import Link from "next/link";

export default function SuccessPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Pagamento confirmado</p>
        <h1>Bem-vindo ao Autonomy.</h1>
        <p>Sua conta esta pronta para gerar posts completos.</p>
        <Link className="primary-link full" href="/dashboard">
          Ir para o dashboard
        </Link>
      </section>
    </main>
  );
}
