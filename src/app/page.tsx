"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import { ChevronRight, Check, Plus, Minus, Sparkles, TrendingUp, Cpu } from "lucide-react";
import { plans } from "@/lib/plans";
import logoImg from "@/images/logo_autonomy.png";

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "Como funciona a criação de posts com IA?",
      answer: "Você fornece um briefing rápido ou tema da sua área de atuação. Nossa inteligência artificial cria imagens atraentes de nível profissional, redige a legenda de vendas focada em conversão e seleciona as hashtags mais relevantes para o seu nicho."
    },
    {
      question: "Posso cancelar minha assinatura a qualquer momento?",
      answer: "Com certeza. Não há contratos de fidelidade ou termos de permanência mínima. Você pode gerenciar ou cancelar sua assinatura diretamente no painel do usuário com um único clique."
    },
    {
      question: "Quantas contas do Instagram posso gerenciar?",
      answer: "O limite depende do plano escolhido: o plano Starter dá suporte a 1 conta, o Pro gerencia até 3 contas, e o plano Agency permite conectar e automatizar até 10 contas simultaneamente."
    },
    {
      question: "Os criativos e textos gerados são exclusivos?",
      answer: "Sim. Cada imagem, copy e conjunto de hashtags são gerados sob demanda com base no seu nicho e briefing específico, garantindo conteúdos 100% originais para a sua marca."
    },
    {
      question: "Preciso de conhecimentos de design para usar?",
      answer: "Nenhum. O Autonomy foi feito justamente para que você não precise gastar horas no Canva ou contratar agências. Nossa IA cuida de toda a complexidade técnica de design e copy."
    }
  ];

  function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email) return;
    router.push(`/cadastro?email=${encodeURIComponent(email)}`);
  }

  function toggleFaq(index: number) {
    setActiveFaq(activeFaq === index ? null : index);
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
          <Link className="nav-signin-btn" href="/login">Entrar</Link>
          <Link className="nav-signup-btn" href="/cadastro">Começar agora</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <span className="hero-badge">
            <Sparkles size={14} className="badge-icon" />
            Nova Inteligência Artificial de Imagem Integrada
          </span>
          <h1>Seu feed do Instagram criado por IA. Enquanto você foca no seu negócio.</h1>
          <h2>Crie, agende e poste conteúdos profissionais em segundos. Cancele quando quiser.</h2>
          
          <form className="hero-cta-form" onSubmit={handleStart}>
            <div className="cta-form-group">
              <input 
                type="email" 
                placeholder="Insira seu endereço de e-mail" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit">
                Começar Agora
                <ChevronRight size={20} />
              </button>
            </div>
            <p className="cta-disclaimer">Experimente hoje mesmo. Sem compromisso de fidelidade.</p>
          </form>
        </div>

        {/* Visual Principal: Dashboard SaaS Mockup com Badges Flutuantes */}
        <div className="dashboard-preview-container">
          {/* Badges Flutuantes de Alta Conversão */}
          <div className="floating-badge fb-1">
            <TrendingUp size={14} className="fb-icon" />
            <span>+214% Alcance Orgânico</span>
          </div>
          <div className="floating-badge fb-2">
            <Cpu size={14} className="fb-icon" />
            <span>IA Autônoma Ativa</span>
          </div>
          <div className="floating-badge fb-3">
            <Sparkles size={14} className="fb-icon" />
            <span>Post Pronto em 4s</span>
          </div>

          <div className="dashboard-preview-mockup">
            <div className="mockup-window-header">
              <div className="window-dots">
                <span className="dot dot-red"></span>
                <span className="dot dot-yellow"></span>
                <span className="dot dot-green"></span>
              </div>
              <div className="window-tab-active">
                <span>Autonomy AI - Painel de Controle</span>
              </div>
            </div>
            
            <div className="mockup-workspace">
              {/* Sidebar do Mockup */}
              <div className="mockup-sidebar">
                <div className="sidebar-group">
                  <label className="mockup-label">Nicho de atuação</label>
                  <div className="mockup-input">Clínica de Estética</div>
                </div>
                <div className="sidebar-group">
                  <label className="mockup-label">Tema do post</label>
                  <div className="mockup-input">Tratamentos faciais naturais</div>
                </div>
                <div className="sidebar-group">
                  <label className="mockup-label">Formato do post</label>
                  <div className="mockup-input-select">Imagem única</div>
                </div>
                <button className="mockup-generate-btn" type="button" disabled>
                  Gerar Post ⚡
                </button>
              </div>
              
              {/* Output do Mockup */}
              <div className="mockup-output-area">
                <div className="mockup-output-header">
                  <span>Visualização de Saída</span>
                  <span className="mockup-status-badge">Pronto</span>
                </div>
                <div className="mockup-post-card">
                  <div className="post-visual-box">
                    <div className="visual-graphic">
                      <span>Pele Natural & Iluminada</span>
                    </div>
                  </div>
                  <div className="post-copy-box">
                    <div className="post-user-row">
                      <div className="post-avatar-story-ring mini">
                        <div className="post-avatar mini"></div>
                      </div>
                      <strong className="post-card-username">clinica_renova</strong>
                    </div>
                    <strong>Legenda Sugerida</strong>
                    <p>O segredo de um cuidado facial com excelentes resultados é manter a harmonia natural da sua pele... ✨</p>
                    <span className="post-tags">#estetica #pelelinda #bemestar</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Prova Social: Logo Cloud */}
        <div className="logo-cloud-section">
          <p className="logo-cloud-title">UTILIZADO POR MAIS DE 5.000 CREATORS E MARCAS DE SUCESSO</p>
          <div className="logo-grid">
            <span className="logo-item">APEX INC</span>
            <span className="logo-item">VERTEX</span>
            <span className="logo-item">PULSE IA</span>
            <span className="logo-item">NOVA DIGITAL</span>
            <span className="logo-item">CORE HUB</span>
          </div>
        </div>
      </section>

      {/* Seção 2: Funcionalidades Estilo Clean Tech */}
      <section className="features-section">
        
        {/* Bloco 1 */}
        <div className="feature-row">
          <div className="feature-text">
            <span className="feature-badge">Geração de Imagem</span>
            <h2>Criação inteligente de imagens de alto impacto.</h2>
            <p>
              Nossa inteligência artificial cria imagens altamente profissionais e atraentes adaptadas para o seu nicho. Diga adeus ao Canva e contratações caras.
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
                    <span className="phone-username">seu_perfil</span>
                    <span className="phone-location">Patrocinado</span>
                  </div>
                </div>
                <div className="phone-content-image">
                  <div className="phone-content-overlay">
                    <span>Design Automático IA 🚀</span>
                  </div>
                </div>
                <div className="phone-actions-bar">
                  <span className="action-icon">❤️</span>
                  <span className="action-icon">💬</span>
                  <span className="action-icon">✈️</span>
                </div>
                <div className="phone-caption">
                  <strong>seu_perfil</strong> Design premium criado em segundos pela IA! Escalar sua marca ficou incrivelmente simples.
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
                <span>Calendário Editorial</span>
                <span className="calendar-month">Junho 2026</span>
              </div>
              <div className="calendar-grid">
                <div className="calendar-day">
                  <span className="day-number">15</span>
                  <div className="calendar-event published">
                    <span>Post Carrossel</span>
                    <span className="time">12:00</span>
                  </div>
                </div>
                <div className="calendar-day">
                  <span className="day-number">16</span>
                  <div className="calendar-event scheduled">
                    <span>Imagem única</span>
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
            <span className="feature-badge">Agendamento Inteligente</span>
            <h2>Seu feed planejado e organizado.</h2>
            <p>
              Visualize todos os seus posts agendados em um calendário intuitivo. Nossa IA prepara tudo para que seu feed se mantenha ativo sem esforço.
            </p>
          </div>
        </div>

        {/* Bloco 3 */}
        <div className="feature-row">
          <div className="feature-text">
            <span className="feature-badge">Copywriting Convincente</span>
            <h2>Legendas que vendem de verdade.</h2>
            <p>
              A IA escreve copy persuasiva com chamadas para ação (CTAs) poderosas e seleciona as hashtags que trarão maior alcance orgânico para o seu perfil.
            </p>
          </div>
          <div className="feature-visual">
            <div className="caption-mockup">
              <div className="caption-header">
                <span>Copywriter IA</span>
                <span className="badge">Conversão Máxima</span>
              </div>
              <div className="caption-body">
                <p className="typing-text">🚀 Quer parar de perder horas criando posts?</p>
                <p>Com o Autonomy, seu Instagram é gerenciado de ponta a ponta de forma 100% autônoma.</p>
                <p className="cta-highlight">👇 Clique no link da bio e comece hoje mesmo!</p>
                <p className="hashtags">#marketingdigital #ia #socialmedia #autonomiahub #produtividade</p>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* Seção 4: Planos */}
      <section className="plans-section" id="planos">
        <div className="section-heading text-center">
          <h2>Escolha o plano ideal para o seu momento</h2>
          <p className="subheading-text">Comece pequeno. Escale quando a demanda crescer.</p>
        </div>
        <div className="pricing-grid">
          {plans.map((plan) => (
            <article className={plan.featured ? "pricing-card featured" : "pricing-card"} key={plan.id}>
              {plan.featured && <div className="popular-badge">Mais Popular</div>}
              <div className="card-top">
                <h3>{plan.name}</h3>
                <p className="plan-desc">{plan.description}</p>
              </div>
              <div className="card-price">
                <strong>{plan.price}</strong>
                <span className="period">/mês</span>
              </div>
              <div className="plan-meta">
                <span>{plan.credits}</span>
                <span>{plan.instagramAccounts}</span>
              </div>
              <ul className="plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={18} className="check-icon" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link 
                className="plan-button" 
                href={`/cadastro?plan=${plan.id}${email ? `&email=${encodeURIComponent(email)}` : ""}`}
              >
                Escolher {plan.name}
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Seção 3: FAQ Acordeão */}
      <section className="faq-section">
        <h2>Perguntas Frequentes</h2>
        <p className="faq-subtitle font-inter">Tire suas dúvidas antes de começar a escalar seu Instagram.</p>
        <div className="faq-accordion">
          {faqs.map((faq, index) => {
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
          <h3>Pronto para transformar seu Instagram?</h3>
          <div className="cta-form-group">
            <input 
              type="email" 
              placeholder="Insira seu endereço de e-mail" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit">
              Começar Agora
              <ChevronRight size={20} />
            </button>
          </div>
        </form>
      </section>

      {/* Rodapé */}
      <footer className="marketing-footer">
        <p>&copy; {new Date().getFullYear()} Autonomy Hub. Todos os direitos reservados. Design Clean Tech.</p>
      </footer>
    </main>
  );
}

