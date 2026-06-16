import Link from "next/link";
import { ArrowRight, Check, Sparkles, Wand2 } from "lucide-react";
import { plans } from "@/lib/plans";

export default function LandingPage() {
  return (
    <main className="marketing-page">
      <nav className="marketing-nav">
        <Link className="marketing-brand" href="/">
          <span>
            <Sparkles size={21} />
          </span>
          Autonomy
        </Link>
        <div>
          <Link href="/login">Entrar</Link>
          <Link className="nav-cta" href="/cadastro">
            Comecar agora
          </Link>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">IA para social media</p>
          <h1>Crie posts completos para Instagram em minutos.</h1>
          <p>
            Gere imagem, descricao, hashtags e carrosseis com briefing simples.
            Salve na biblioteca e prepare sua operacao para agendar publicacoes.
          </p>
          <div className="hero-actions">
            <Link className="primary-link" href="/cadastro">
              Criar conta
              <ArrowRight size={18} />
            </Link>
            <Link className="secondary-link" href="#planos">
              Ver planos
            </Link>
          </div>
        </div>
        <div className="hero-product">
          <div className="hero-card-preview">
            <div className="preview-toolbar">
              <Wand2 size={19} />
              Post pronto
            </div>
            <div className="preview-image">
              <span>Macro nutrientes sem confusao</span>
            </div>
            <p>
              Descricao persuasiva, CTA, hashtags e imagem quadrada pronta para
              postar.
            </p>
          </div>
        </div>
      </section>

      <section className="plans-section" id="planos">
        <div className="section-heading">
          <p className="eyebrow">Planos</p>
          <h2>Comece pequeno. Escale quando a demanda crescer.</h2>
        </div>
        <div className="pricing-grid">
          {plans.map((plan) => (
            <article className={plan.featured ? "pricing-card featured" : "pricing-card"} key={plan.id}>
              {plan.featured && <div className="popular-badge">Mais popular</div>}
              <h3>{plan.name}</h3>
              <p>{plan.description}</p>
              <strong>{plan.price}<span>/mês</span></strong>
              <div className="plan-meta">
                <span>{plan.credits}</span>
                <span>{plan.instagramAccounts}</span>
              </div>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={16} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link className="plan-button" href={`/cadastro?plan=${plan.id}`}>
                Escolher {plan.name}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
