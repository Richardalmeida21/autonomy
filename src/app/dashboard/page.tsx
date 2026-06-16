"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ImagePlus,
  Save,
  Sparkles,
  Trash2,
  UploadCloud
} from "lucide-react";
import clsx from "clsx";
import type { GeneratedPost } from "@/lib/post-schema";
import {
  deletePost,
  getSavedPosts,
  savePost,
  type SavedPost
} from "@/lib/saved-posts";

type Mode = "criativo" | "contextual";
type VisualFormat = "imagem_unica" | "carrossel";
type ActiveView = "gerar" | "biblioteca";

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
  const [error, setError] = useState<string | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getSavedPosts()
      .then((posts) => {
        setSavedPosts(posts);
        setLibraryError(null);
      })
      .catch(() =>
        setLibraryError("Nao foi possivel carregar a biblioteca de posts.")
      );
  }, []);

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
      const response = await fetch("/api/generate-post", {
        method: "POST",
        headers: {
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
    } catch {
      setError("Nao foi possivel salvar este post na biblioteca.");
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

  return (
    <main className="shell">
      <section className="workspace">
        <aside className="panel form-panel">
          <div className="brand-row">
            <div className="brand-mark">
              <Sparkles size={22} strokeWidth={2.4} />
            </div>
            <div>
              <p className="eyebrow">Autonomy</p>
              <h1>Gerador de posts pronto para vender</h1>
            </div>
          </div>

          <div className="view-tabs" aria-label="Navegacao">
            <button
              className={clsx(activeView === "gerar" && "active")}
              type="button"
              onClick={() => setActiveView("gerar")}
            >
              Gerar
            </button>
            <button
              className={clsx(activeView === "biblioteca" && "active")}
              type="button"
              onClick={() => setActiveView("biblioteca")}
            >
              Meus posts
              <span>{savedPosts.length}</span>
            </button>
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
              <h2>
                {activeView === "biblioteca"
                  ? "Meus posts salvos"
                  : "Post completo pronto para o calendario"}
              </h2>
            </div>
            {activeView === "gerar" && (
              <div className="topbar-actions">
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
            )}
          </div>

          {activeView === "biblioteca" ? (
            <SavedPostsLibrary
              error={libraryError}
              posts={savedPosts}
              onDelete={deleteSavedPost}
            />
          ) : isLoading ? (
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
