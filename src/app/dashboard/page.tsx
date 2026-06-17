"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ImagePlus,
  Library,
  LogOut,
  Plug,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  User
} from "lucide-react";
import clsx from "clsx";
import Image from "next/image";
import logoImg from "@/images/logo_autonomy.png";
import type { GeneratedPost } from "@/lib/post-schema";
import { getPlan, plans } from "@/lib/plans";
import { getProfile } from "@/lib/profile-client";
import {
  deletePost,
  getSavedPosts,
  savePost,
  type SavedPost
} from "@/lib/saved-posts";
import {
  cancelScheduledPost,
  disconnectSocialAccount,
  getScheduledPosts,
  getSocialAccounts,
  schedulePost,
  startMetaConnection,
  type ScheduledPost,
  type SocialAccount
} from "@/lib/social-client";
import { getSupabaseClient } from "@/lib/supabase-client";
import { getUsageSummary, type UsageSummary } from "@/lib/usage-client";

type Mode = "criativo" | "contextual";
type VisualFormat = "imagem_unica" | "carrossel";
type ActiveView = "gerar" | "biblioteca" | "agenda" | "conexoes" | "perfil" | "uso";
type DashboardProfile = {
  email: string;
  emailConfirmed: boolean;
  name: string;
  document: string;
  phone: string;
  plan: string;
};

const examples = {
  creative: {
    niche: "Clinica de estetica",
    theme: "Tratamentos faciais que parecem naturais",
    imageDetail:
      "Mulher de 35 anos em uma clinica moderna, pele natural e iluminada, segurando um espelho pequeno, com fundo limpo em tons claros e sensacao premium."
  },
  contextual: {
    niche: "Salao de beleza",
    theme: "Cores de cabelo tendencia 2026",
    context: "Como escolher uma cor que valoriza o tom de pele",
    image:
      "Foto de uma mulher de perfil mostrando cabelo com mechas loiras platinadas, fundo claro e iluminacao de estudio."
  }
};

