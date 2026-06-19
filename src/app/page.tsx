"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, FormEvent } from "react";
import { ChevronRight, Check, Plus, Minus, CalendarClock, Send } from "lucide-react";
import { plans } from "@/lib/plans";
import logoImg from "@/images/logo_autonomy.png";
import postImg from "@/images/post.png";
import nutriImg from "@/images/nutrição.jpg";
import techImg from "@/images/tech.jpg";
import financeImg from "@/images/finance.jpg";

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

  const [generationState, setGenerationState] = useState("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (generationState !== "idle") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setGenerationState("generating");
        }
      },
      { threshold: 0.15 }
    );

    const el = document.getElementById("generated-posts-section");
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [generationState]);

  useEffect(() => {
    if (generationState !== "generating") return;

    const startTime = Date.now();
    const duration = 2500; // 2.5 seconds

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(pct);

      if (pct < 100) {
        requestAnimationFrame(updateProgress);
      } else {
        setTimeout(() => {
          setGenerationState("completed");
        }, 300);
      }
    };

    requestAnimationFrame(updateProgress);
  }, [generationState]);

  const demoPosts = [
    {
      id: 1,
      titlePt: "Nutrição",
      titleEn: "Nutrition",
      themePt: "Alimentação Saudável",
      themeEn: "Healthy Eating",
      image: nutriImg,
      captionPt: "Mudar seus hábitos alimentares não precisa ser um sacrifício. Pequenas substituições diárias geram grandes resultados a longo prazo. Quer aprender como estruturar sua rotina de alimentação de forma simples e nutritiva? Comece hoje adicionando mais alimentos naturais e vegetais no seu prato!",
      captionEn: "Changing your eating habits doesn't have to be a sacrifice. Small daily replacements lead to great long-term results. Want to learn how to structure your eating routine simply and nutritively? Start today by adding more whole foods to your plate!",
      hashtags: ["saude", "nutricao", "bemestar", "foco", "comidadeverdade"]
    },
    {
      id: 2,
      titlePt: "Tecnologia",
      titleEn: "Technology",
      themePt: "Inteligência Artificial",
      themeEn: "Artificial Intelligence",
      image: techImg,
      captionPt: "A inteligência artificial está transformando a forma como criamos e gerenciamos conteúdo. Aqueles que adotam essas ferramentas hoje saem na frente no mercado digital. Qual automação você já utiliza no seu dia a dia profissional?",
      captionEn: "Artificial intelligence is transforming how we create and manage content. Those who adopt these tools today stay ahead in the digital market. What automation do you already use in your professional day-to-day?",
      hashtags: ["tecnologia", "ia", "autonomiacreativa", "marketingdigital", "inovacao"]
    },
    {
      id: 3,
      titlePt: "Finanças",
      titleEn: "Finance",
      themePt: "Planejamento Financeiro",
      themeEn: "Financial Planning",
      image: financeImg,
      captionPt: "Organizar suas finanças pessoais é o primeiro passo para conquistar sua liberdade e realizar seus sonhos. Crie o hábito de registrar seus ganhos e gastos, monte uma reserva de emergência e comece a investir no seu futuro hoje mesmo!",
      captionEn: "Organizing your personal finances is the first step to achieving your freedom and making your dreams come true. Build the habit of tracking income and expenses, set up an emergency fund, and start investing in your future today!",
      hashtags: ["financas", "investimentos", "liberdadefinanceira", "dinheiro", "planejamento"]
    }
  ];

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
        <div className="hero-tech-grid" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="hero-content">
          <h1>
            {language === "pt" ? (
              <>
                Enquanto a <span className="hero-brand-highlight">Autonomy</span> gera e automatiza seu conteúdo, <span className="hero-title-highlight">você foca no seu negócio!</span>
              </>
            ) : (
              <>
                While <span className="hero-brand-highlight">Autonomy</span> generates and automates your content, <span className="hero-title-highlight">you focus on your business!</span>
              </>
            )}
          </h1>
          <h2>
            {tx(
              language,
              "A plataforma de Inteligência Artificial que gera valor pra sua empresa!",
              "The Artificial Intelligence platform that generates value for your business!"
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
          </form>
        </div>

      {/* Visual Principal: Dashboard SaaS Mockup com Badges Flutuantes */}
      <div className="dashboard-preview-container">
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
                  <div className="mockup-input">{tx(language, "Tecnologia", "Technology")}</div>
                </div>
                <div className="sidebar-group">
                  <label className="mockup-label">{tx(language, "Tema do post", "Post topic")}</label>
                  <div className="mockup-input">{tx(language, "Melhor app de automação do Instagram", "Best Instagram automation app")}</div>
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
                  <span>{tx(language, "Post gerado", "Generated post")}</span>
                  <div className="mockup-actions">
                    <div className="mockup-btn">
                      <CalendarClock size={13} />
                      {tx(language, "Agendar", "Schedule")}
                    </div>
                    <div className="mockup-btn now">
                      <Send size={13} />
                      {tx(language, "Postar agora", "Publish now")}
                    </div>
                  </div>
                </div>
                <div className="mockup-post-card">
                  <div className="post-visual-box">
                    <Image
                      src={postImg}
                      alt={tx(language, "Post gerado pela Autonomy AI", "Post generated by Autonomy AI")}
                      className="mockup-generated-image"
                      fill
                      sizes="150px"
                    />
                  </div>
                  <div className="post-copy-box">
                    <div className="post-user-row">
                      <div className="post-avatar-logo">
                        <Image
                          src={logoImg}
                          alt="Autonomy AI"
                          height={14}
                          className="logo-img"
                        />
                      </div>
                      <strong className="post-card-username">@useautonomy.ai</strong>
                      <span className="automation-chip">{tx(language, "Automação ativa", "Automation active")}</span>
                    </div>
                    <strong>{tx(language, "Legenda sugerida", "Suggested caption")}</strong>
                    <p>
                      {tx(
                        language,
                        "Automatize sua presença no Instagram com posts criados por IA, organização de conteúdo e publicação em poucos cliques.",
                        "Automate your Instagram presence with AI-generated posts, organized content, and publishing in just a few clicks."
                      )}
                    </p>
                    <span className="post-tags">#automacao #instagramai #useautonomy</span>
                  </div>
                </div>
                <HeroAutomationSteps language={language} />
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
            {/* Secao 2: simulador de posts gerados */}
      <section className="features-section" id="generated-posts-section">
        {generationState !== "completed" ? (
          <div className="simulator-loading-container">
            <div className="simulator-logo-pulse">
              <Image src={logoImg} alt="Autonomy logo" width={260} height={58} className="logo-img" />
            </div>
            <div className="simulator-progress-wrapper">
              <div className="simulator-progress-circle">
                <svg viewBox="0 0 100 100">
                  <circle className="circle-bg" cx="50" cy="50" r="40" />
                  <circle 
                    className="circle-progress" 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    strokeDasharray="251.2" 
                    strokeDashoffset={251.2 - (251.2 * progress) / 100}
                  />
                </svg>
                <div className="progress-percentage">{progress}%</div>
              </div>
              <p className="simulator-loading-text">
                {tx(language, "Gerando posts...", "Generating posts...")}
              </p>
            </div>
          </div>
        ) : (
          <div className="simulator-results-container fade-in">
            <div className="section-heading text-center">
              <h2>{tx(language, "Confira os posts gerados", "Check out the generated posts")}</h2>
              <p className="subheading-text">
                {tx(
                  language,
                  "Nossa inteligência artificial gerou e formatou esses posts automaticamente para o seu perfil.",
                  "Our AI automatically generated and formatted these posts for your profile."
                )}
              </p>
            </div>
            <div className="simulator-posts-grid">
              {demoPosts.map((post) => (
                <article className="post-card compact simulator-card" key={post.id}>
                  <div className="card-header-centered">
                    <h4 className="card-title">{tx(language, post.titlePt, post.titleEn)}</h4>
                    <p className="card-subtitle">{tx(language, post.themePt, post.themeEn)}</p>
                  </div>

                  <div className="generated-media">
                    <div className="mock-cover">
                      <Image 
                        src={post.image} 
                        alt={tx(language, post.titlePt, post.titleEn)} 
                        width={400} 
                        height={250} 
                        style={{ width: "100%", height: "auto", display: "block" }}
                        sizes="100vw"
                      />
                    </div>
                  </div>

                  <div className="card-section">
                    <h3>{tx(language, "Descrição", "Caption")}</h3>
                    <p className="caption-text">{tx(language, post.captionPt, post.captionEn)}</p>
                  </div>

                  <div className="hashtags">
                    {post.hashtags.map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
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

function HeroAutomationSteps({ language }: { language: Language }) {
  return (
    <div className="hero-automation-container">
      <div className="hero-automation-steps" aria-label={tx(language, "Fluxo de automação", "Automation flow")}>
        <div className="automation-step step-1">
          <span>{tx(language, "Autonomy", "Autonomy")}</span>
          <strong>{tx(language, "Post gerado", "Post generated")}</strong>
        </div>
        <div className="automation-step step-2">
          <span>{tx(language, "Instagram", "Instagram")}</span>
          <strong>{tx(language, "Postagem automática", "Automatic posting")}</strong>
        </div>
        <div className="automation-step step-3">
          <span>{tx(language, "Produtividade", "Productivity")}</span>
          <strong>{tx(language, "Foco no seu negócio", "Focus on your business")}</strong>
        </div>
      </div>
      <div className="automation-progress-container">
        <div className="automation-progress-bar" />
        <div className="progress-marker marker-1" />
        <div className="progress-marker marker-2" />
      </div>
    </div>
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
