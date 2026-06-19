"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, FormEvent } from "react";
import { ChevronRight, Check, Plus, Minus, Sparkles, TrendingUp, Cpu } from "lucide-react";
import { plans } from "@/lib/plans";
import logoImg from "@/images/logo_autonomy.png";

type Language = "pt" | "en";

function tx(language: Language, pt: string, en: string) {
  return language === "en" ? en : pt;
}

function translatePlanText(value: string, language: Language) {
  if (language !== "en") {
    return value;
  }

  return value
    .replace(/créditos/gi, "credits")
    .replace(/credito/gi, "credit")
    .replace(/contas do Instagram/gi, "Instagram accounts")
    .replace(/conta do Instagram/gi, "Instagram account")
    .replace(/posts completos/gi, "complete posts")
    .replace(/imagens/gi, "images")
    .replace(/agendamento/gi, "scheduling")
    .replace(/suporte/gi, "support")
    .replace(/prioritário/gi, "priority")
    .replace(/por mês/gi, "per month")
    .replace(/mês/gi, "month")
    .replace(/Até/gi, "Up to")
    .replace(/até/gi, "up to");
}

export default function LandingPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>("pt");
  const [email, setEmail] = useState("");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextLanguage =
      params.get("lang") === "en" ||
      window.localStorage.getItem("autonomy.language") === "en"
        ? "en"
        : "pt";
    setLanguage(nextLanguage);
    window.localStorage.setItem("autonomy.language", nextLanguage);
  }, []);

  const localizedFaqs =
    language === "en"
      ? [
          {
            question: "How does AI post creation work?",
            answer:
              "You provide a short brief or topic for your business. Autonomy creates professional visuals, writes the caption, and suggests relevant hashtags for your niche."
          },
          {
            question: "Can I cancel my subscription at any time?",
            answer:
              "Yes. There is no long-term contract. You can manage or cancel your subscription from the dashboard."
          },
          {
            question: "How many Instagram accounts can I manage?",
            answer:
              "It depends on the plan: Starter supports 1 account, Pro supports up to 3 accounts, and Agency supports up to 10 accounts."
          },
          {
            question: "Are the generated creatives and captions unique?",
            answer:
              "Yes. Each image, caption, and hashtag set is generated on demand from your brief."
          },
          {
            question: "Do I need design experience?",
            answer:
              "No. Autonomy is designed to create professional posts without complex design tools."
          }
        ]
      : [
          {
            question: "Como funciona a criação de posts com IA?",
            answer:
              "Você fornece um briefing rápido ou tema da sua área de atuação. O Autonomy cria imagens profissionais, escreve a legenda e sugere hashtags relevantes para o seu nicho."
          },
          {
            question: "Posso cancelar minha assinatura a qualquer momento?",
            answer:
              "Sim. Não há contrato de fidelidade. Você pode gerenciar ou cancelar sua assinatura pelo painel."
          },
          {
            question: "Quantas contas do Instagram posso gerenciar?",
            answer:
              "O limite depende do plano escolhido: Starter suporta 1 conta, Pro até 3 contas e Agency até 10 contas."
          },
          {
            question: "Os criativos e textos gerados são exclusivos?",
            answer:
              "Sim. Cada imagem, legenda e conjunto de hashtags são gerados sob demanda com base no seu briefing."
          },
          {
            question: "Preciso de conhecimentos de design para usar?",
            answer:
              "Não. O Autonomy foi feito para criar posts profissionais sem depender de ferramentas complexas."
          }
        ];

  function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email) return;
    window.localStorage.setItem("autonomy.language", language);
    router.push(
      `/cadastro?email=${encodeURIComponent(email)}${language === "en" ? "&lang=en" : ""}`
    );
  }

  function toggleFaq(index: number) {
    setActiveFaq(activeFaq === index ? null : index);
  }

  function setMarketingLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    window.localStorage.setItem("autonomy.language", nextLanguage);
  }

  return (
    <main className="marketing-page">
      {/* Header */}
      <nav className="marketing-nav">
        <Link className="marketing-brand" href="/">
          <Image 
            src={logoImg} 
            alt="Autonomy Logo" 
            height={36} 
            priority
            className="logo-img"
          />
        </Link>
        <div className="nav-actions">
          <LanguageCards language={language} onChange={setMarketingLanguage} />
          <Link className="nav-signin-btn" href={language === "en" ? "/login?lang=en" : "/login"}>
            {tx(language, "Entrar", "Sign in")}
          </Link>
          <Link className="nav-signup-btn" href={language === "en" ? "/cadastro?lang=en" : "/cadastro"}>{tx(language, "Começar agora", "Start now")}</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <span className="hero-badge">
            <Sparkles size={14} className="badge-icon" />
            {tx(language, "Nova inteligência artificial de imagem integrada", "Integrated AI image generation")}
          </span>
          <h1>
            {tx(
              language,
              "Seu feed do Instagram criado por IA. Enquanto você foca no seu negócio.",
              "Your Instagram feed, created by AI while you focus on your business."
            )}
          </h1>
          <h2>
            {tx(
              language,
              "Crie, agende e publique conteúdos profissionais em segundos. Cancele quando quiser.",
              "Create, schedule, and publish professional Instagram content in seconds. Cancel anytime."
            )}
          </h2>
          
          <form className="hero-cta-form" onSubmit={handleStart}>
            <div className="cta-form-group">
              <input 
                type="email" 
                placeholder={tx(language, "Insira seu endereço de email", "Enter your email address")}
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit">
                {tx(language, "Começar agora", "Start now")}
                <ChevronRight size={20} />
              </button>
            </div>
            <p className="cta-disclaimer">{tx(language, "Experimente hoje mesmo. Sem compromisso de fidelidade.", "Try it today. No long-term commitment.")}</p>
          </form>
        </div>

        {/* Visual Principal: Dashboard SaaS Mockup com Badges Flutuantes */}
        <div className="dashboard-preview-container">
          {/* Badges flutuantes de alta conversao */}
          <div className="floating-badge fb-1">
            <TrendingUp size={14} className="fb-icon" />
            <span>{tx(language, "+214% Alcance Orgânico", "+214% organic reach")}</span>
          </div>
          <div className="floating-badge fb-2">
            <Cpu size={14} className="fb-icon" />
            <span>{tx(language, "IA autônoma ativa", "Autonomous AI active")}</span>
          </div>
          <div className="floating-badge fb-3">
            <Sparkles size={14} className="fb-icon" />
            <span>{tx(language, "Post pronto em 4s", "Post ready in 4s")}</span>
          </div>

          <div className="dashboard-preview-mockup">
            <div className="mockup-window-header">
              <div className="window-dots">
                <span className="dot dot-red"></span>
                <span className="dot dot-yellow"></span>
                <span className="dot dot-green"></span>
              </div>
              <div className="window-tab-active">
                <span>{tx(language, "Autonomy AI - Painel de controle", "Autonomy AI - Dashboard")}</span>
              </div>
            </div>
            
            <div className="mockup-workspace">
              {/* Sidebar do Mockup */}
              <div className="mockup-sidebar">
                <div className="sidebar-group">
                  <label className="mockup-label">{tx(language, "Nicho de atuação", "Business niche")}</label>
                  <div className="mockup-input">{tx(language, "Clínica de estética", "Aesthetic clinic")}</div>
                </div>
                <div className="sidebar-group">
                  <label className="mockup-label">{tx(language, "Tema do post", "Post topic")}</label>
                  <div className="mockup-input">{tx(language, "Tratamentos faciais naturais", "Natural facial treatments")}</div>
                </div>
                <div className="sidebar-group">
                  <label className="mockup-label">{tx(language, "Formato do post", "Post format")}</label>
                  <div className="mockup-input-select">{tx(language, "Imagem única", "Single image")}</div>
                </div>
                <button className="mockup-generate-btn" type="button" disabled>
                  {tx(language, "Gerar post", "Generate post")}
                </button>
              </div>
              
              {/* Output do Mockup */}
              <div className="mockup-output-area">
                <div className="mockup-output-header">
                  <span>{tx(language, "Visualização de saída", "Output preview")}</span>
                  <span className="mockup-status-badge">{tx(language, "Pronto", "Ready")}</span>
                </div>
                <div className="mockup-post-card">
                  <div className="post-visual-box">
                    <div className="visual-graphic">
                      <span>{tx(language, "Pele natural e iluminada", "Natural glowing skin")}</span>
                    </div>
                  </div>
                  <div className="post-copy-box">
                    <div className="post-user-row">
                      <div className="post-avatar-story-ring mini">
                        <div className="post-avatar mini"></div>
                      </div>
                      <strong className="post-card-username">clinica_renova</strong>
                    </div>
                    <strong>{tx(language, "Legenda sugerida", "Suggested caption")}</strong>
                    <p>
                      {tx(
                        language,
                        "O segredo de um cuidado facial com excelentes resultados é manter a harmonia natural da sua pele.",
                        "The secret to great facial care is keeping your skin's natural harmony."
                      )}
                    </p>
                    <span className="post-tags">#estetica #pelelinda #bemestar</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Prova Social: Logo Cloud */}
        <div className="logo-cloud-section">
          <p className="logo-cloud-title">
            {tx(language, "UTILIZADO POR MAIS DE 5.000 CREATORS E MARCAS DE SUCESSO", "USED BY MORE THAN 5,000 CREATORS AND GROWING BRANDS")}
          </p>
          <div className="logo-grid">
            <span className="logo-item">APEX INC</span>
            <span className="logo-item">VERTEX</span>
            <span className="logo-item">PULSE IA</span>
            <span className="logo-item">NOVA DIGITAL</span>
            <span className="logo-item">CORE HUB</span>
          </div>
        </div>
      </section>

      {/* Secao 2: funcionalidades */}
      <section className="features-section">
        
        {/* Bloco 1 */}
        <div className="feature-row">
          <div className="feature-text">
            <span className="feature-badge">{tx(language, "Geração de imagem", "Image generation")}</span>
            <h2>{tx(language, "Criação inteligente de imagens de alto impacto.", "Smart creation of high-impact visuals.")}</h2>
            <p>
              {tx(
                language,
                "Nossa inteligência artificial cria imagens profissionais adaptadas para o seu nicho, sem depender de ferramentas complexas.",
                "Our AI creates professional visuals tailored to your niche, without relying on complex design tools."
              )}
            </p>
          </div>
          <div className="feature-visual">
            <div className="phone-mockup">
              <div className="phone-screen">
                <div className="phone-header">
                  <div className="post-avatar-story-ring medium">
                    <div className="phone-avatar"></div>
                  </div>
                  <div className="phone-user-info">
                    <span className="phone-username">{tx(language, "seu_perfil", "your_profile")}</span>
                    <span className="phone-location">{tx(language, "Patrocinado", "Sponsored")}</span>
                  </div>
                </div>
                <div className="phone-content-image">
                  <div className="phone-content-overlay">
                    <span>{tx(language, "Design automático com IA", "Automatic AI design")}</span>
                  </div>
                </div>
                <div className="phone-actions-bar">
                  <span className="action-icon">Like</span>
                  <span className="action-icon">Comment</span>
                  <span className="action-icon">Share</span>
                </div>
                <div className="phone-caption">
                  <strong>{tx(language, "seu_perfil", "your_profile")}</strong> {tx(language, "Design premium criado em segundos pela IA.", "Premium design created by AI in seconds.")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 2 */}
        <div className="feature-row reverse">
          <div className="feature-visual">
            <div className="calendar-mockup">
              <div className="calendar-header">
                <span>{tx(language, "Calendário editorial", "Editorial calendar")}</span>
                <span className="calendar-month">{tx(language, "Junho 2026", "June 2026")}</span>
              </div>
              <div className="calendar-grid">
                <div className="calendar-day">
                  <span className="day-number">15</span>
                  <div className="calendar-event published">
                    <span>{tx(language, "Post carrossel", "Carousel post")}</span>
                    <span className="time">12:00</span>
                  </div>
                </div>
                <div className="calendar-day">
                  <span className="day-number">16</span>
                  <div className="calendar-event scheduled">
                    <span>{tx(language, "Imagem única", "Single image")}</span>
                    <span className="time">18:30</span>
                  </div>
                </div>
                <div className="calendar-day">
                  <span className="day-number">17</span>
                  <div className="calendar-event scheduled active">
                    <span>Post IA</span>
                    <span className="time">09:15</span>
                  </div>
                </div>
                <div className="calendar-day">
                  <span className="day-number">18</span>
                  <div className="calendar-event-empty"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="feature-text">
            <span className="feature-badge">{tx(language, "Agendamento inteligente", "Smart scheduling")}</span>
            <h2>{tx(language, "Seu feed planejado e organizado.", "Your feed, planned and organized.")}</h2>
            <p>
              {tx(
                language,
                "Visualize seus posts agendados em um calendário intuitivo e mantenha seu Instagram ativo com consistência.",
                "View scheduled posts in an intuitive calendar and keep your Instagram active consistently."
              )}
            </p>
          </div>
        </div>

        {/* Bloco 3 */}
        <div className="feature-row">
          <div className="feature-text">
            <span className="feature-badge">{tx(language, "Copywriting convincente", "Conversion copywriting")}</span>
            <h2>{tx(language, "Legendas que vendem de verdade.", "Captions built to convert.")}</h2>
            <p>
              {tx(
                language,
                "A IA escreve legendas persuasivas com chamadas para ação e hashtags relevantes para o seu perfil.",
                "AI writes persuasive captions with clear calls to action and relevant hashtags for your profile."
              )}
            </p>
          </div>
          <div className="feature-visual">
            <div className="caption-mockup">
              <div className="caption-header">
                <span>Copywriter IA</span>
                <span className="badge">{tx(language, "Conversão máxima", "High conversion")}</span>
              </div>
              <div className="caption-body">
                <p className="typing-text">{tx(language, "Quer parar de perder horas criando posts?", "Want to stop losing hours creating posts?")}</p>
                <p>{tx(language, "Com o Autonomy, seu Instagram ganha conteúdo profissional com muito menos trabalho.", "With Autonomy, your Instagram gets professional content with far less manual work.")}</p>
                <p className="cta-highlight">{tx(language, "Clique no link da bio e comece hoje mesmo.", "Click the link in bio and start today.")}</p>
                <p className="hashtags">#marketingdigital #ia #socialmedia #autonomiahub #produtividade</p>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* Secao 4: planos */}
      <section className="plans-section" id="planos">
        <div className="section-heading text-center">
          <h2>{tx(language, "Escolha o plano ideal para o seu momento", "Choose the right plan for your stage")}</h2>
          <p className="subheading-text">{tx(language, "Comece pequeno. Escale quando a demanda crescer.", "Start small. Scale as demand grows.")}</p>
        </div>
        <div className="pricing-grid">
          {plans.map((plan) => (
            <article className={plan.featured ? "pricing-card featured" : "pricing-card"} key={plan.id}>
              {plan.featured && <div className="popular-badge">{tx(language, "Mais popular", "Most popular")}</div>}
              <div className="card-top">
                <h3>{plan.name}</h3>
                <p className="plan-desc">{translatePlanText(plan.description, language)}</p>
              </div>
              <div className="card-price">
                <strong>{plan.price}</strong>
                <span className="period">{tx(language, "/mês", "/month")}</span>
              </div>
              <div className="plan-meta">
                <span>{translatePlanText(plan.credits, language)}</span>
                <span>{translatePlanText(plan.instagramAccounts, language)}</span>
              </div>
              <ul className="plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={18} className="check-icon" />
                    <span>{translatePlanText(feature, language)}</span>
                  </li>
                ))}
              </ul>
              <Link 
                className="plan-button" 
                href={`/cadastro?plan=${plan.id}${email ? `&email=${encodeURIComponent(email)}` : ""}${language === "en" ? "&lang=en" : ""}`}
              >
                {tx(language, `Escolher ${plan.name}`, `Choose ${plan.name}`)}
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Secao 3: FAQ */}
      <section className="faq-section">
        <h2>{tx(language, "Perguntas frequentes", "Frequently asked questions")}</h2>
        <p className="faq-subtitle font-inter">{tx(language, "Tire suas dúvidas antes de começar a escalar seu Instagram.", "Get answers before scaling your Instagram workflow.")}</p>
        <div className="faq-accordion">
          {localizedFaqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div className="faq-item" key={index}>
                <button className="faq-question" onClick={() => toggleFaq(index)}>
                  <span>{faq.question}</span>
                  <div className={`faq-icon ${isOpen ? "rotate" : ""}`}>
                    {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                  </div>
                </button>
                <div className={`faq-answer-container ${isOpen ? "open" : ""}`}>
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <form className="hero-cta-form bottom-cta-form" onSubmit={handleStart}>
          <h3>{tx(language, "Pronto para transformar seu Instagram?", "Ready to transform your Instagram?")}</h3>
          <div className="cta-form-group">
            <input 
              type="email" 
              placeholder={tx(language, "Insira seu endereço de email", "Enter your email address")}
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit">
              {tx(language, "Começar agora", "Start now")}
              <ChevronRight size={20} />
            </button>
          </div>
        </form>
      </section>

      {/* Rodape */}
      <footer className="marketing-footer">
        <p>
          &copy; {new Date().getFullYear()} Autonomy Hub.{" "}
          {tx(language, "Todos os direitos reservados.", "All rights reserved.")}
        </p>
      </footer>
    </main>
  );
}

function LanguageCards({
  language,
  onChange
}: {
  language: Language;
  onChange: (language: Language) => void;
}) {
  return (
    <div className="language-cards" aria-label="Idioma">
      <button
        className={language === "pt" ? "active" : ""}
        type="button"
        onClick={() => onChange("pt")}
      >
        PT
      </button>
      <button
        className={language === "en" ? "active" : ""}
        type="button"
        onClick={() => onChange("en")}
      >
        EN
      </button>
    </div>
  );
}