export default function Home() {
  const [mode, setMode] = useState<Mode>("criativo");
  const [activeView, setActiveView] = useState<ActiveView>("gerar");
  const [visualFormat, setVisualFormat] = useState<VisualFormat>("imagem_unica");
  const [singleImageDetail, setSingleImageDetail] = useState("");
  const [carouselCount, setCarouselCount] = useState(3);
  const [carouselDetails, setCarouselDetails] = useState(["", "", ""]);
  const [niche, setNiche] = useState("");
  const [theme, setTheme] = useState("");
  const [context, setContext] = useState("");
  const [imageAnalysis, setImageAnalysis] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedPost | null>(null);
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [selectedSocialAccountId, setSelectedSocialAccountId] = useState("");
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [profile, setProfile] = useState<DashboardProfile>({
    email: "",
    emailConfirmed: false,
    name: "Usuario Autonomy",
    document: "",
    phone: "",
    plan: "pro"
  });
  const [error, setError] = useState<string | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setProfile({
        email: user.email || "",
        emailConfirmed: Boolean(user.email_confirmed_at),
        name: String(user.user_metadata.full_name || "Usuario Autonomy"),
        document: String(user.user_metadata.document || ""),
        phone: String(user.user_metadata.phone || ""),
        plan: String(user.user_metadata.plan || "pro")
      });
    });

    getProfile()
      .then((databaseProfile) => {
        setProfile((current) => ({
          email: databaseProfile.email || current.email,
          emailConfirmed: current.emailConfirmed,
          name: databaseProfile.full_name || current.name,
          document: databaseProfile.document || current.document,
          phone: databaseProfile.phone || current.phone,
          plan: databaseProfile.plan || current.plan
        }));
      })
      .catch(() => undefined);

    getSavedPosts()
      .then((posts) => {
        setSavedPosts(posts);
        setLibraryError(null);
      })
      .catch(() =>
        setLibraryError("Nao foi possivel carregar a biblioteca de posts.")
      );

    refreshUsageSummary().catch(() => undefined);
    refreshSocialData().catch(() => undefined);
  }, []);

  const activePlan = getPlan(profile.plan) || plans[1];
  const creditLimit = usageSummary?.creditsLimit || activePlan.creditLimit;
  const usedCredits = usageSummary?.usedCredits || 0;
  const remainingCredits =
    usageSummary?.remainingCredits || Math.max(creditLimit - usedCredits, 0);
  const usagePercent =
    usageSummary?.usagePercent ||
    Math.min(Math.round((usedCredits / creditLimit) * 100), 100);

  const payload = useMemo(() => {
    if (mode === "criativo") {
      if (visualFormat === "imagem_unica") {
        return {
          modo: "criativo",
          nicho: niche,
          tema: theme,
          formato_visual: visualFormat,
          detalhes_imagem: singleImageDetail
        };
      }

      return {
        modo: "criativo",
        nicho: niche,
        tema: theme,
        formato_visual: visualFormat,
        quantidade_imagens: carouselCount,
        detalhes_carrossel: carouselDetails.slice(0, carouselCount)
      };
    }

    return {
      modo: "contextual",
      nicho: niche,
      tema: theme,
      contexto: context,
      possui_imagem_propria: true,
      analise_da_imagem_do_usuario: imageAnalysis
    };
  }, [
    carouselCount,
    carouselDetails,
    context,
    imageAnalysis,
    mode,
    niche,
    singleImageDetail,
    theme,
    visualFormat
  ]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error("Sessao expirada. Entre novamente para gerar posts.");
      }

      const response = await fetch("/api/generate-post", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nao foi possivel gerar os posts.");
      }

      setResult(data);
      setActiveView("gerar");
      await refreshUsageSummary();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Erro inesperado ao gerar."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshUsageSummary() {
    const summary = await getUsageSummary();
    setUsageSummary(summary);
  }

  async function refreshSocialData() {
    const [accounts, schedules] = await Promise.all([
      getSocialAccounts(),
      getScheduledPosts()
    ]);

    setSocialAccounts(accounts);
    setScheduledPosts(schedules);
    setSelectedSocialAccountId((current) => current || accounts[0]?.id || "");
  }

  function fillExample() {
    if (mode === "criativo") {
      setNiche(examples.creative.niche);
      setTheme(examples.creative.theme);
      setVisualFormat("imagem_unica");
      setSingleImageDetail(examples.creative.imageDetail);
      return;
    }

    setNiche(examples.contextual.niche);
    setTheme(examples.contextual.theme);
    setContext(examples.contextual.context);
    setImageAnalysis(examples.contextual.image);
  }

  function onImageChange(file?: File) {
    if (!file) {
      setImagePreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(file);
  }

  function updateCarouselCount(nextCount: number) {
    setCarouselCount(nextCount);
    setCarouselDetails((current) =>
      Array.from({ length: nextCount }, (_, index) => current[index] || "")
    );
  }

  function updateCarouselDetail(index: number, value: string) {
    setCarouselDetails((current) =>
      Array.from({ length: carouselCount }, (_, detailIndex) =>
        detailIndex === index ? value : current[detailIndex] || ""
      )
    );
  }

  async function saveCurrentPost() {
    if (!result) {
      return;
    }

    const savedPost: SavedPost = {
      ...result,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };

    try {
      await savePost(savedPost);
      setSavedPosts([savedPost, ...savedPosts]);
      setActiveView("biblioteca");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Nao foi possivel salvar este post na biblioteca."
      );
    }
  }

  async function connectInstagram() {
    try {
      setScheduleError(null);
      const url = await startMetaConnection();
      window.location.href = url;
    } catch (caughtError) {
      setScheduleError(
        caughtError instanceof Error
          ? caughtError.message
          : "Nao foi possivel conectar Instagram."
      );
    }
  }

  async function scheduleCurrentPost() {
    if (!result) {
      return;
    }

    setScheduleError(null);
    setScheduleMessage(null);
    setIsScheduling(true);

    try {
      if (!selectedSocialAccountId) {
        throw new Error("Conecte e selecione uma conta do Instagram.");
      }

      if (!scheduleDateTime) {
        throw new Error("Escolha data e horario para publicar.");
      }

      await schedulePost({
        post: result,
        scheduledFor: new Date(scheduleDateTime).toISOString(),
        socialAccountId: selectedSocialAccountId
      });
      await refreshSocialData();
      setScheduleMessage("Post agendado com sucesso.");
      setActiveView("agenda");
    } catch (caughtError) {
      setScheduleError(
        caughtError instanceof Error
          ? caughtError.message
          : "Nao foi possivel agendar este post."
      );
    } finally {
      setIsScheduling(false);
    }
  }

  async function removeSocialAccount(id: string) {
    try {
      await disconnectSocialAccount(id);
      await refreshSocialData();
    } catch {
      setScheduleError("Nao foi possivel desconectar a conta.");
    }
  }

  async function cancelSchedule(id: string) {
    try {
      await cancelScheduledPost(id);
      await refreshSocialData();
    } catch {
      setScheduleError("Nao foi possivel cancelar o agendamento.");
    }
  }

  function discardCurrentPost() {
    setResult(null);
    setError(null);
  }

  async function deleteSavedPost(id: string) {
    try {
      await deletePost(id);
      setSavedPosts(savedPosts.filter((post) => post.id !== id));
    } catch {
      setError("Nao foi possivel remover este post da biblioteca.");
    }
  }

  async function signOut() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="brand-row">
          <Image 
            src={logoImg} 
            alt="Autonomy Logo" 
            height={32} 
            priority
            style={{ width: "auto", height: "32px", objectFit: "contain" }}
          />
        </div>

        <div className="profile-summary">
          <div className="profile-avatar">{getInitials(profile.name)}</div>
          <div>
            <strong>{profile.name}</strong>
            <span>{profile.email || "Conta conectada"}</span>
          </div>
        </div>

        <div className="sidebar-credits">
          <div>
            <span>Creditos</span>
            <strong>{remainingCredits}</strong>
          </div>
          <div className="usage-bar">
            <span style={{ width: `${usagePercent}%` }} />
          </div>
          <p>
            {usedCredits} de {creditLimit} usados ({usagePercent}%)
          </p>
        </div>

        <nav className="sidebar-nav" aria-label="Dashboard">
          <button
            className={clsx(activeView === "gerar" && "active")}
            type="button"
            onClick={() => setActiveView("gerar")}
          >
            <Sparkles size={18} />
            Gerar post
          </button>
          <button
            className={clsx(activeView === "biblioteca" && "active")}
            type="button"
            onClick={() => setActiveView("biblioteca")}
          >
            <Library size={18} />
            Meus posts
            <span>{savedPosts.length}</span>
          </button>
          <button
            className={clsx(activeView === "agenda" && "active")}
            type="button"
            onClick={() => setActiveView("agenda")}
          >
            <CalendarClock size={18} />
            Agendamentos
            <span>{scheduledPosts.length}</span>
          </button>
          <button
            className={clsx(activeView === "conexoes" && "active")}
            type="button"
            onClick={() => setActiveView("conexoes")}
          >
            <Plug size={18} />
            Conexoes
            <span>{socialAccounts.length}</span>
          </button>
          <button
            className={clsx(activeView === "uso" && "active")}
            type="button"
            onClick={() => setActiveView("uso")}
          >
            <BarChart3 size={18} />
            Uso e creditos
          </button>
          <button
            className={clsx(activeView === "perfil" && "active")}
            type="button"
            onClick={() => setActiveView("perfil")}
          >
            <User size={18} />
            Perfil
          </button>
        </nav>

        <button className="signout-button" type="button" onClick={signOut}>
          <LogOut size={18} />
          Sair
        </button>
      </aside>

      <section className="dashboard-main">
        {activeView === "gerar" && (
          <section className="workspace">
            <aside className="panel form-panel">
              <div className="form-header">
                <Image 
                  src={logoImg} 
                  alt="Autonomy Logo" 
                  height={24} 
                  style={{ width: "auto", height: "24px", objectFit: "contain", marginBottom: "4px" }}
                />
                <h1 className="form-title">Gerador de posts pronto para vender</h1>
              </div>

          <div className="mode-switch" aria-label="Modo de geracao">
            <button
              className={clsx(mode === "criativo" && "active")}
              type="button"
              onClick={() => setMode("criativo")}
            >
              <Sparkles size={17} />
              Criativo
            </button>
            <button
              className={clsx(mode === "contextual" && "active")}
              type="button"
              onClick={() => setMode("contextual")}
            >
              <ImagePlus size={17} />
              Contextual
            </button>
          </div>

          <form onSubmit={onSubmit} className="form-stack">
            <label>
              <span>Nicho</span>
              <input
                value={niche}
                onChange={(event) => setNiche(event.target.value)}
                placeholder="Ex: Nutricionista, imobiliaria, academia"
              />
            </label>

            <label>
              <span>Tema</span>
              <input
                value={theme}
                onChange={(event) => setTheme(event.target.value)}
                placeholder="Ex: Como atrair clientes no Instagram"
              />
            </label>

            {mode === "criativo" && (
              <>
                <div className="field-group">
                  <span>Formato visual</span>
                  <div className="choice-grid" aria-label="Formato visual">
                    <button
                      className={clsx(visualFormat === "imagem_unica" && "active")}
                      type="button"
                      onClick={() => setVisualFormat("imagem_unica")}
                    >
                      Imagem unica
                    </button>
                    <button
                      className={clsx(visualFormat === "carrossel" && "active")}
                      type="button"
                      onClick={() => setVisualFormat("carrossel")}
                    >
                      Carrossel
                    </button>
                  </div>
                </div>

                {visualFormat === "imagem_unica" ? (
                  <label>
                    <span>Detalhes da imagem</span>
                    <textarea
                      value={singleImageDetail}
                      onChange={(event) => setSingleImageDetail(event.target.value)}
                      placeholder="Descreva exatamente o que deve aparecer: pessoa, objeto, ambiente, cores, enquadramento e clima."
                      rows={4}
                    />
                  </label>
                ) : (
                  <div className="form-stack nested-stack">
                    <div className="field-group">
                      <span>Quantidade de imagens</span>
                      <div className="stepper-grid">
                        {[2, 3, 4].map((count) => (
                          <button
                            className={clsx(carouselCount === count && "active")}
                            type="button"
                            key={count}
                            onClick={() => updateCarouselCount(count)}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                      <p className="field-hint">
                        Para texto no slide, escreva a frase final entre aspas.
                      </p>
                    </div>

                    {Array.from({ length: carouselCount }, (_, index) => (
                      <label key={index}>
                        <span>Imagem {index + 1}</span>
                        <textarea
                          value={carouselDetails[index] || ""}
                          onChange={(event) =>
                            updateCarouselDetail(index, event.target.value)
                          }
                          placeholder={`Descreva exatamente a imagem ${index + 1}. Se quiser texto, escreva o texto final entre aspas.`}
                          rows={4}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}

            {mode === "contextual" && (
              <>
                <label>
                  <span>Contexto da campanha</span>
                  <textarea
                    value={context}
                    onChange={(event) => setContext(event.target.value)}
                    placeholder="Explique a promessa, oferta ou ponto que precisa aparecer no post."
                    rows={4}
                  />
                </label>

                <div className="upload-box">
                  <div className="upload-preview">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview da imagem enviada" />
                    ) : (
                      <UploadCloud size={28} />
                    )}
                  </div>
                  <label className="file-trigger">
                    <span>Enviar imagem</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => onImageChange(event.target.files?.[0])}
                    />
                  </label>
                </div>

                <label>
                  <span>Analise da imagem</span>
                  <textarea
                    value={imageAnalysis}
                    onChange={(event) => setImageAnalysis(event.target.value)}
                    placeholder="Descreva a imagem. Em producao, este campo pode ser preenchido automaticamente por visao."
                    rows={4}
                  />
                </label>
              </>
            )}

            {error && <p className="error-message">{error}</p>}

            <div className="button-row">
              <button className="secondary-button" type="button" onClick={fillExample}>
                Exemplo
              </button>
              <button className="primary-button" type="submit" disabled={isLoading}>
                <ArrowRight size={18} />
                Gerar posts completos
              </button>
            </div>
          </form>
            </aside>

            <section className="results-area">
          <div className="topbar">
            <div>
              <p className="eyebrow">Saida estruturada</p>
              <h2>Post completo pronto para o calendario</h2>
            </div>
              <div className="topbar-actions">
                {result && (
                  <div className="schedule-inline">
                    <select
                      aria-label="Conta do Instagram"
                      value={selectedSocialAccountId}
                      onChange={(event) =>
                        setSelectedSocialAccountId(event.target.value)
                      }
                    >
                      <option value="">Conta Instagram</option>
                      {socialAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          @{account.instagram_username || account.page_name}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label="Data e horario"
                      type="datetime-local"
                      value={scheduleDateTime}
                      onChange={(event) => setScheduleDateTime(event.target.value)}
                    />
                    <button
                      className="schedule-button"
                      type="button"
                      onClick={scheduleCurrentPost}
                      disabled={isScheduling || !result}
                    >
                      <Send size={16} />
                      Agendar
                    </button>
                  </div>
                )}
                <button
                  className="save-button"
                  type="button"
                  onClick={saveCurrentPost}
                  disabled={!result || isLoading}
                >
                  <Save size={16} />
                  Salvar post
                </button>
                <button
                  className="discard-button"
                  type="button"
                  onClick={discardCurrentPost}
                  disabled={!result || isLoading}
                >
                  <Trash2 size={16} />
                  Descartar
                </button>
              </div>
          </div>

          {scheduleError && <p className="error-message">{scheduleError}</p>}
          {scheduleMessage && <p className="success-message">{scheduleMessage}</p>}

          {isLoading ? (
            <LoadingPostState />
          ) : result ? (
            <div className="cards-grid single-card">
              <PostCard label="Post gerado" option={result.post} />
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <Sparkles size={30} />
              </div>
              <h3>Seu post completo aparece aqui.</h3>
              <p>
                Preencha o briefing e receba imagem, descricao, hashtags e
                direcao visual em uma unica geracao economica.
              </p>
            </div>
          )}
            </section>
          </section>
        )}

        {activeView === "biblioteca" && (
          <DashboardSection eyebrow="Biblioteca" title="Meus posts salvos">
            <SavedPostsLibrary
              error={libraryError}
              posts={savedPosts}
              onDelete={deleteSavedPost}
            />
          </DashboardSection>
        )}

        {activeView === "agenda" && (
          <DashboardSection eyebrow="Calendario" title="Posts agendados">
            <ScheduledPostsPanel
              posts={scheduledPosts}
              onCancel={cancelSchedule}
            />
          </DashboardSection>
        )}

        {activeView === "conexoes" && (
          <DashboardSection eyebrow="Canais" title="Facebook e Instagram">
            <SocialAccountsPanel
              accounts={socialAccounts}
              error={scheduleError}
              onConnect={connectInstagram}
              onDisconnect={removeSocialAccount}
            />
          </DashboardSection>
        )}

        {activeView === "uso" && (
          <UsagePanel
            creditLimit={creditLimit}
            remainingCredits={remainingCredits}
            savedPosts={savedPosts}
            usedCredits={usedCredits}
            usagePercent={usagePercent}
          />
        )}

        {activeView === "perfil" && (
          <ProfilePanel planName={activePlan.name} profile={profile} />
        )}
      </section>
    </main>
  );
}

function SavedPostsLibrary({
  error,
  onDelete,
  posts
}: {
  error: string | null;
  onDelete: (id: string) => void | Promise<void>;
  posts: SavedPost[];
}) {
  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <Sparkles size={30} />
        </div>
        <h3>Biblioteca indisponivel.</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <Sparkles size={30} />
        </div>
        <h3>Nenhum post salvo ainda.</h3>
        <p>Quando gostar de uma geracao, clique em salvar para guardar aqui.</p>
      </div>
    );
  }

  return (
    <div className="library-list">
      {posts.map((savedPost) => (
        <div className="library-item" key={savedPost.id}>
          <div className="library-item-header">
            <div>
              <p className="eyebrow">{savedPost.nicho}</p>
              <h3>{savedPost.post.headline_da_imagem}</h3>
            </div>
            <button type="button" onClick={() => onDelete(savedPost.id)}>
              <Trash2 size={16} />
              Remover
            </button>
          </div>
          <PostCard label="Post salvo" option={savedPost.post} />
        </div>
      ))}
    </div>
  );
}

function DashboardSection({
  children,
  eyebrow,
  title
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="dashboard-section">
      <div className="topbar">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function SocialAccountsPanel({
  accounts,
  error,
  onConnect,
  onDisconnect
}: {
  accounts: SocialAccount[];
  error: string | null;
  onConnect: () => void | Promise<void>;
  onDisconnect: (id: string) => void | Promise<void>;
}) {
  return (
    <div className="social-panel">
      <div className="integration-header">
        <div>
          <h3>Instagram profissional</h3>
          <p>
            Conecte uma conta Business ou Creator vinculada a uma Pagina do
            Facebook para publicar automaticamente.
          </p>
        </div>
        <button className="primary-button" type="button" onClick={onConnect}>
          <Plug size={18} />
          Conectar Instagram
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      {accounts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Plug size={30} />
          </div>
          <h3>Nenhuma conta conectada.</h3>
          <p>Depois de conectar, voce podera agendar posts direto do dashboard.</p>
        </div>
      ) : (
        <div className="account-list">
          {accounts.map((account) => (
            <div className="account-item" key={account.id}>
              <div className="profile-avatar">
                {getInitials(account.instagram_username || account.page_name)}
              </div>
              <div>
                <strong>@{account.instagram_username || "instagram"}</strong>
                <span>{account.page_name}</span>
              </div>
              <span className="status-pill">{account.status}</span>
              <button type="button" onClick={() => onDisconnect(account.id)}>
                Desconectar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduledPostsPanel({
  onCancel,
  posts
}: {
  onCancel: (id: string) => void | Promise<void>;
  posts: ScheduledPost[];
}) {
  if (posts.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <CalendarClock size={30} />
        </div>
        <h3>Nenhum post agendado.</h3>
        <p>Gere um post, escolha uma conta do Instagram e defina o horario.</p>
      </div>
    );
  }

  return (
    <div className="schedule-list">
      {posts.map((post) => (
        <div className="schedule-item" key={post.id}>
          <div>
            <p className="eyebrow">@{post.instagram_username || post.page_name}</p>
            <h3>{formatDateTime(post.scheduled_for)}</h3>
            <p>{post.caption}</p>
            {post.error_message && <span>{post.error_message}</span>}
          </div>
          <div className="schedule-item-side">
            <span className={clsx("status-pill", post.status)}>
              {getScheduleStatusLabel(post.status)}
            </span>
            {post.status === "pending" && (
              <button type="button" onClick={() => onCancel(post.id)}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function UsagePanel({
  creditLimit,
  remainingCredits,
  savedPosts,
  usedCredits,
  usagePercent
}: {
  creditLimit: number;
  remainingCredits: number;
  savedPosts: SavedPost[];
  usedCredits: number;
  usagePercent: number;
}) {
  return (
    <DashboardSection eyebrow="Uso" title="Creditos e consumo">
      <div className="metrics-grid">
        <div className="metric-card">
          <span>Creditos totais</span>
          <strong>{creditLimit}</strong>
        </div>
        <div className="metric-card">
          <span>Usados</span>
          <strong>{usedCredits}</strong>
        </div>
        <div className="metric-card">
          <span>Restantes</span>
          <strong>{remainingCredits}</strong>
        </div>
      </div>

      <div className="usage-panel">
        <div className="usage-panel-header">
          <div>
            <p className="eyebrow">Progresso mensal</p>
            <h3>{usagePercent}% dos creditos usados</h3>
          </div>
          <strong>
            {usedCredits}/{creditLimit}
          </strong>
        </div>
        <div className="usage-bar large">
          <span style={{ width: `${usagePercent}%` }} />
        </div>
        <p>O consumo e registrado no servidor a cada geracao concluida.</p>
      </div>

      <div className="usage-panel">
        <div className="usage-panel-header">
          <div>
            <p className="eyebrow">Atividade</p>
            <h3>{savedPosts.length} posts salvos</h3>
          </div>
        </div>
      </div>
    </DashboardSection>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function getScheduleStatusLabel(status: ScheduledPost["status"]) {
  const labels = {
    canceled: "Cancelado",
    failed: "Falhou",
    pending: "Agendado",
    published: "Publicado",
    publishing: "Publicando"
  };

  return labels[status];
}

function ProfilePanel({
  planName,
  profile
}: {
  planName: string;
  profile: DashboardProfile;
}) {
  return (
    <DashboardSection eyebrow="Perfil" title="Dados da conta">
      <div className="profile-grid">
        <div className="profile-card">
          <div className="profile-avatar large">{getInitials(profile.name)}</div>
          <h3>{profile.name}</h3>
          <p>{profile.email}</p>
          <span>Plano {planName}</span>
        </div>
        <div className="profile-details">
          <EmailConfirmationNotice
            email={profile.email}
            isConfirmed={profile.emailConfirmed}
          />
          <InfoRow label="Nome" value={profile.name} />
          <InfoRow label="Email" value={profile.email} />
          <InfoRow label="CPF/CNPJ" value={profile.document || "Nao informado"} />
          <InfoRow label="Celular" value={profile.phone || "Nao informado"} />
          <InfoRow label="Plano" value={planName} />
        </div>
      </div>
    </DashboardSection>
  );
}

function EmailConfirmationNotice({
  email,
  isConfirmed
}: {
  email: string;
  isConfirmed: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function resendConfirmation() {
    if (!email) {
      return;
    }

    setIsSending(true);
    setMessage(null);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/login?confirmed=1`
        }
      });

      if (error) {
        throw error;
      }

      setMessage("Email de confirmacao reenviado.");
    } catch {
      setMessage("Nao foi possivel reenviar agora.");
    } finally {
      setIsSending(false);
    }
  }

  if (isConfirmed) {
    return (
      <div className="email-notice confirmed">
        <ShieldCheck size={18} />
        <div>
          <strong>Email confirmado</strong>
          <p>Sua conta esta com email verificado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="email-notice pending">
      <ShieldCheck size={18} />
      <div>
        <strong>Email ainda nao confirmado</strong>
        <p>Confirme seu email para aumentar a seguranca da conta.</p>
        <button type="button" onClick={resendConfirmation} disabled={isSending}>
          {isSending ? "Enviando..." : "Reenviar confirmacao"}
        </button>
        {message && <span>{message}</span>}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LoadingPostState() {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div className="loader-orbit">
        <span />
        <Sparkles size={30} />
      </div>
      <h3>Criando seu post completo</h3>
      <p>Gerando copy, imagem, descricao e hashtags em um unico fluxo.</p>
      <div className="loading-steps">
        <span>Briefing</span>
        <span>Copy</span>
        <span>Imagem</span>
        <span>Finalizacao</span>
      </div>
    </div>
  );
}

function getInitials(name: string) {
  const [first = "U", second = "A"] = name.trim().split(/\s+/);
  return `${first[0] || "U"}${second[0] || ""}`.toUpperCase();
}

function PostCard({
  label,
  option
}: {
  label: string;
  option: GeneratedPost["post"];
}) {
  const [copied, setCopied] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const images =
    option.generated_images.length > 0
      ? option.generated_images
      : option.generated_image
        ? [option.generated_image]
        : [];

  async function copyCaption() {
    await navigator.clipboard.writeText(option.caption);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadImages() {
    images.forEach((image, index) => {
      const link = document.createElement("a");
      link.href = image;
      link.download =
        images.length > 1
          ? `autonomy-carrossel-${index + 1}.png`
          : "autonomy-post.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  }

  function goToPreviousSlide() {
    setActiveSlide((current) =>
      current === 0 ? images.length - 1 : current - 1
    );
  }

  function goToNextSlide() {
    setActiveSlide((current) =>
      current === images.length - 1 ? 0 : current + 1
    );
  }

  return (
    <article className="post-card">
      <div className="card-header">
        <span>{label}</span>
        <div className="card-actions">
          <button type="button" onClick={copyCaption} aria-label="Copiar descricao">
            <Copy size={17} />
            {copied ? "Copiado" : "Copiar"}
          </button>
          <button
            type="button"
            onClick={downloadImages}
            aria-label="Baixar imagem"
            disabled={images.length === 0}
          >
            <Download size={17} />
            Baixar
          </button>
        </div>
      </div>

      <div className="generated-media">
        {images.length > 1 ? (
          <div className="media-carousel">
            <figure className="carousel-stage">
              <img
                src={images[activeSlide]}
                alt={`${option.headline_da_imagem} - imagem ${activeSlide + 1}`}
              />
              <figcaption>
                {activeSlide + 1} / {images.length}
              </figcaption>
            </figure>

            <div className="carousel-controls">
              <button
                type="button"
                onClick={goToPreviousSlide}
                aria-label="Imagem anterior"
              >
                <ChevronLeft size={19} />
              </button>
              <div className="carousel-dots" aria-label="Slides do carrossel">
                {images.map((image, index) => (
                  <button
                    className={clsx(activeSlide === index && "active")}
                    type="button"
                    key={`${index}-${image.length}`}
                    onClick={() => setActiveSlide(index)}
                    aria-label={`Ver imagem ${index + 1}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={goToNextSlide}
                aria-label="Proxima imagem"
              >
                <ChevronRight size={19} />
              </button>
            </div>
          </div>
        ) : images.length === 1 ? (
          <div className="mock-cover">
            <img src={images[0]} alt={option.headline_da_imagem} />
          </div>
        ) : (
          <div className="mock-cover">
            <p>{option.headline_da_imagem}</p>
          </div>
        )}
      </div>

      <div className="card-section">
        <h3>Descricao</h3>
        <p className="caption-text">{option.caption}</p>
      </div>

      <div className="hashtags">
        {option.hashtags.map((tag) => (
          <span key={tag}>{tag.startsWith("#") ? tag : `#${tag}`}</span>
        ))}
      </div>
    </article>
  );
}
