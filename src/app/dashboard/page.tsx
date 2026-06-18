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
  Eye,
  ImagePlus,
  Library,
  LogOut,
  Plug,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
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
  updatePostFavorite,
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
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
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
  const [isPublishingNow, setIsPublishingNow] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const params = new URLSearchParams(window.location.search);
    const metaError = params.get("meta_error");
    const metaConnected = params.get("meta_connected");

    if (metaError) {
      setScheduleError(decodeURIComponent(metaError));
      setActiveView("conexoes");
    }

    if (metaConnected) {
      setScheduleMessage("Instagram conectado com sucesso.");
      setActiveView("conexoes");
    }

    if (metaError || metaConnected) {
      window.history.replaceState({}, "", window.location.pathname);
    }

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
      imagem_do_usuario: imagePreview,
      analise_da_imagem_do_usuario: imageAnalysis
    };
  }, [
    carouselCount,
    carouselDetails,
    context,
    imageAnalysis,
    imagePreview,
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
      if (mode === "contextual" && !imagePreview) {
        throw new Error("Envie uma imagem para gerar o post contextual.");
      }

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
      await persistGeneratedPost(data);
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
    setSelectedSocialAccountId((current) =>
      accounts.some((account) => account.id === current)
        ? current
        : accounts[0]?.id || ""
    );
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

  async function persistGeneratedPost(generatedPost: GeneratedPost) {
    const savedPost: SavedPost = {
      ...generatedPost,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      isFavorite: false
    };

    await savePost(savedPost);
    setSavedPosts((current) => [savedPost, ...current]);
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

  async function scheduleCurrentPost(socialAccountId: string, dateTime: string) {
    if (!result) {
      return;
    }

    setScheduleError(null);
    setScheduleMessage(null);
    setIsScheduling(true);

    try {
      if (!socialAccountId) {
        throw new Error("Conecte e selecione uma conta do Instagram.");
      }

      if (!dateTime) {
        throw new Error("Escolha data e horario para publicar.");
      }

      await schedulePost({
        post: result,
        scheduledFor: new Date(dateTime).toISOString(),
        socialAccountId
      });
      setSelectedSocialAccountId(socialAccountId);
      setScheduleDateTime(dateTime);
      await refreshSocialData();
      setScheduleMessage("Post agendado com sucesso.");
      setIsScheduleModalOpen(false);
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

  async function publishCurrentPostNow() {
    if (!result) {
      return;
    }

    setScheduleError(null);
    setScheduleMessage(null);
    setIsPublishingNow(true);

    try {
      if (!selectedSocialAccountId) {
        throw new Error("Conecte e selecione uma conta do Instagram.");
      }

      await schedulePost({
        post: result,
        publishNow: true,
        socialAccountId: selectedSocialAccountId
      });
      await refreshSocialData();
      setScheduleMessage("Post publicado no Instagram.");
      setActiveView("agenda");
    } catch (caughtError) {
      setScheduleError(
        caughtError instanceof Error
          ? caughtError.message
          : "Nao foi possivel publicar este post agora."
      );
    } finally {
      setIsPublishingNow(false);
    }
  }

  async function scheduleSavedPost(post: SavedPost, socialAccountId: string, dateTime: string) {
    setScheduleError(null);
    setScheduleMessage(null);

    try {
      await schedulePost({
        post,
        savedPostId: post.id,
        scheduledFor: new Date(dateTime).toISOString(),
        socialAccountId
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
    }
  }

  async function publishSavedPostNow(post: SavedPost, socialAccountId: string) {
    setScheduleError(null);
    setScheduleMessage(null);

    try {
      await schedulePost({
        post,
        publishNow: true,
        savedPostId: post.id,
        socialAccountId
      });
      await refreshSocialData();
      setScheduleMessage("Post publicado no Instagram.");
      setActiveView("agenda");
    } catch (caughtError) {
      setScheduleError(
        caughtError instanceof Error
          ? caughtError.message
          : "Nao foi possivel publicar este post agora."
      );
    }
  }

  async function removeSocialAccount(id: string) {
    try {
      await disconnectSocialAccount(id);
      setSocialAccounts((current) =>
        current.filter((account) => account.id !== id)
      );
      setSelectedSocialAccountId((current) => (current === id ? "" : current));
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

  function updateGeneratedPost(nextPost: GeneratedPost["post"]) {
    setResult((current) =>
      current ? { ...current, post: nextPost } : current
    );
  }

  async function deleteSavedPost(id: string) {
    try {
      await deletePost(id);
      setSavedPosts(savedPosts.filter((post) => post.id !== id));
    } catch {
      setError("Nao foi possivel remover este post da biblioteca.");
    }
  }

  async function toggleSavedPostFavorite(id: string, isFavorite: boolean) {
    const previousPosts = savedPosts;
    const nextPosts = savedPosts
      .map((post) => (post.id === id ? { ...post, isFavorite } : post))
      .sort(sortSavedPosts);

    setSavedPosts(nextPosts);

    try {
      await updatePostFavorite(id, isFavorite);
    } catch {
      setSavedPosts(previousPosts);
      setError("Nao foi possivel atualizar o favorito.");
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
            <span className="nav-label">Gerar post</span>
          </button>
          <button
            className={clsx(activeView === "biblioteca" && "active")}
            type="button"
            onClick={() => setActiveView("biblioteca")}
          >
            <Library size={18} />
            <span className="nav-label">Meus posts</span>
            <span>{savedPosts.length}</span>
          </button>
          <button
            className={clsx(activeView === "agenda" && "active")}
            type="button"
            onClick={() => setActiveView("agenda")}
          >
            <CalendarClock size={18} />
            <span className="nav-label">Agendamentos</span>
            <span>{scheduledPosts.length}</span>
          </button>
          <button
            className={clsx(activeView === "conexoes" && "active")}
            type="button"
            onClick={() => setActiveView("conexoes")}
          >
            <Plug size={18} />
            <span className="nav-label">Conexoes</span>
            <span>{socialAccounts.length}</span>
          </button>
          <button
            className={clsx(activeView === "uso" && "active")}
            type="button"
            onClick={() => setActiveView("uso")}
          >
            <BarChart3 size={18} />
            <span className="nav-label">Uso e creditos</span>
          </button>
          <button
            className={clsx(activeView === "perfil" && "active")}
            type="button"
            onClick={() => setActiveView("perfil")}
          >
            <User size={18} />
            <span className="nav-label">Perfil</span>
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
                  <div className="result-action-bar">
                    <button
                      className="schedule-button"
                      type="button"
                      onClick={() => setIsScheduleModalOpen(true)}
                      disabled={isScheduling || isPublishingNow || !result}
                    >
                      <CalendarClock size={16} />
                      Agendar
                    </button>
                    <button
                      className="schedule-button now"
                      type="button"
                      onClick={publishCurrentPostNow}
                      disabled={isScheduling || isPublishingNow || !result}
                    >
                      <Send size={16} />
                      {isPublishingNow ? "Postando" : "Postar agora"}
                    </button>
                  </div>
                )}
                {result && (
                  <span className="autosave-pill">
                    <Library size={16} />
                    Salvo automaticamente
                  </span>
                )}
                <button
                  className="discard-button result-discard-button"
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
          {result && isScheduleModalOpen && (
            <ScheduleModal
              accounts={socialAccounts}
              dateTime={scheduleDateTime}
              isSubmitting={isScheduling}
              onClose={() => setIsScheduleModalOpen(false)}
              onConfirm={(socialAccountId, dateTime) =>
                scheduleCurrentPost(socialAccountId, dateTime)
              }
              selectedAccountId={selectedSocialAccountId}
            />
          )}

          {isLoading ? (
            <LoadingPostState />
          ) : result ? (
            <div className="cards-grid single-card">
              <PostCard
                editable
                label="Post gerado"
                option={result.post}
                onChange={updateGeneratedPost}
              />
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
              onFavorite={toggleSavedPostFavorite}
              onPublishNow={publishSavedPostNow}
              onSchedule={scheduleSavedPost}
              posts={savedPosts}
              socialAccounts={socialAccounts}
              onDelete={deleteSavedPost}
            />
          </DashboardSection>
        )}

        {activeView === "agenda" && (
          <DashboardSection eyebrow="Calendario" title="Posts agendados">
            <ScheduledPostsPanel
              accounts={socialAccounts}
              posts={scheduledPosts}
              onCancel={cancelSchedule}
            />
          </DashboardSection>
        )}

        {activeView === "conexoes" && (
          <DashboardSection eyebrow="Canais" title="Instagram">
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
  onFavorite,
  onPublishNow,
  onSchedule,
  socialAccounts,
  posts
}: {
  error: string | null;
  onDelete: (id: string) => void | Promise<void>;
  onFavorite: (id: string, isFavorite: boolean) => void | Promise<void>;
  onPublishNow: (post: SavedPost, socialAccountId: string) => void | Promise<void>;
  onSchedule: (
    post: SavedPost,
    socialAccountId: string,
    dateTime: string
  ) => void | Promise<void>;
  socialAccounts: SocialAccount[];
  posts: SavedPost[];
}) {
  const [libraryFilter, setLibraryFilter] = useState<"todos" | "favoritos">(
    "todos"
  );
  const favoritePosts = posts.filter((post) => post.isFavorite);
  const visiblePosts =
    libraryFilter === "favoritos" ? favoritePosts : posts;

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
        <h3>Nenhum post gerado ainda.</h3>
        <p>Todo post gerado aparece aqui automaticamente.</p>
      </div>
    );
  }

  return (
    <div className="library-stack">
      <div className="library-filter-bar" aria-label="Filtro da biblioteca">
        <button
          className={clsx(libraryFilter === "todos" && "active")}
          type="button"
          onClick={() => setLibraryFilter("todos")}
        >
          <Library size={16} />
          Todos
          <span>{posts.length}</span>
        </button>
        <button
          className={clsx(libraryFilter === "favoritos" && "active")}
          type="button"
          onClick={() => setLibraryFilter("favoritos")}
        >
          <Star size={16} />
          Favoritos
          <span>{favoritePosts.length}</span>
        </button>
      </div>

      {visiblePosts.length === 0 ? (
        <div className="empty-state compact-empty">
          <div className="empty-icon">
            <Star size={30} />
          </div>
          <h3>Nenhum favorito ainda.</h3>
          <p>Marque posts com estrela para encontrá-los mais rapido aqui.</p>
        </div>
      ) : (
        <div className="library-list">
          {visiblePosts.map((savedPost) => (
            <div className="library-item" key={savedPost.id}>
              <LibraryPostPreview
                onDelete={() => onDelete(savedPost.id)}
                onFavorite={() => onFavorite(savedPost.id, !savedPost.isFavorite)}
                post={savedPost}
              />
              <SavedPostScheduler
                post={savedPost}
                socialAccounts={socialAccounts}
                onPublishNow={onPublishNow}
                onSchedule={onSchedule}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryPostPreview({
  onDelete,
  onFavorite,
  post
}: {
  onDelete: () => void | Promise<void>;
  onFavorite: () => void | Promise<void>;
  post: SavedPost;
}) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const images = getPostImages(post.post);
  const previewImage = images[0] || null;

  return (
    <>
      <div className="library-preview">
        <div className="library-item-header">
          <div>
            <p className="eyebrow">{post.nicho}</p>
            <h3>{post.post.headline_da_imagem}</h3>
          </div>
          <div className="library-icon-actions">
            <button
              className={clsx("icon-favorite", post.isFavorite && "active")}
              type="button"
              onClick={onFavorite}
              aria-label={post.isFavorite ? "Remover dos favoritos" : "Favoritar"}
            >
              <Star size={17} fill={post.isFavorite ? "currentColor" : "none"} />
            </button>
            <button
              className="icon-remove"
              type="button"
              onClick={onDelete}
              aria-label="Remover post"
            >
              <Trash2 size={17} />
            </button>
          </div>
        </div>

        <button
          className="library-media-preview"
          type="button"
          onClick={() => setIsDetailOpen(true)}
          aria-label="Ver post completo"
        >
          {previewImage ? (
            <img src={previewImage} alt={post.post.headline_da_imagem} />
          ) : (
            <span>{post.post.headline_da_imagem}</span>
          )}
          {images.length > 1 && (
            <span className="library-carousel-count">1/{images.length}</span>
          )}
          <span className="view-post-button">
            <Eye size={15} />
            Ver post
          </span>
        </button>
      </div>

      {isDetailOpen && (
        <PostDetailModal
          onClose={() => setIsDetailOpen(false)}
          option={post.post}
        />
      )}
    </>
  );
}

function PostDetailModal({
  onClose,
  option
}: {
  onClose: () => void;
  option: GeneratedPost["post"];
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        aria-modal="true"
        className="post-detail-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="schedule-modal-header">
          <div>
            <p className="eyebrow">Post salvo</p>
            <h3>Post completo</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            X
          </button>
        </div>
        <PostCard label="Post completo" option={option} />
      </div>
    </div>
  );
}

function SavedPostScheduler({
  onPublishNow,
  onSchedule,
  post,
  socialAccounts
}: {
  onPublishNow: (post: SavedPost, socialAccountId: string) => void | Promise<void>;
  onSchedule: (
    post: SavedPost,
    socialAccountId: string,
    dateTime: string
  ) => void | Promise<void>;
  post: SavedPost;
  socialAccounts: SocialAccount[];
}) {
  const [dateTime, setDateTime] = useState("");
  const [socialAccountId, setSocialAccountId] = useState(
    socialAccounts[0]?.id || ""
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setSocialAccountId((current) => current || socialAccounts[0]?.id || "");
  }, [socialAccounts]);

  async function schedule(nextSocialAccountId: string, nextDateTime: string) {
    setMessage(null);

    if (!nextSocialAccountId) {
      setMessage("Conecte uma conta do Instagram.");
      return;
    }

    if (!nextDateTime) {
      setMessage("Escolha data e horario.");
      return;
    }

    setSocialAccountId(nextSocialAccountId);
    setDateTime(nextDateTime);
    await onSchedule(post, nextSocialAccountId, nextDateTime);
    setIsModalOpen(false);
  }

  async function publishNow() {
    setMessage(null);

    if (!socialAccountId) {
      setMessage("Conecte uma conta do Instagram.");
      return;
    }

    await onPublishNow(post, socialAccountId);
  }

  return (
    <div className="saved-post-scheduler">
      <div className="saved-post-scheduler-actions">
        <button type="button" onClick={() => setIsModalOpen(true)}>
          <CalendarClock size={16} />
          Agendar
        </button>
        <button className="now" type="button" onClick={publishNow}>
          <Send size={16} />
          Publicar agora
        </button>
      </div>
      {message && <span>{message}</span>}
      {isModalOpen && (
        <ScheduleModal
          accounts={socialAccounts}
          dateTime={dateTime}
          onClose={() => setIsModalOpen(false)}
          onConfirm={schedule}
          selectedAccountId={socialAccountId}
        />
      )}
    </div>
  );
}

function ScheduleModal({
  accounts,
  dateTime,
  isSubmitting = false,
  onClose,
  onConfirm,
  selectedAccountId
}: {
  accounts: SocialAccount[];
  dateTime: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (socialAccountId: string, dateTime: string) => void | Promise<void>;
  selectedAccountId: string;
}) {
  const [localAccountId, setLocalAccountId] = useState(
    selectedAccountId || accounts[0]?.id || ""
  );
  const [localDateTime, setLocalDateTime] = useState(dateTime);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setLocalAccountId((current) => {
      if (current && accounts.some((account) => account.id === current)) {
        return current;
      }

      return selectedAccountId || accounts[0]?.id || "";
    });
  }, [accounts, selectedAccountId]);

  async function confirmSchedule() {
    setLocalError(null);

    if (!localAccountId) {
      setLocalError("Selecione uma conta do Instagram.");
      return;
    }

    if (!localDateTime) {
      setLocalError("Escolha data e horario para publicar.");
      return;
    }

    await onConfirm(localAccountId, localDateTime);
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        aria-modal="true"
        className="schedule-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="schedule-modal-header">
          <div>
            <p className="eyebrow">Agendamento</p>
            <h3>Programar post</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            X
          </button>
        </div>

        <div className="schedule-modal-fields">
          <label>
            <span>Conta do Instagram</span>
            <select
              value={localAccountId}
              onChange={(event) => setLocalAccountId(event.target.value)}
              disabled={accounts.length === 0}
            >
              <option value="">
                {accounts.length === 0
                  ? "Nenhuma conta conectada"
                  : "Selecione uma conta"}
              </option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  @{account.instagram_username || account.page_name || "instagram"}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Data e horario</span>
            <input
              type="datetime-local"
              value={localDateTime}
              onChange={(event) => setLocalDateTime(event.target.value)}
            />
          </label>
        </div>

        {localError && <p className="error-message">{localError}</p>}

        <div className="schedule-modal-actions">
          <button className="modal-cancel-button" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="schedule-button"
            type="button"
            onClick={confirmSchedule}
            disabled={isSubmitting}
          >
            <CalendarClock size={16} />
            Confirmar agendamento
          </button>
        </div>
      </div>
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
            Conecte uma conta Business ou Creator para publicar automaticamente,
            sem depender de Pagina do Facebook.
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
                {getInitials(
                  account.instagram_username || account.page_name || "Instagram"
                )}
              </div>
              <div>
                <strong>@{account.instagram_username || "instagram"}</strong>
                <span>
                  {account.auth_flow === "instagram_login"
                    ? "Instagram Login"
                    : account.page_name || "Conta conectada"}
                </span>
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
  accounts,
  onCancel,
  posts
}: {
  accounts: SocialAccount[];
  onCancel: (id: string) => void | Promise<void>;
  posts: ScheduledPost[];
}) {
  const accountTabs = buildScheduleAccountTabs(accounts, posts);
  const [activeAccountId, setActiveAccountId] = useState(
    accountTabs[0]?.id || ""
  );
  const [activeStatusTab, setActiveStatusTab] = useState<
    "agendados" | "publicados"
  >("agendados");
  const selectedAccountId = accountTabs.some((account) => account.id === activeAccountId)
    ? activeAccountId
    : accountTabs[0]?.id || "";
  const accountPosts = posts.filter(
    (post) => post.social_account_id === selectedAccountId
  );
  const visiblePosts = accountPosts.filter((post) =>
    activeStatusTab === "agendados"
      ? post.status === "pending" || post.status === "publishing"
      : post.status === "published"
  );
  const scheduledCount = accountPosts.filter(
    (post) => post.status === "pending" || post.status === "publishing"
  ).length;
  const publishedCount = accountPosts.filter(
    (post) => post.status === "published"
  ).length;

  if (accountTabs.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <CalendarClock size={30} />
        </div>
        <h3>Nenhuma conta conectada.</h3>
        <p>Conecte uma conta do Instagram para organizar seus agendamentos.</p>
      </div>
    );
  }

  return (
    <div className="schedule-panel">
      <div className="account-tabs" aria-label="Contas do Instagram">
        {accountTabs.map((account) => (
          <button
            className={clsx(selectedAccountId === account.id && "active")}
            key={account.id}
            type="button"
            onClick={() => setActiveAccountId(account.id)}
          >
            @{account.label}
            <span>{account.count}</span>
          </button>
        ))}
      </div>

      <div className="schedule-status-tabs" aria-label="Status dos posts">
        <button
          className={clsx(activeStatusTab === "agendados" && "active")}
          type="button"
          onClick={() => setActiveStatusTab("agendados")}
        >
          Agendados
          <span>{scheduledCount}</span>
        </button>
        <button
          className={clsx(activeStatusTab === "publicados" && "active")}
          type="button"
          onClick={() => setActiveStatusTab("publicados")}
        >
          Publicados
          <span>{publishedCount}</span>
        </button>
      </div>

      {visiblePosts.length === 0 ? (
        <div className="empty-state compact-empty">
          <div className="empty-icon">
            <CalendarClock size={30} />
          </div>
          <h3>
            {activeStatusTab === "agendados"
              ? "Nenhum post agendado nesta conta."
              : "Nenhum post publicado nesta conta."}
          </h3>
          <p>Os posts desta conta aparecem aqui conforme o status.</p>
        </div>
      ) : (
        <div className="schedule-list">
          {visiblePosts.map((post) => (
            <ScheduledPostCard key={post.id} post={post} onCancel={onCancel} />
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduledPostCard({
  onCancel,
  post
}: {
  onCancel: (id: string) => void | Promise<void>;
  post: ScheduledPost;
}) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const previewImage = post.media_urls[0] || null;

  return (
    <>
      <article className="schedule-card">
        <div className="schedule-card-header">
          <div>
            <p className="eyebrow">
              @{post.instagram_username || post.page_name || "instagram"}
            </p>
            <h3>{formatDateTime(post.scheduled_for)}</h3>
          </div>
          <span className={clsx("status-pill", post.status)}>
            {getScheduleStatusLabel(post.status)}
          </span>
        </div>

        <button
          className="library-media-preview"
          type="button"
          onClick={() => setIsDetailOpen(true)}
          aria-label="Ver post agendado"
        >
          {previewImage ? (
            <img src={previewImage} alt="Midia do post agendado" />
          ) : (
            <span>Post agendado</span>
          )}
          {post.media_urls.length > 1 && (
            <span className="library-carousel-count">
              1/{post.media_urls.length}
            </span>
          )}
          <span className="view-post-button">
            <Eye size={15} />
            Ver post
          </span>
        </button>

        <div className="schedule-card-footer">
          {post.error_message && <span>{post.error_message}</span>}
          {post.status === "pending" && (
            <button type="button" onClick={() => onCancel(post.id)}>
              Cancelar
            </button>
          )}
        </div>
      </article>

      {isDetailOpen && (
        <ScheduledPostDetailModal
          onClose={() => setIsDetailOpen(false)}
          post={post}
        />
      )}
    </>
  );
}

function ScheduledPostDetailModal({
  onClose,
  post
}: {
  onClose: () => void;
  post: ScheduledPost;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        aria-modal="true"
        className="post-detail-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="schedule-modal-header">
          <div>
            <p className="eyebrow">
              @{post.instagram_username || post.page_name || "instagram"}
            </p>
            <h3>{formatDateTime(post.scheduled_for)}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            X
          </button>
        </div>

        <div className="scheduled-detail-content">
          <div className="scheduled-detail-media">
            {post.media_urls.map((image, index) => (
              <img
                key={`${post.id}-${index}`}
                src={image}
                alt={`Midia ${index + 1} do post agendado`}
              />
            ))}
          </div>
          <div className="card-section">
            <h3>Descricao</h3>
            <p className="caption-text">{post.caption}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildScheduleAccountTabs(
  accounts: SocialAccount[],
  posts: ScheduledPost[]
) {
  const accountMap = new Map<string, { count: number; id: string; label: string }>();

  accounts.forEach((account) => {
    accountMap.set(account.id, {
      count: 0,
      id: account.id,
      label: account.instagram_username || account.page_name || "instagram"
    });
  });

  posts.forEach((post) => {
    const current = accountMap.get(post.social_account_id);

    if (current) {
      current.count += 1;
      return;
    }

    accountMap.set(post.social_account_id, {
      count: 1,
      id: post.social_account_id,
      label: post.instagram_username || post.page_name || "instagram"
    });
  });

  return Array.from(accountMap.values());
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

function sortSavedPosts(firstPost: SavedPost, secondPost: SavedPost) {
  if (Boolean(firstPost.isFavorite) !== Boolean(secondPost.isFavorite)) {
    return firstPost.isFavorite ? -1 : 1;
  }

  return (
    new Date(secondPost.createdAt).getTime() -
    new Date(firstPost.createdAt).getTime()
  );
}

function getPostImages(option: GeneratedPost["post"]) {
  return option.generated_images.length > 0
    ? option.generated_images
    : option.generated_image
      ? [option.generated_image]
      : [];
}

function PostCard({
  compact = false,
  editable = false,
  extraActions,
  label,
  onChange,
  option
}: {
  compact?: boolean;
  editable?: boolean;
  extraActions?: ReactNode;
  label: string;
  onChange?: (option: GeneratedPost["post"]) => void;
  option: GeneratedPost["post"];
}) {
  const [copied, setCopied] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const images = getPostImages(option);

  async function copyCaption() {
    await navigator.clipboard.writeText(
      formatCaptionWithHashtags(option.caption, option.hashtags)
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function updateCaption(caption: string) {
    onChange?.({ ...option, caption });
  }

  function updateHashtags(value: string) {
    onChange?.({ ...option, hashtags: parseHashtags(value) });
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
    <article className={clsx("post-card", compact && "compact")}>
      <div className="card-header">
        <span>{label}</span>
        <div className="card-actions">
          {extraActions}
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
        {editable ? (
          <textarea
            className="caption-editor"
            aria-label="Editar descricao"
            rows={8}
            value={option.caption}
            onChange={(event) => updateCaption(event.target.value)}
          />
        ) : (
          <p className="caption-text">{option.caption}</p>
        )}
      </div>

      {editable ? (
        <label className="hashtags-editor">
          <span>Hashtags</span>
          <textarea
            aria-label="Editar hashtags"
            rows={3}
            value={option.hashtags
              .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
              .join(" ")}
            onChange={(event) => updateHashtags(event.target.value)}
          />
        </label>
      ) : (
        <div className="hashtags">
          {option.hashtags.map((tag) => (
            <span key={tag}>{tag.startsWith("#") ? tag : `#${tag}`}</span>
          ))}
        </div>
      )}
    </article>
  );
}

function parseHashtags(value: string) {
  return value
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
}

function formatCaptionWithHashtags(caption: string, hashtags: string[]) {
  const normalizedCaption = caption.trim();
  const normalizedHashtags = hashtags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
  const missingHashtags = normalizedHashtags.filter(
    (tag) => !new RegExp(`(^|\\s)${escapeRegExp(tag)}(\\s|$)`, "i").test(normalizedCaption)
  );

  if (missingHashtags.length === 0) {
    return normalizedCaption;
  }

  return `${normalizedCaption}\n\n${missingHashtags.join(" ")}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
