import Link from "next/link";

export default function CanceledPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Checkout cancelado</p>
        <h1>Nenhuma cobranca foi feita.</h1>
        <p>Voce pode escolher um plano quando quiser continuar.</p>
        <Link className="primary-link full" href="/#planos">
          Ver planos
        </Link>
      </section>
    </main>
  );
}
