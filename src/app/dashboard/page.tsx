"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
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
  updateSavedPost,
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
type Language = "pt" | "en";
type DashboardProfile = {
  email: string;
  emailConfirmed: boolean;
  name: string;
  document: string;
  phone: string;
  plan: string;
};

const usageSummaryStorageKey = "autonomy.usageSummary";
const simplePostCreditCost = 2;

function tx(language: Language, pt: string, en: string) {
  return language === "en" ? en : pt;
}

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
  const [language, setLanguage] = useState<Language>("pt");
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
  const [currentSavedPostId, setCurrentSavedPostId] = useState<string | null>(null);
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
  const [generatedSaveMessage, setGeneratedSaveMessage] = useState<string | null>(null);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishingNow, setIsPublishingNow] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isSavingGeneratedPost, setIsSavingGeneratedPost] = useState(false);
  const [isPublishNowModalOpen, setIsPublishNowModalOpen] = useState(false);
  const lastSavedGeneratedSignature = useRef("");
  const hasGeneratedPostChanges =
    result !== null && getPostSignature(result) !== lastSavedGeneratedSignature.current;

  useEffect(() => {
    const supabase = getSupabaseClient();
    const params = new URLSearchParams(window.location.search);
    const nextLanguage = params.get("lang") === "en" ? "en" : null;
    const metaError = params.get("meta_error");
    const metaConnected = params.get("meta_connected");

    if (nextLanguage) {
      window.localStorage.setItem("autonomy.language", nextLanguage);
      setLanguage(nextLanguage);
    } else if (window.localStorage.getItem("autonomy.language") === "en") {
      setLanguage("en");
    }

    const cachedUsageSummary = window.localStorage.getItem(usageSummaryStorageKey);

    if (cachedUsageSummary) {
      try {
        setUsageSummary(JSON.parse(cachedUsageSummary) as UsageSummary);
      } catch {
        window.localStorage.removeItem(usageSummaryStorageKey);
      }
    }

    if (metaError) {
      setScheduleError(decodeURIComponent(metaError));
      setActiveView("conexoes");
    }

    if (metaConnected) {
      setScheduleMessage(
        tx(nextLanguage || "pt", "Instagram conectado com sucesso.", "Instagram connected successfully.")
      );
      setActiveView("conexoes");
    }

    if (metaError || metaConnected) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;

      if (!user) {
        window.location.href = language === "en" ? "/login?lang=en" : "/login";
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
        setLibraryError(
          tx(language, "Não foi possível carregar a biblioteca de posts.", "Could not load the post library.")
        )
      );

    refreshUsageSummary().catch(() => undefined);
    refreshSocialData().catch(() => undefined);
  }, [language]);

  const activePlan = getPlan(profile.plan) || plans[1];
  const creditLimit = usageSummary?.creditsLimit ?? activePlan.creditLimit;
  const usedCredits = usageSummary?.usedCredits ?? 0;
  const remainingCredits =
    usageSummary?.remainingCredits ?? Math.max(creditLimit - usedCredits, 0);
  const usagePercent =
    usageSummary?.usagePercent ??
    Math.min(Math.round((usedCredits / creditLimit) * 100), 100);
  const visibleScheduledPosts = getVisibleScheduledPosts(scheduledPosts);
  const sidebarScheduledCount = visibleScheduledPosts.length;
  const generationCreditCost = getGenerationCreditCost({
    carouselCount,
    mode,
    visualFormat
  });

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
        throw new Error(
          tx(language, "Envie uma imagem para gerar o post contextual.", "Upload an image to generate a contextual post.")
        );
      }


      const response = await fetchWithFreshSession("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            tx(language, "Não foi possível gerar os posts.", "Could not generate the posts.")
        );
      }

      setResult(data);
      await persistGeneratedPost(data);
      setActiveView("gerar");
      await refreshUsageSummary();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : tx(language, "Erro inesperado ao gerar.", "Unexpected generation error.")
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshUsageSummary() {
    const summary = await getUsageSummary();
    setUsageSummary(summary);
    window.localStorage.setItem(usageSummaryStorageKey, JSON.stringify(summary));
  }

  async function fetchWithFreshSession(input: RequestInfo | URL, init: RequestInit = {}) {
    const supabase = getSupabaseClient();
    const sessionResponse = await supabase.auth.getSession();
    let token = sessionResponse.data.session?.access_token;

    if (!token) {
      const refreshResponse = await supabase.auth.refreshSession();
      token = refreshResponse.data.session?.access_token;
    }

    if (!token) {
      throw new Error(
        tx(language, "Sessão expirada. Entre novamente para gerar posts.", "Your session expired. Sign in again to generate posts.")
      );
    }

    const buildInit = (nextToken: string): RequestInit => ({
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${nextToken}`
      }
    });

    let response: Response;

    try {
      response = await fetch(input, buildInit(token));
    } catch (caughtError) {
      const refreshResponse = await supabase.auth.refreshSession();
      const refreshedToken = refreshResponse.data.session?.access_token;

      if (!refreshedToken) {
        throw caughtError;
      }

      response = await fetch(input, buildInit(refreshedToken));
    }

    if (response.status === 401 || response.status === 403) {
      const refreshResponse = await supabase.auth.refreshSession();
      const refreshedToken = refreshResponse.data.session?.access_token;

      if (refreshedToken) {
        return fetch(input, buildInit(refreshedToken));
      }
    }

    return response;
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
    setCurrentSavedPostId(savedPost.id);
    lastSavedGeneratedSignature.current = getPostSignature(generatedPost);
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
          : tx(language, "Não foi possível conectar Instagram.", "Could not connect Instagram.")
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
        throw new Error(
          tx(language, "Conecte e selecione uma conta do Instagram.", "Connect and select an Instagram account.")
        );
      }

      if (!dateTime) {
        throw new Error(
          tx(language, "Escolha data e horário para publicar.", "Choose a publishing date and time.")
        );
      }

      await schedulePost({
        post: result,
        scheduledFor: new Date(dateTime).toISOString(),
        socialAccountId
      });
      setSelectedSocialAccountId(socialAccountId);
      setScheduleDateTime(dateTime);
      await refreshSocialData();
      setScheduleMessage(tx(language, "Post agendado com sucesso.", "Post scheduled successfully."));
      setIsScheduleModalOpen(false);
      setActiveView("agenda");
    } catch (caughtError) {
      setScheduleError(
        caughtError instanceof Error
          ? caughtError.message
          : tx(language, "Não foi possível agendar este post.", "Could not schedule this post.")
      );
    } finally {
      setIsScheduling(false);
    }
  }

  async function publishCurrentPostNow(socialAccountId = selectedSocialAccountId) {
    if (!result) {
      return;
    }

    setScheduleError(null);
    setScheduleMessage(null);
    setIsPublishingNow(true);

    try {
      if (!socialAccountId) {
        throw new Error(
          tx(language, "Conecte e selecione uma conta do Instagram.", "Connect and select an Instagram account.")
        );
      }

      await schedulePost({
        post: result,
        publishNow: true,
        socialAccountId
      });
      setSelectedSocialAccountId(socialAccountId);
      await refreshSocialData();
      setScheduleMessage(tx(language, "Post publicado no Instagram.", "Post published on Instagram."));
      setIsPublishNowModalOpen(false);
      setActiveView("agenda");
    } catch (caughtError) {
      setScheduleError(
        caughtError instanceof Error
          ? caughtError.message
          : tx(language, "Não foi possível publicar este post agora.", "Could not publish this post now.")
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
      setScheduleMessage(tx(language, "Post agendado com sucesso.", "Post scheduled successfully."));
      setActiveView("agenda");
    } catch (caughtError) {
      setScheduleError(
        caughtError instanceof Error
          ? caughtError.message
          : tx(language, "Não foi possível agendar este post.", "Could not schedule this post.")
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
      setScheduleMessage(tx(language, "Post publicado no Instagram.", "Post published on Instagram."));
      setActiveView("agenda");
    } catch (caughtError) {
      setScheduleError(
        caughtError instanceof Error
          ? caughtError.message
          : tx(language, "Não foi possível publicar este post agora.", "Could not publish this post now.")
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
      setScheduleError(tx(language, "Não foi possível desconectar a conta.", "Could not disconnect the account."));
    }
  }

  async function cancelSchedule(id: string) {
    try {
      await cancelScheduledPost(id);
      await refreshSocialData();
    } catch {
      setScheduleError(tx(language, "Não foi possível cancelar o agendamento.", "Could not cancel the scheduled post."));
    }
  }

  function discardCurrentPost() {
    setResult(null);
    setError(null);
  }

  function updateGeneratedPost(nextPost: GeneratedPost["post"]) {
    setResult((current) => {
      if (!current) {
        return current;
      }

      const nextResult = { ...current, post: nextPost };

      setGeneratedSaveMessage(null);
      return nextResult;
    });
  }

  async function saveGeneratedPostChanges() {
    if (!result || !currentSavedPostId || !hasGeneratedPostChanges || isSavingGeneratedPost) {
      return;
    }

    setIsSavingGeneratedPost(true);
    setGeneratedSaveMessage(null);

    try {
      await updateSavedPost(currentSavedPostId, result);
      setSavedPosts((posts) =>
        posts.map((savedPost) =>
          savedPost.id === currentSavedPostId
            ? {
                ...savedPost,
                modo_executado: result.modo_executado,
                nicho: result.nicho,
                formato_visual: result.formato_visual,
                post: result.post
              }
            : savedPost
        )
      );
      lastSavedGeneratedSignature.current = getPostSignature(result);
      setGeneratedSaveMessage(tx(language, "Alterações salvas.", "Changes saved."));
    } catch (caughtError) {
      setGeneratedSaveMessage(
        caughtError instanceof Error
          ? caughtError.message
          : tx(language, "Não foi possível salvar as alterações.", "Could not save the changes.")
      );
    } finally {
      setIsSavingGeneratedPost(false);
    }
  }

  function discardGeneratedPostChanges() {
    if (!currentSavedPostId) {
      return;
    }

    const savedPost = savedPosts.find((post) => post.id === currentSavedPostId);

    if (!savedPost) {
      return;
    }

    const restoredPost: GeneratedPost = {
      formato_visual: savedPost.formato_visual,
      modo_executado: savedPost.modo_executado,
      nicho: savedPost.nicho,
      post: savedPost.post
    };

    setResult(restoredPost);
    lastSavedGeneratedSignature.current = getPostSignature(restoredPost);
    setGeneratedSaveMessage(null);
  }

  async function updateSavedPostContent(id: string, nextPost: GeneratedPost["post"]) {
    const previousPosts = savedPosts;
    const previousResult = result;
    const previousSignature = lastSavedGeneratedSignature.current;
    const currentPost = savedPosts.find((post) => post.id === id);

    if (!currentPost) {
      return;
    }

    const updatedPost: SavedPost = {
      ...currentPost,
      post: nextPost
    };

    setSavedPosts((posts) =>
      posts.map((post) => (post.id === id ? updatedPost : post))
    );

    if (currentSavedPostId === id) {
      const updatedGeneratedPost: GeneratedPost = {
        modo_executado: updatedPost.modo_executado,
        nicho: updatedPost.nicho,
        formato_visual: updatedPost.formato_visual,
        post: updatedPost.post
      };
      setResult(updatedGeneratedPost);
      lastSavedGeneratedSignature.current = getPostSignature(updatedGeneratedPost);
    }

    try {
      await updateSavedPost(id, {
        modo_executado: updatedPost.modo_executado,
        nicho: updatedPost.nicho,
        formato_visual: updatedPost.formato_visual,
        post: updatedPost.post
      });
    } catch (caughtError) {
      setSavedPosts(previousPosts);
      if (currentSavedPostId === id) {
        setResult(previousResult);
        lastSavedGeneratedSignature.current = previousSignature;
      }
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : tx(language, "Não foi possível salvar as alterações.", "Could not save the changes.")
      );
      throw caughtError;
    }
  }

  async function deleteSavedPost(id: string) {
    try {
      await deletePost(id);
      setSavedPosts(savedPosts.filter((post) => post.id !== id));
      if (currentSavedPostId === id) {
        setCurrentSavedPostId(null);
        setResult(null);
      }
    } catch {
      setError(tx(language, "Não foi possível remover este post da biblioteca.", "Could not remove this post from the library."));
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
      setError(tx(language, "Não foi possível atualizar o favorito.", "Could not update the favorite status."));
    }
  }

  async function signOut() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function setDashboardLanguage(nextLanguage: Language) {
    window.localStorage.setItem("autonomy.language", nextLanguage);
    setLanguage(nextLanguage);
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
          <LanguageCards language={language} onChange={setDashboardLanguage} />
        </div>

        <div className="profile-summary">
          <div className="profile-avatar">{getInitials(profile.name)}</div>
          <div>
            <strong>{profile.name}</strong>
            <span>{profile.email || tx(language, "Conta conectada", "Connected account")}</span>
          </div>
        </div>

        <div className="sidebar-credits">
          <div>
            <span>{tx(language, "Créditos", "Credits")}</span>
            <strong>{usageSummary ? remainingCredits : "..."}</strong>
          </div>
          <div className="usage-bar">
            <span style={{ width: `${usagePercent}%` }} />
          </div>
          <p>
            {usageSummary
              ? tx(
                  language,
                  `${usedCredits} de ${creditLimit} usados (${usagePercent}%)`,
                  `${usedCredits} of ${creditLimit} used (${usagePercent}%)`
                )
              : tx(language, "Carregando créditos...", "Loading credits...")}
          </p>
        </div>

        <nav className="sidebar-nav" aria-label="Dashboard">
          <button
            className={clsx(activeView === "gerar" && "active")}
            type="button"
            onClick={() => setActiveView("gerar")}
          >
            <Sparkles size={18} />
            <span className="nav-label">{tx(language, "Gerar post", "Generate post")}</span>
          </button>
          <button
            className={clsx(activeView === "biblioteca" && "active")}
            type="button"
            onClick={() => setActiveView("biblioteca")}
          >
            <Library size={18} />
            <span className="nav-label">{tx(language, "Meus posts", "My posts")}</span>
            <span>{savedPosts.length}</span>
          </button>
          <button
            className={clsx(activeView === "agenda" && "active")}
            type="button"
            onClick={() => setActiveView("agenda")}
          >
            <CalendarClock size={18} />
            <span className="nav-label">{tx(language, "Agendamentos", "Schedule")}</span>
            <span>{sidebarScheduledCount}</span>
          </button>
          <button
            className={clsx(activeView === "conexoes" && "active")}
            type="button"
            onClick={() => setActiveView("conexoes")}
          >
            <Plug size={18} />
            <span className="nav-label">{tx(language, "Conexões", "Connections")}</span>
            <span>{socialAccounts.length}</span>
          </button>
          <button
            className={clsx(activeView === "uso" && "active")}
            type="button"
            onClick={() => setActiveView("uso")}
          >
            <BarChart3 size={18} />
            <span className="nav-label">{tx(language, "Uso e créditos", "Usage and credits")}</span>
          </button>
          <button
            className={clsx(activeView === "perfil" && "active")}
            type="button"
            onClick={() => setActiveView("perfil")}
          >
            <User size={18} />
            <span className="nav-label">{tx(language, "Perfil", "Profile")}</span>
          </button>
        </nav>

        <button
          className="language-toggle"
          type="button"
          onClick={() => {
            const nextLanguage = language === "en" ? "pt" : "en";
            window.localStorage.setItem("autonomy.language", nextLanguage);
            setLanguage(nextLanguage);
          }}
        >
          {language === "en" ? "Português" : "English"}
        </button>

        <button className="signout-button" type="button" onClick={signOut}>
          <LogOut size={18} />
          {tx(language, "Sair", "Sign out")}
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
                <h1 className="form-title">
                  {tx(language, "Gere seu post", "Generate your post")}
                </h1>
              </div>

          <div className="mode-switch" aria-label={tx(language, "Modo de geração", "Generation mode")}>
            <button
              className={clsx(mode === "criativo" && "active")}
              type="button"
              onClick={() => setMode("criativo")}
            >
              <Sparkles size={17} />
              {tx(language, "Criativo", "Creative")}
            </button>
            <button
              className={clsx(mode === "contextual" && "active")}
              type="button"
              onClick={() => setMode("contextual")}
            >
              <ImagePlus size={17} />
              {tx(language, "Contextual", "Contextual")}
            </button>
          </div>

          <form onSubmit={onSubmit} className="form-stack">
            <label>
              <span>{tx(language, "Nicho", "Niche")}</span>
              <input
                value={niche}
                onChange={(event) => setNiche(event.target.value)}
                placeholder={tx(language, "Ex: Nutricionista, imobiliária, academia", "Ex: Nutritionist, real estate, fitness studio")}
              />
            </label>

            <label>
              <span>{tx(language, "Tema", "Topic")}</span>
              <input
                value={theme}
                onChange={(event) => setTheme(event.target.value)}
                placeholder={tx(language, "Ex: Como atrair clientes no Instagram", "Ex: How to attract clients on Instagram")}
              />
            </label>

            {mode === "criativo" && (
              <>
                <div className="field-group">
                  <span>{tx(language, "Formato visual", "Visual format")}</span>
                  <div className="choice-grid" aria-label={tx(language, "Formato visual", "Visual format")}>
                    <button
                      className={clsx(visualFormat === "imagem_unica" && "active")}
                      type="button"
                      onClick={() => setVisualFormat("imagem_unica")}
                    >
                      {tx(language, "Imagem única", "Single image")}
                    </button>
                    <button
                      className={clsx(visualFormat === "carrossel" && "active")}
                      type="button"
                      onClick={() => setVisualFormat("carrossel")}
                    >
                      {tx(language, "Carrossel", "Carousel")}
                    </button>
                  </div>
                </div>

                {visualFormat === "imagem_unica" ? (
                  <label>
                    <span>{tx(language, "Detalhes da imagem", "Image details")}</span>
                    <textarea
                      value={singleImageDetail}
                      onChange={(event) => setSingleImageDetail(event.target.value)}
                      placeholder={tx(
                        language,
                        "Descreva exatamente o que deve aparecer: pessoa, objeto, ambiente, cores, enquadramento e clima.",
                        "Describe exactly what should appear: person, object, setting, colors, framing, and mood."
                      )}
                      rows={4}
                    />
                  </label>
                ) : (
                  <div className="form-stack nested-stack">
                    <div className="field-group">
                      <span>{tx(language, "Quantidade de imagens", "Number of images")}</span>
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
                        {tx(
                          language,
                          "Para texto no slide, escreva a frase final entre aspas.",
                          "For slide text, write the final phrase in quotation marks."
                        )}
                      </p>
                    </div>

                    {Array.from({ length: carouselCount }, (_, index) => (
                      <label key={index}>
                        <span>{tx(language, "Imagem", "Image")} {index + 1}</span>
                        <textarea
                          value={carouselDetails[index] || ""}
                          onChange={(event) =>
                            updateCarouselDetail(index, event.target.value)
                          }
                          placeholder={tx(
                            language,
                            `Descreva exatamente a imagem ${index + 1}. Se quiser texto, escreva o texto final entre aspas.`,
                            `Describe image ${index + 1} exactly. If you want text, write the final text in quotation marks.`
                          )}
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
                  <span>{tx(language, "Contexto da campanha", "Campaign context")}</span>
                  <textarea
                    value={context}
                    onChange={(event) => setContext(event.target.value)}
                    placeholder={tx(language, "Explique a promessa, oferta ou ponto que precisa aparecer no post.", "Explain the promise, offer, or key point that must appear in the post.")}
                    rows={4}
                  />
                </label>

                <div className="upload-box">
                  <div className="upload-preview">
                    {imagePreview ? (
                      <img src={imagePreview} alt={tx(language, "Preview da imagem enviada", "Uploaded image preview")} />
                    ) : (
                      <UploadCloud size={28} />
                    )}
                  </div>
                  <label className="file-trigger">
                    <span>{tx(language, "Enviar imagem", "Upload image")}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => onImageChange(event.target.files?.[0])}
                    />
                  </label>
                </div>

                <label>
                  <span>{tx(language, "Análise da imagem", "Image analysis")}</span>
                  <textarea
                    value={imageAnalysis}
                    onChange={(event) => setImageAnalysis(event.target.value)}
                    placeholder={tx(
                      language,
                      "Descreva a imagem. Em produção, este campo pode ser preenchido automaticamente por visão.",
                      "Describe the image. In production, this field can be filled automatically by vision analysis."
                    )}
                    rows={4}
                  />
                </label>
              </>
            )}

            {error && <p className="error-message">{error}</p>}

            <div className="credit-cost-card" aria-live="polite">
              <span>{tx(language, "Você vai usar:", "You will use:")}</span>
              <strong>
                {tx(
                  language,
                  `${generationCreditCost} ${generationCreditCost === 1 ? "crédito" : "créditos"}`,
                  `${generationCreditCost} ${generationCreditCost === 1 ? "credit" : "credits"}`
                )}
              </strong>
            </div>

            <div className="button-row">
              <button className="secondary-button" type="button" onClick={fillExample}>
                {tx(language, "Exemplo", "Example")}
              </button>
              <button className="primary-button" type="submit" disabled={isLoading}>
                <ArrowRight size={18} />
                {tx(language, "Gerar posts completos", "Generate complete posts")}
              </button>
            </div>
          </form>
            </aside>

            <section className="results-area">
          <div className="topbar">
            <div>
                  <p className="eyebrow">{tx(language, "Saída estruturada", "Structured output")}</p>
              <h2>{tx(language, "Confira seu post gerado", "Review your generated post")}</h2>
            </div>
          </div>

          {scheduleError && <p className="error-message">{scheduleError}</p>}
          {scheduleMessage && <p className="success-message">{scheduleMessage}</p>}
          {result && isScheduleModalOpen && (
            <ScheduleModal
              accounts={socialAccounts}
              dateTime={scheduleDateTime}
              language={language}
              isSubmitting={isScheduling}
              onClose={() => setIsScheduleModalOpen(false)}
              onConfirm={(socialAccountId, dateTime) =>
                scheduleCurrentPost(socialAccountId, dateTime)
              }
              post={result.post}
              selectedAccountId={selectedSocialAccountId}
            />
          )}
          {result && isPublishNowModalOpen && (
            <PublishNowModal
              accounts={socialAccounts}
              language={language}
              isSubmitting={isPublishingNow}
              onClose={() => setIsPublishNowModalOpen(false)}
              onConfirm={publishCurrentPostNow}
              post={result.post}
              selectedAccountId={selectedSocialAccountId}
            />
          )}

          {isLoading ? (
            <LoadingPostState language={language} />
          ) : result ? (
            <div className="cards-grid single-card">
              <PostCard
                hideBuiltInActions
                editable
                label={tx(language, "Post gerado", "Generated post")}
                option={result.post}
                language={language}
                onChange={updateGeneratedPost}
                extraActions={
                  <div className="generated-post-actions">
                    <button
                      className="schedule-button"
                      type="button"
                      onClick={() => setIsScheduleModalOpen(true)}
                      disabled={isScheduling || isPublishingNow || !result}
                    >
                      <CalendarClock size={16} />
                      {tx(language, "Agendar", "Schedule")}
                    </button>
                    <button
                      className="schedule-button now"
                      type="button"
                      onClick={() => setIsPublishNowModalOpen(true)}
                      disabled={isScheduling || isPublishingNow || !result}
                    >
                      <Send size={16} />
                      {isPublishingNow
                        ? tx(language, "Postando", "Publishing")
                        : tx(language, "Postar agora", "Publish now")}
                    </button>
                    <button
                      className="discard-icon-button"
                      type="button"
                      onClick={discardCurrentPost}
                      disabled={!result || isLoading}
                      aria-label={tx(language, "Descartar post", "Discard post")}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                }
              />
              {(hasGeneratedPostChanges || generatedSaveMessage) && (
                <div className="post-edit-actions generated-edit-actions" role="status">
                  <span>
                    {generatedSaveMessage ||
                      tx(
                        language,
                        "Você editou este post. Salve para atualizar a biblioteca, agendamento e publicação.",
                        "You edited this post. Save to update the library, schedule, and publishing."
                      )}
                  </span>
                  {hasGeneratedPostChanges && (
                    <div>
                      <button
                        type="button"
                        onClick={discardGeneratedPostChanges}
                        disabled={isSavingGeneratedPost}
                      >
                        {tx(language, "Descartar alterações", "Discard changes")}
                      </button>
                      <button
                        className="primary"
                        type="button"
                        onClick={saveGeneratedPostChanges}
                        disabled={isSavingGeneratedPost}
                      >
                        {isSavingGeneratedPost
                          ? tx(language, "Salvando", "Saving")
                          : tx(language, "Salvar alterações", "Save changes")}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <Sparkles size={30} />
              </div>
              <h3>{tx(language, "Seu post completo aparece aqui.", "Your complete post appears here.")}</h3>
              <p>
                {tx(
                  language,
                  "Preencha o briefing e receba imagem, descrição, hashtags e direção visual em uma única geração econômica.",
                  "Fill out the brief and receive the image, caption, hashtags, and visual direction in one efficient generation."
                )}
              </p>
            </div>
          )}
            </section>
          </section>
        )}

        {activeView === "biblioteca" && (
          <DashboardSection
            eyebrow={tx(language, "Biblioteca", "Library")}
            title={tx(language, "Meus posts salvos", "My saved posts")}
          >
            <SavedPostsLibrary
              error={libraryError}
              language={language}
              onFavorite={toggleSavedPostFavorite}
              onPublishNow={publishSavedPostNow}
              onSchedule={scheduleSavedPost}
              onUpdate={updateSavedPostContent}
              posts={savedPosts}
              socialAccounts={socialAccounts}
              onDelete={deleteSavedPost}
            />
          </DashboardSection>
        )}

        {activeView === "agenda" && (
          <DashboardSection
            eyebrow={tx(language, "Calendário", "Calendar")}
            title={tx(language, "Posts agendados", "Scheduled posts")}
          >
            <ScheduledPostsPanel
              accounts={socialAccounts}
              language={language}
              posts={scheduledPosts}
              onCancel={cancelSchedule}
            />
          </DashboardSection>
        )}

        {activeView === "conexoes" && (
          <DashboardSection eyebrow={tx(language, "Canais", "Channels")} title="Instagram">
            <SocialAccountsPanel
              accounts={socialAccounts}
              error={scheduleError}
              language={language}
              onConnect={connectInstagram}
              onDisconnect={removeSocialAccount}
            />
          </DashboardSection>
        )}

        {activeView === "uso" && (
          <UsagePanel
            creditLimit={creditLimit}
            language={language}
            remainingCredits={remainingCredits}
            savedPosts={savedPosts}
            usedCredits={usedCredits}
            usagePercent={usagePercent}
          />
        )}

        {activeView === "perfil" && (
          <ProfilePanel language={language} planName={activePlan.name} profile={profile} />
        )}
      </section>
    </main>
  );
}

function SavedPostsLibrary({
  error,
  language,
  onDelete,
  onFavorite,
  onPublishNow,
  onSchedule,
  onUpdate,
  socialAccounts,
  posts
}: {
  error: string | null;
  language: Language;
  onDelete: (id: string) => void | Promise<void>;
  onFavorite: (id: string, isFavorite: boolean) => void | Promise<void>;
  onPublishNow: (post: SavedPost, socialAccountId: string) => void | Promise<void>;
  onSchedule: (
    post: SavedPost,
    socialAccountId: string,
    dateTime: string
  ) => void | Promise<void>;
  onUpdate: (id: string, nextPost: GeneratedPost["post"]) => void | Promise<void>;
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
        <h3>{tx(language, "Biblioteca indisponível.", "Library unavailable.")}</h3>
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
        <h3>{tx(language, "Nenhum post gerado ainda.", "No posts generated yet.")}</h3>
        <p>{tx(language, "Todo post gerado aparece aqui automaticamente.", "Every generated post appears here automatically.")}</p>
      </div>
    );
  }

  return (
    <div className="library-stack">
      <div className="library-filter-bar" aria-label={tx(language, "Filtro da biblioteca", "Library filter")}>
        <button
          className={clsx(libraryFilter === "todos" && "active")}
          type="button"
          onClick={() => setLibraryFilter("todos")}
        >
          <Library size={16} />
          {tx(language, "Todos", "All")}
          <span>{posts.length}</span>
        </button>
        <button
          className={clsx(libraryFilter === "favoritos" && "active")}
          type="button"
          onClick={() => setLibraryFilter("favoritos")}
        >
          <Star size={16} />
          {tx(language, "Favoritos", "Favorites")}
          <span>{favoritePosts.length}</span>
        </button>
      </div>

      {visiblePosts.length === 0 ? (
        <div className="empty-state compact-empty">
          <div className="empty-icon">
            <Star size={30} />
          </div>
          <h3>{tx(language, "Nenhum favorito ainda.", "No favorites yet.")}</h3>
          <p>Marque posts com estrela para encontrá-los mais rapido aqui.</p>
        </div>
      ) : (
        <div className="library-list">
          {visiblePosts.map((savedPost) => (
            <div className="library-item" key={savedPost.id}>
              <LibraryPostPreview
                onDelete={() => onDelete(savedPost.id)}
                onFavorite={() => onFavorite(savedPost.id, !savedPost.isFavorite)}
                onUpdate={onUpdate}
                language={language}
                post={savedPost}
              />
              <SavedPostScheduler
                language={language}
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
  language,
  onDelete,
  onFavorite,
  onUpdate,
  post
}: {
  language: Language;
  onDelete: () => void | Promise<void>;
  onFavorite: () => void | Promise<void>;
  onUpdate: (id: string, nextPost: GeneratedPost["post"]) => void | Promise<void>;
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
              aria-label={post.isFavorite ? tx(language, "Remover dos favoritos", "Remove from favorites") : tx(language, "Favoritar", "Add to favorites")}
            >
              <Star size={17} fill={post.isFavorite ? "currentColor" : "none"} />
            </button>
            <button
              className="icon-remove"
              type="button"
              onClick={onDelete}
              aria-label={tx(language, "Remover post", "Remove post")}
            >
              <Trash2 size={17} />
            </button>
          </div>
        </div>

        <button
          className="library-media-preview"
          type="button"
          onClick={() => setIsDetailOpen(true)}
          aria-label={tx(language, "Ver post completo", "View complete post")}
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
            {tx(language, "Ver post", "View post")}
          </span>
        </button>
      </div>

      {isDetailOpen && (
        <PostDetailModal
          onClose={() => setIsDetailOpen(false)}
          onSave={onUpdate}
          language={language}
          post={post}
        />
      )}
    </>
  );
}

function PostDetailModal({
  language,
  onClose,
  onSave,
  post
}: {
  language: Language;
  onClose: () => void;
  onSave: (id: string, nextPost: GeneratedPost["post"]) => void | Promise<void>;
  post: SavedPost;
}) {
  const [draftPost, setDraftPost] = useState(post.post);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const hasChanges = getPostOptionSignature(draftPost) !== getPostOptionSignature(post.post);

  useEffect(() => {
    setDraftPost(post.post);
  }, [post.post]);

  async function saveChanges() {
    if (!hasChanges || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await onSave(post.id, draftPost);
      setSaveMessage(tx(language, "Alterações salvas.", "Changes saved."));
    } catch {
      setSaveMessage(tx(language, "Não foi possível salvar as alterações.", "Could not save changes."));
    } finally {
      setIsSaving(false);
    }
  }

  function discardChanges() {
    setDraftPost(post.post);
    setSaveMessage(null);
  }

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
            <p className="eyebrow">{tx(language, "Post salvo", "Saved post")}</p>
            <h3>{tx(language, "Post completo", "Complete post")}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label={tx(language, "Fechar", "Close")}>
            X
          </button>
        </div>
        <PostCard
          editable
          language={language}
          label={tx(language, "Post completo", "Complete post")}
          option={draftPost}
          onChange={setDraftPost}
        />
        {(hasChanges || saveMessage) && (
          <div className="post-edit-actions" role="status">
            <span>
              {saveMessage ||
                tx(
                  language,
                  "Você editou este post. Salve para atualizar biblioteca, agenda e publicação.",
                  "You edited this post. Save to update the library, schedule, and publishing."
                )}
            </span>
            {hasChanges && (
              <div>
                <button type="button" onClick={discardChanges} disabled={isSaving}>
                  {tx(language, "Descartar alterações", "Discard changes")}
                </button>
                <button className="primary" type="button" onClick={saveChanges} disabled={isSaving}>
                  {isSaving
                    ? tx(language, "Salvando", "Saving")
                    : tx(language, "Salvar alterações", "Save changes")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SavedPostScheduler({
  language,
  onPublishNow,
  onSchedule,
  post,
  socialAccounts
}: {
  language: Language;
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
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isSchedulingPost, setIsSchedulingPost] = useState(false);
  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setSocialAccountId((current) => current || socialAccounts[0]?.id || "");
  }, [socialAccounts]);

  async function schedule(nextSocialAccountId: string, nextDateTime: string) {
    if (isSchedulingPost) {
      return;
    }

    setMessage(null);

    if (!nextSocialAccountId) {
      setMessage(tx(language, "Conecte uma conta do Instagram.", "Connect an Instagram account."));
      return;
    }

    if (!nextDateTime) {
      setMessage(tx(language, "Escolha data e horário.", "Choose a date and time."));
      return;
    }

    setIsSchedulingPost(true);

    try {
      setSocialAccountId(nextSocialAccountId);
      setDateTime(nextDateTime);
      await onSchedule(post, nextSocialAccountId, nextDateTime);
      setIsModalOpen(false);
    } finally {
      setIsSchedulingPost(false);
    }
  }

  async function publishNow(nextSocialAccountId: string) {
    if (isPublishingPost) {
      return;
    }

    setMessage(null);

    if (!nextSocialAccountId) {
      setMessage(tx(language, "Conecte uma conta do Instagram.", "Connect an Instagram account."));
      return;
    }

    setIsPublishingPost(true);

    try {
      setSocialAccountId(nextSocialAccountId);
      await onPublishNow(post, nextSocialAccountId);
      setIsPublishModalOpen(false);
    } finally {
      setIsPublishingPost(false);
    }
  }

  return (
    <div className="saved-post-scheduler">
      <div className="saved-post-scheduler-actions">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={isSchedulingPost || isPublishingPost}
        >
          <CalendarClock size={16} />
          {tx(language, "Agendar", "Schedule")}
        </button>
        <button
          className="now"
          type="button"
          onClick={() => setIsPublishModalOpen(true)}
          disabled={isSchedulingPost || isPublishingPost}
        >
          <Send size={16} />
          {isPublishingPost ? tx(language, "Publicando", "Publishing") : tx(language, "Publicar agora", "Publish now")}
        </button>
      </div>
      {message && <span>{message}</span>}
      {isModalOpen && (
        <ScheduleModal
          accounts={socialAccounts}
          dateTime={dateTime}
          language={language}
          isSubmitting={isSchedulingPost}
          onClose={() => setIsModalOpen(false)}
          onConfirm={schedule}
          post={post.post}
          selectedAccountId={socialAccountId}
        />
      )}
      {isPublishModalOpen && (
        <PublishNowModal
          accounts={socialAccounts}
          language={language}
          isSubmitting={isPublishingPost}
          onClose={() => setIsPublishModalOpen(false)}
          onConfirm={publishNow}
          post={post.post}
          selectedAccountId={socialAccountId}
        />
      )}
    </div>
  );
}

function ScheduleModal({
  accounts,
  dateTime,
  language,
  isSubmitting = false,
  onClose,
  onConfirm,
  post,
  selectedAccountId
}: {
  accounts: SocialAccount[];
  dateTime: string;
  language: Language;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (socialAccountId: string, dateTime: string) => void | Promise<void>;
  post: GeneratedPost["post"];
  selectedAccountId: string;
}) {
  const [localAccountId, setLocalAccountId] = useState(
    selectedAccountId || accounts[0]?.id || ""
  );
  const [localDateTime, setLocalDateTime] = useState(dateTime);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isLocallySubmitting, setIsLocallySubmitting] = useState(false);
  const isConfirming = isSubmitting || isLocallySubmitting;
  const selectedAccount = accounts.find((account) => account.id === localAccountId) || null;

  useEffect(() => {
    setLocalAccountId((current) => {
      if (current && accounts.some((account) => account.id === current)) {
        return current;
      }

      return selectedAccountId || accounts[0]?.id || "";
    });
  }, [accounts, selectedAccountId]);

  function reviewSchedule() {
    if (isConfirming) {
      return;
    }

    setLocalError(null);

    if (!localAccountId) {
      setLocalError(tx(language, "Selecione uma conta do Instagram.", "Select an Instagram account."));
      return;
    }

    if (!localDateTime) {
      setLocalError(tx(language, "Escolha data e horário para publicar.", "Choose a publishing date and time."));
      return;
    }

    setIsReviewing(true);
  }

  async function confirmSchedule() {
    if (isConfirming) {
      return;
    }

    setLocalError(null);

    if (!localAccountId) {
      setLocalError(tx(language, "Selecione uma conta do Instagram.", "Select an Instagram account."));
      return;
    }

    if (!localDateTime) {
      setLocalError(tx(language, "Escolha data e horário para publicar.", "Choose a publishing date and time."));
      return;
    }

    setIsLocallySubmitting(true);

    try {
      await onConfirm(localAccountId, localDateTime);
    } catch (caughtError) {
      setLocalError(
        caughtError instanceof Error
          ? caughtError.message
          : tx(language, "Não foi possível confirmar o agendamento.", "Could not confirm the scheduled post.")
      );
    } finally {
      setIsLocallySubmitting(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={isConfirming ? undefined : onClose}
    >
      <div
        aria-modal="true"
        className="schedule-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="schedule-modal-header">
          <div>
            <p className="eyebrow">{tx(language, "Agendamento", "Scheduling")}</p>
            <h3>
              {isReviewing
                ? tx(language, "Confirmar agendamento", "Confirm schedule")
                : tx(language, "Programar post", "Schedule post")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tx(language, "Fechar", "Close")}
            disabled={isConfirming}
          >
            X
          </button>
        </div>

        {isReviewing && (
          <PostPublishSummary
            account={selectedAccount}
            dateTime={localDateTime}
            language={language}
            mode="schedule"
            post={post}
          />
        )}

        {!isReviewing && (
        <div className="schedule-modal-fields">
          <label>
            <span>{tx(language, "Conta do Instagram", "Instagram account")}</span>
            <select
              value={localAccountId}
              onChange={(event) => setLocalAccountId(event.target.value)}
              disabled={accounts.length === 0 || isConfirming}
            >
              <option value="">
                {accounts.length === 0
                  ? tx(language, "Nenhuma conta conectada", "No connected account")
                  : tx(language, "Selecione uma conta", "Select an account")}
              </option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  @{account.instagram_username || account.page_name || "instagram"}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{tx(language, "Data e horário", "Date and time")}</span>
            <input
              type="datetime-local"
              value={localDateTime}
              onChange={(event) => setLocalDateTime(event.target.value)}
              disabled={isConfirming}
            />
          </label>
        </div>

        )}

        {localError && <p className="error-message">{localError}</p>}

        <div className="schedule-modal-actions">
          <button
            className="modal-cancel-button"
            type="button"
            onClick={isReviewing ? () => setIsReviewing(false) : onClose}
            disabled={isConfirming}
          >
            {isReviewing
              ? tx(language, "Voltar", "Back")
              : tx(language, "Cancelar", "Cancel")}
          </button>
          {isReviewing && (
            <button
              className="modal-discard-button"
              type="button"
              onClick={onClose}
              disabled={isConfirming}
            >
              {tx(language, "Descartar", "Discard")}
            </button>
          )}
          <button
            className="schedule-button"
            type="button"
            onClick={isReviewing ? confirmSchedule : reviewSchedule}
            disabled={isConfirming}
          >
            <CalendarClock size={16} />
            {isReviewing
              ? isConfirming
                ? tx(language, "Agendando...", "Scheduling...")
                : tx(language, "Confirmar", "Confirm")
              : tx(language, "Revisar agendamento", "Review schedule")}
          </button>
        </div>
      </div>
    </div>
  );
}

function PublishNowModal({
  accounts,
  language,
  isSubmitting = false,
  onClose,
  onConfirm,
  post,
  selectedAccountId
}: {
  accounts: SocialAccount[];
  language: Language;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (socialAccountId: string) => void | Promise<void>;
  post: GeneratedPost["post"];
  selectedAccountId: string;
}) {
  const [localAccountId, setLocalAccountId] = useState(
    selectedAccountId || accounts[0]?.id || ""
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isLocallySubmitting, setIsLocallySubmitting] = useState(false);
  const isConfirming = isSubmitting || isLocallySubmitting;
  const selectedAccount = accounts.find((account) => account.id === localAccountId) || null;

  useEffect(() => {
    setLocalAccountId((current) => {
      if (current && accounts.some((account) => account.id === current)) {
        return current;
      }

      return selectedAccountId || accounts[0]?.id || "";
    });
  }, [accounts, selectedAccountId]);

  function reviewPublish() {
    if (isConfirming) {
      return;
    }

    setLocalError(null);

    if (!localAccountId) {
      setLocalError(tx(language, "Selecione uma conta do Instagram.", "Select an Instagram account."));
      return;
    }

    setIsReviewing(true);
  }

  async function confirmPublish() {
    if (isConfirming) {
      return;
    }

    setLocalError(null);
    setIsLocallySubmitting(true);

    try {
      await onConfirm(localAccountId);
    } catch (caughtError) {
      setLocalError(
        caughtError instanceof Error
          ? caughtError.message
          : tx(language, "Não foi possível publicar agora.", "Could not publish now.")
      );
    } finally {
      setIsLocallySubmitting(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={isConfirming ? undefined : onClose}
    >
      <div
        aria-modal="true"
        className="schedule-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="schedule-modal-header">
          <div>
            <p className="eyebrow">{tx(language, "Publicação", "Publishing")}</p>
            <h3>
              {isReviewing
                ? tx(language, "Confirmar publicação", "Confirm publishing")
                : tx(language, "Postar agora", "Publish now")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tx(language, "Fechar", "Close")}
            disabled={isConfirming}
          >
            X
          </button>
        </div>

        {isReviewing ? (
          <PostPublishSummary
            account={selectedAccount}
            language={language}
            mode="now"
            post={post}
          />
        ) : (
          <div className="schedule-modal-fields">
            <label>
              <span>{tx(language, "Conta do Instagram", "Instagram account")}</span>
              <select
                value={localAccountId}
                onChange={(event) => setLocalAccountId(event.target.value)}
                disabled={accounts.length === 0 || isConfirming}
              >
                <option value="">
                  {accounts.length === 0
                    ? tx(language, "Nenhuma conta conectada", "No connected account")
                    : tx(language, "Selecione uma conta", "Select an account")}
                </option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    @{account.instagram_username || account.page_name || "instagram"}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {localError && <p className="error-message">{localError}</p>}

        <div className="schedule-modal-actions">
          <button
            className="modal-cancel-button"
            type="button"
            onClick={isReviewing ? () => setIsReviewing(false) : onClose}
            disabled={isConfirming}
          >
            {isReviewing
              ? tx(language, "Voltar", "Back")
              : tx(language, "Cancelar", "Cancel")}
          </button>
          {isReviewing && (
            <button
              className="modal-discard-button"
              type="button"
              onClick={onClose}
              disabled={isConfirming}
            >
              {tx(language, "Descartar", "Discard")}
            </button>
          )}
          <button
            className="schedule-button now"
            type="button"
            onClick={isReviewing ? confirmPublish : reviewPublish}
            disabled={isConfirming}
          >
            <Send size={16} />
            {isReviewing
              ? isConfirming
                ? tx(language, "Publicando...", "Publishing...")
                : tx(language, "Confirmar", "Confirm")
              : tx(language, "Revisar publicação", "Review publishing")}
          </button>
        </div>
      </div>
    </div>
  );
}

function PostPublishSummary({
  account,
  dateTime,
  language,
  mode,
  post
}: {
  account: SocialAccount | null;
  dateTime?: string;
  language: Language;
  mode: "now" | "schedule";
  post: GeneratedPost["post"];
}) {
  const images = getPostImages(post);
  const accountLabel = account
    ? `@${account.instagram_username || account.page_name || "instagram"}`
    : tx(language, "Conta não selecionada", "No account selected");
  const captionPreview = formatCaptionWithHashtags(post.caption, post.hashtags);
  const dateLabel = dateTime
    ? formatDateTime(new Date(dateTime).toISOString(), language)
    : "";

  return (
    <div className="publish-confirmation">
      <div className="publish-confirmation-grid">
        <InfoRow
          label={tx(language, "Ação", "Action")}
          value={mode === "now" ? tx(language, "Publicar agora", "Publish now") : tx(language, "Agendar post", "Schedule post")}
        />
        <InfoRow label={tx(language, "Conta", "Account")} value={accountLabel} />
        {mode === "schedule" && dateLabel && (
          <InfoRow label={tx(language, "Data e horário", "Date and time")} value={dateLabel} />
        )}
        <InfoRow label={tx(language, "Imagens", "Images")} value={String(images.length)} />
      </div>
      <div className="publish-caption-preview">
        <span>{tx(language, "Descrição", "Caption")}</span>
        <p>{captionPreview}</p>
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
  language,
  onConnect,
  onDisconnect
}: {
  accounts: SocialAccount[];
  error: string | null;
  language: Language;
  onConnect: () => void | Promise<void>;
  onDisconnect: (id: string) => void | Promise<void>;
}) {
  return (
    <div className="social-panel">
      <div className="integration-header">
        <div>
          <h3>{tx(language, "Contas do Instagram", "Instagram accounts")}</h3>
          <p>
            {tx(
              language,
              "Conecte uma conta Business ou Creator do Instagram para publicar ou agendar publicações automaticamente.",
              "Connect an Instagram Business or Creator account to publish or schedule posts automatically."
            )}
          </p>
        </div>
        <button className="primary-button" type="button" onClick={onConnect}>
          <Plug size={18} />
          {tx(language, "Conectar Instagram", "Connect Instagram")}
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      {accounts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Plug size={30} />
          </div>
          <h3>{tx(language, "Nenhuma conta conectada.", "No connected account.")}</h3>
          <p>{tx(language, "Depois de conectar, você poderá agendar posts direto do dashboard.", "After connecting, you can schedule posts directly from the dashboard.")}</p>
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
                    : account.page_name || tx(language, "Conta conectada", "Connected account")}
                </span>
              </div>
              <span className="status-pill">{account.status}</span>
              <button type="button" onClick={() => onDisconnect(account.id)}>
                {tx(language, "Desconectar", "Disconnect")}
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
  language,
  onCancel,
  posts
}: {
  accounts: SocialAccount[];
  language: Language;
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
        <h3>{tx(language, "Nenhuma conta conectada.", "No connected account.")}</h3>
        <p>{tx(language, "Conecte uma conta do Instagram para organizar seus agendamentos.", "Connect an Instagram account to manage your schedule.")}</p>
      </div>
    );
  }

  return (
    <div className="schedule-panel">
      <div className="account-tabs" aria-label={tx(language, "Contas do Instagram", "Instagram accounts")}>
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

      <div className="schedule-status-tabs" aria-label={tx(language, "Status dos posts", "Post status")}>
        <button
          className={clsx(activeStatusTab === "agendados" && "active")}
          type="button"
          onClick={() => setActiveStatusTab("agendados")}
        >
          {tx(language, "Agendados", "Scheduled")}
          <span>{scheduledCount}</span>
        </button>
        <button
          className={clsx(activeStatusTab === "publicados" && "active")}
          type="button"
          onClick={() => setActiveStatusTab("publicados")}
        >
          {tx(language, "Publicados", "Published")}
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
              ? tx(language, "Nenhum post agendado nesta conta.", "No scheduled posts for this account.")
              : tx(language, "Nenhum post publicado nesta conta.", "No published posts for this account.")}
          </h3>
          <p>{tx(language, "Os posts desta conta aparecem aqui conforme o status.", "Posts for this account appear here based on their status.")}</p>
        </div>
      ) : (
        <div className="schedule-list">
          {visiblePosts.map((post) => (
            <ScheduledPostCard
              key={post.id}
              language={language}
              post={post}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduledPostCard({
  language,
  onCancel,
  post
}: {
  language: Language;
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
            <h3>{formatDateTime(post.scheduled_for, language)}</h3>
          </div>
          <span className={clsx("status-pill", post.status)}>
            {getScheduleStatusLabel(post.status, language)}
          </span>
        </div>

        <button
          className="library-media-preview"
          type="button"
          onClick={() => setIsDetailOpen(true)}
          aria-label={tx(language, "Ver post agendado", "View scheduled post")}
        >
          {previewImage ? (
            <img src={previewImage} alt={tx(language, "Mídia do post agendado", "Scheduled post media")} />
          ) : (
            <span>{tx(language, "Post agendado", "Scheduled post")}</span>
          )}
          {post.media_urls.length > 1 && (
            <span className="library-carousel-count">
              1/{post.media_urls.length}
            </span>
          )}
          <span className="view-post-button">
            <Eye size={15} />
            {tx(language, "Ver post", "View post")}
          </span>
        </button>

        <div className="schedule-card-footer">
          {post.error_message && <span>{post.error_message}</span>}
          {post.status === "pending" && (
            <button type="button" onClick={() => onCancel(post.id)}>
              {tx(language, "Cancelar", "Cancel")}
            </button>
          )}
        </div>
      </article>

      {isDetailOpen && (
        <ScheduledPostDetailModal
          onClose={() => setIsDetailOpen(false)}
          language={language}
          post={post}
        />
      )}
    </>
  );
}

function ScheduledPostDetailModal({
  language,
  onClose,
  post
}: {
  language: Language;
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
            <h3>{formatDateTime(post.scheduled_for, language)}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label={tx(language, "Fechar", "Close")}>
            X
          </button>
        </div>

        <div className="scheduled-detail-content">
          <div className="scheduled-detail-media">
            {post.media_urls.map((image, index) => (
              <img
                key={`${post.id}-${index}`}
                src={image}
                alt={tx(language, `Mídia ${index + 1} do post agendado`, `Scheduled post media ${index + 1}`)}
              />
            ))}
          </div>
          <div className="card-section">
            <h3>{tx(language, "Descrição", "Caption")}</h3>
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
  const visiblePosts = getVisibleScheduledPosts(posts);

  accounts.forEach((account) => {
    accountMap.set(account.id, {
      count: 0,
      id: account.id,
      label: account.instagram_username || account.page_name || "instagram"
    });
  });

  visiblePosts.forEach((post) => {
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

function getVisibleScheduledPosts(posts: ScheduledPost[]) {
  return posts.filter((post) =>
    post.status === "pending" ||
    post.status === "publishing" ||
    post.status === "published"
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
    <div className="language-cards compact" aria-label="Idioma">
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

function getGenerationCreditCost({
  carouselCount,
  mode,
  visualFormat
}: {
  carouselCount: number;
  mode: Mode;
  visualFormat: VisualFormat;
}) {
  if (mode === "criativo" && visualFormat === "carrossel") {
    return simplePostCreditCost + Math.max(carouselCount - 1, 0);
  }

  return simplePostCreditCost;
}

function UsagePanel({
  creditLimit,
  language,
  remainingCredits,
  savedPosts,
  usedCredits,
  usagePercent
}: {
  creditLimit: number;
  language: Language;
  remainingCredits: number;
  savedPosts: SavedPost[];
  usedCredits: number;
  usagePercent: number;
}) {
  return (
    <DashboardSection
      eyebrow={tx(language, "Uso", "Usage")}
      title={tx(language, "Créditos e consumo", "Credits and usage")}
    >
      <div className="metrics-grid">
        <div className="metric-card">
          <span>{tx(language, "Créditos totais", "Total credits")}</span>
          <strong>{creditLimit}</strong>
        </div>
        <div className="metric-card">
          <span>{tx(language, "Usados", "Used")}</span>
          <strong>{usedCredits}</strong>
        </div>
        <div className="metric-card">
          <span>{tx(language, "Restantes", "Remaining")}</span>
          <strong>{remainingCredits}</strong>
        </div>
      </div>

      <div className="usage-panel">
        <div className="usage-panel-header">
          <div>
            <p className="eyebrow">{tx(language, "Progresso mensal", "Monthly progress")}</p>
            <h3>{tx(language, `${usagePercent}% dos créditos usados`, `${usagePercent}% of credits used`)}</h3>
          </div>
          <strong>
            {usedCredits}/{creditLimit}
          </strong>
        </div>
        <div className="usage-bar large">
          <span style={{ width: `${usagePercent}%` }} />
        </div>
        <p>{tx(language, "O consumo é registrado no servidor a cada geração concluída.", "Usage is recorded on the server after each completed generation.")}</p>
      </div>

      <div className="usage-panel">
        <div className="usage-panel-header">
          <div>
            <p className="eyebrow">{tx(language, "Atividade", "Activity")}</p>
            <h3>{tx(language, `${savedPosts.length} posts salvos`, `${savedPosts.length} saved posts`)}</h3>
          </div>
        </div>
      </div>
    </DashboardSection>
  );
}

function formatDateTime(value: string, language: Language = "pt") {
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function getScheduleStatusLabel(status: ScheduledPost["status"], language: Language = "pt") {
  const labels = {
    canceled: tx(language, "Cancelado", "Canceled"),
    failed: tx(language, "Falhou", "Failed"),
    pending: tx(language, "Agendado", "Scheduled"),
    published: tx(language, "Publicado", "Published"),
    publishing: tx(language, "Publicando", "Publishing")
  };

  return labels[status];
}

function ProfilePanel({
  language,
  planName,
  profile
}: {
  language: Language;
  planName: string;
  profile: DashboardProfile;
}) {
  return (
    <DashboardSection
      eyebrow={tx(language, "Perfil", "Profile")}
      title={tx(language, "Dados da conta", "Account details")}
    >
      <div className="profile-grid">
        <div className="profile-card">
          <div className="profile-avatar large">{getInitials(profile.name)}</div>
          <h3>{profile.name}</h3>
          <p>{profile.email}</p>
          <span>{tx(language, `Plano ${planName}`, `${planName} plan`)}</span>
        </div>
        <div className="profile-details">
          <EmailConfirmationNotice
            email={profile.email}
            language={language}
            isConfirmed={profile.emailConfirmed}
          />
          <InfoRow label={tx(language, "Nome", "Name")} value={profile.name} />
          <InfoRow label="Email" value={profile.email} />
          <InfoRow label="CPF/CNPJ" value={profile.document || tx(language, "Não informado", "Not provided")} />
          <InfoRow label={tx(language, "Celular", "Phone")} value={profile.phone || tx(language, "Não informado", "Not provided")} />
          <InfoRow label={tx(language, "Plano", "Plan")} value={planName} />
        </div>
      </div>
    </DashboardSection>
  );
}

function EmailConfirmationNotice({
  email,
  language,
  isConfirmed
}: {
  email: string;
  language: Language;
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

      setMessage(tx(language, "Email de confirmação reenviado.", "Confirmation email sent again."));
    } catch {
      setMessage(tx(language, "Não foi possível reenviar agora.", "Could not resend it right now."));
    } finally {
      setIsSending(false);
    }
  }

  if (isConfirmed) {
    return (
      <div className="email-notice confirmed">
        <ShieldCheck size={18} />
        <div>
          <strong>{tx(language, "Email confirmado", "Email confirmed")}</strong>
          <p>{tx(language, "Sua conta está com email verificado.", "Your account email is verified.")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="email-notice pending">
      <ShieldCheck size={18} />
      <div>
        <strong>{tx(language, "Email ainda não confirmado", "Email not confirmed yet")}</strong>
        <p>{tx(language, "Confirme seu email para aumentar a segurança da conta.", "Confirm your email to improve account security.")}</p>
        <button type="button" onClick={resendConfirmation} disabled={isSending}>
          {isSending
            ? tx(language, "Enviando...", "Sending...")
            : tx(language, "Reenviar confirmação", "Resend confirmation")}
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

function LoadingPostState({ language }: { language: Language }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div className="loader-orbit">
        <span />
        <Sparkles size={30} />
      </div>
      <h3>{tx(language, "Criando seu post completo", "Creating your complete post")}</h3>
      <p>{tx(language, "Gerando copy, imagem, descrição e hashtags em um único fluxo.", "Generating copy, image, caption, and hashtags in one flow.")}</p>
      <div className="loading-steps">
        <span>{tx(language, "Briefing", "Brief")}</span>
        <span>Copy</span>
        <span>{tx(language, "Imagem", "Image")}</span>
        <span>{tx(language, "Finalização", "Finishing")}</span>
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

function getPostSignature(post: GeneratedPost) {
  return JSON.stringify({
    formato_visual: post.formato_visual,
    modo_executado: post.modo_executado,
    nicho: post.nicho,
    post: post.post
  });
}

function getPostOptionSignature(option: GeneratedPost["post"]) {
  return JSON.stringify({
    caption: option.caption,
    hashtags: option.hashtags,
    headline_da_imagem: option.headline_da_imagem,
    generated_image: option.generated_image,
    generated_images: option.generated_images
  });
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
  hideBuiltInActions = false,
  hideActions = false,
  label,
  language = "pt",
  onChange,
  option
}: {
  compact?: boolean;
  editable?: boolean;
  extraActions?: ReactNode;
  hideBuiltInActions?: boolean;
  hideActions?: boolean;
  label: string;
  language?: Language;
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
        {!hideActions && (
          <div className="card-actions">
            {extraActions}
            {!hideBuiltInActions && (
              <>
                <button type="button" onClick={copyCaption} aria-label={tx(language, "Copiar descrição", "Copy caption")}>
                  <Copy size={17} />
                  {copied ? tx(language, "Copiado", "Copied") : tx(language, "Copiar", "Copy")}
                </button>
                <button
                  type="button"
                  onClick={downloadImages}
                  aria-label={tx(language, "Baixar imagem", "Download image")}
                  disabled={images.length === 0}
                >
                  <Download size={17} />
                  {tx(language, "Baixar", "Download")}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="generated-media">
        {images.length > 1 ? (
          <div className="media-carousel">
            <figure className="carousel-stage">
              <img
                src={images[activeSlide]}
                alt={tx(language, `${option.headline_da_imagem} - imagem ${activeSlide + 1}`, `${option.headline_da_imagem} - image ${activeSlide + 1}`)}
              />
              <figcaption>
                {activeSlide + 1} / {images.length}
              </figcaption>
            </figure>

            <div className="carousel-controls">
              <button
                type="button"
                onClick={goToPreviousSlide}
                aria-label={tx(language, "Imagem anterior", "Previous image")}
              >
                <ChevronLeft size={19} />
              </button>
              <div className="carousel-dots" aria-label={tx(language, "Slides do carrossel", "Carousel slides")}>
                {images.map((image, index) => (
                  <button
                    className={clsx(activeSlide === index && "active")}
                    type="button"
                    key={`${index}-${image.length}`}
                    onClick={() => setActiveSlide(index)}
                    aria-label={tx(language, `Ver imagem ${index + 1}`, `View image ${index + 1}`)}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={goToNextSlide}
                aria-label={tx(language, "Próxima imagem", "Next image")}
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
        <h3>{tx(language, "Descrição", "Caption")}</h3>
        {editable ? (
          <textarea
            className="caption-editor"
            aria-label={tx(language, "Editar descrição", "Edit caption")}
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
            aria-label={tx(language, "Editar hashtags", "Edit hashtags")}
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
