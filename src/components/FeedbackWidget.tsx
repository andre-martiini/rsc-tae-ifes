import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquarePlus, X, Send, ChevronDown, ImagePlus, Loader2, ScanLine } from "lucide-react";
import { toBlob } from "html-to-image";
import { sendFeedback, processOfflineQueue, uploadFeedbackAttachments, FeedbackPayload } from "../lib/feedbackService";

const LS_USER_KEY = "@rsc-feedback-user";
const TIPOS = [
  { value: "bug", label: "Erro / Bug" },
  { value: "sugestao", label: "Sugestão" },
  { value: "elogio", label: "Elogio" },
  { value: "duvida", label: "Dúvida" },
  { value: "outro", label: "Outro" },
] as const;

type TipoFeedback = typeof TIPOS[number]["value"];

interface SavedUser {
  nome: string;
  email: string;
}

function readSavedUser(): SavedUser | null {
  try {
    const raw = localStorage.getItem(LS_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.nome && parsed?.email) return parsed as SavedUser;
    return null;
  } catch {
    return null;
  }
}

const SCREEN_NAMES: Record<string, string> = {
  "/": "Entrada",
  "/dashboard": "Dashboard",
  "/perfil": "Perfil",
  "/itens": "Catálogo de Itens",
  "/consolidar": "Consolidar",
  "/triagem": "Dossiê Inteligente",
  "/ajuda": "Ajuda & Novidades",
};

function getMetadata(pathname: string) {
  return {
    tela: SCREEN_NAMES[pathname] ?? pathname,
    rota: pathname,
    resolucao: `${window.screen.width}x${window.screen.height}`,
    navegador: navigator.userAgent.slice(0, 150),
  };
}

type Step = "closed" | "identify" | "write" | "sending" | "done" | "error";

export default function FeedbackWidget() {
  const location = useLocation();
  const processedRef = useRef(false);

  const [step, setStep] = useState<Step>("closed");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tipo, setTipo] = useState<TipoFeedback>("sugestao");
  const [lembrar, setLembrar] = useState(true);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [takingScreenshot, setTakingScreenshot] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);

  // Tenta reenviar fila offline uma vez por sessão de navegação
  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;
    processOfflineQueue().catch(() => {});
  }, []);

  // Preenche dados salvos ao abrir
  const handleOpen = () => {
    const saved = readSavedUser();
    if (saved) {
      setNome(saved.nome);
      setEmail(saved.email);
      setStep("write");
    } else {
      setStep("identify");
    }
  };

  useEffect(() => {
    const handleOpenFeedback = () => {
      handleOpen();
    };
    window.addEventListener('open-feedback', handleOpenFeedback);
    return () => window.removeEventListener('open-feedback', handleOpenFeedback);
  }, []);

  const handleClose = () => {
    setStep("closed");
    setMensagem("");
    setImages([]);
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImagePreviews([]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []) as File[];
    if (selected.length === 0) return;

    const MAX_SIZE = 5 * 1024 * 1024;
    const valid = selected.filter((f) => f.size <= MAX_SIZE).slice(0, 3 - images.length);

    const next = [...images, ...valid].slice(0, 3);
    setImages(next);
    setImagePreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return next.map((f) => URL.createObjectURL(f));
    });

    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const takeScreenshot = async () => {
    if (images.length >= 3 || takingScreenshot) return;
    setTakingScreenshot(true);

    // Cria overlay de flash fora do widget (não entra no screenshot)
    const flash = document.createElement("div");
    flash.style.cssText = [
      "position:fixed", "inset:0", "z-index:99999",
      "background:white", "opacity:0",
      "transition:opacity 0.12s ease-in",
      "pointer-events:none",
      "display:flex", "align-items:center", "justify-content:center",
    ].join(";");
    flash.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px;opacity:0.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
          <circle cx="12" cy="13" r="3"/>
        </svg>
        <span style="font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:0.02em">
          Capturando tela…
        </span>
      </div>`;
    document.body.appendChild(flash);

    // Flash entra
    requestAnimationFrame(() => { flash.style.opacity = "0.88"; });
    await new Promise((resolve) => setTimeout(resolve, 160));

    // Esconde o widget e inicia saída do flash
    const widgetEl = widgetRef.current;
    if (widgetEl) widgetEl.style.visibility = "hidden";
    flash.style.transition = "opacity 0.35s ease-out";
    flash.style.opacity = "0";

    // Dois frames para garantir repaint antes da captura
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );

    try {
      const blob = await toBlob(document.body, {
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        skipFonts: true,
        filter: (node) =>
          node !== flash &&
          node !== widgetEl &&
          !(widgetEl?.contains(node) ?? false),
      });

      if (blob) {
        const file = new File([blob], `print-${Date.now()}.png`, { type: "image/png" });
        const preview = URL.createObjectURL(blob);
        setImages((prev) => [...prev, file].slice(0, 3));
        setImagePreviews((prev) => [...prev, preview].slice(0, 3));
      }
    } catch (err) {
      console.error("[FeedbackWidget] Falha na captura de tela:", err);
    } finally {
      if (widgetEl) widgetEl.style.visibility = "";
      setTakingScreenshot(false);
      setTimeout(() => flash.remove(), 400);
    }
  };

  const handleIdentify = (e: React.FormEvent) => {
    e.preventDefault();
    if (lembrar) {
      localStorage.setItem(LS_USER_KEY, JSON.stringify({ nome, email }));
    }
    setStep("write");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensagem.trim()) return;

    setStep("sending");

    let attachments;
    if (images.length > 0) {
      setUploadingImages(true);
      attachments = await uploadFeedbackAttachments(images).catch(() => undefined);
      setUploadingImages(false);
    }

    const payload: Omit<FeedbackPayload, "createdAt"> = {
      nome,
      email,
      mensagem: mensagem.trim(),
      tipo,
      ...getMetadata(location.pathname),
      ...(attachments && attachments.length > 0 ? { attachments } : {}),
    };

    const result = await sendFeedback(payload);

    setStep(result.success ? "done" : result.offline ? "done" : "error");
    setMensagem("");

    if (result.success || result.offline) {
      setTimeout(handleClose, 2500);
    }
  };

  if (step === "closed") {
    return (
      <button
        onClick={handleOpen}
        title="Enviar feedback"
        className="fixed bottom-6 left-6 z-50 hidden lg:flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 print:hidden"
      >
        <MessageSquarePlus size={18} />
        <span className="hidden sm:inline">Feedback</span>
      </button>
    );
  }

  return (
    <div
      ref={widgetRef}
      role="dialog"
      aria-modal="true"
      aria-label="Enviar feedback"
      className="fixed bottom-20 left-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 print:hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-2xl bg-blue-600 px-4 py-3 text-white">
        <span className="text-sm font-semibold">Fase de Testes — Feedback</span>
        <button onClick={handleClose} aria-label="Fechar" className="rounded p-1 hover:bg-blue-500">
          <X size={16} />
        </button>
      </div>

      <div className="p-4">
        {/* Step: identificação */}
        {step === "identify" && (
          <form onSubmit={handleIdentify} className="space-y-3">
            <p className="text-xs text-gray-500">
              Informe seus dados para que possamos entrar em contato se necessário.
              Eles serão salvos no seu navegador.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Nome</label>
              <input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">E-mail</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="seu@email.com"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={lembrar}
                onChange={(e) => setLembrar(e.target.checked)}
                className="rounded"
              />
              Lembrar meus dados neste navegador
            </label>
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Continuar
            </button>
          </form>
        )}

        {/* Step: escrever */}
        {step === "write" && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-xs text-gray-400">
              Enviando como <strong className="text-gray-600">{nome}</strong>.{" "}
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem(LS_USER_KEY);
                  setNome("");
                  setEmail("");
                  setStep("identify");
                }}
                className="text-blue-500 underline"
              >
                Trocar
              </button>
            </p>

            {/* Tipo */}
            <div className="relative">
              <label className="mb-1 block text-xs font-medium text-gray-700">Tipo</label>
              <div className="relative">
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoFeedback)}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Mensagem */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Mensagem</label>
              <textarea
                required
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Descreva o problema ou sugestão..."
              />
              <p className="mt-0.5 text-right text-xs text-gray-400">{mensagem.length}/1000</p>
            </div>

            {/* Imagens */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">
                  Imagens (opcional)
                </label>
                <span className="text-[10px] text-gray-400">{images.length}/3 · máx 5 MB cada</span>
              </div>

              {imagePreviews.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative h-16 w-16 shrink-0">
                      <img src={src} alt="" className="h-full w-full rounded-lg border border-gray-200 object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow"
                      >
                        <X size={9} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {images.length < 3 && (
                <>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2 text-xs font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                    >
                      <ImagePlus size={14} />
                      Anexar imagem
                    </button>
                    <button
                      type="button"
                      onClick={() => void takeScreenshot()}
                      disabled={takingScreenshot}
                      title="Tirar print da tela atual"
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 hover:border-violet-400 hover:text-violet-600 transition-colors disabled:opacity-50"
                    >
                      {takingScreenshot
                        ? <Loader2 size={14} className="animate-spin" />
                        : <ScanLine size={14} />}
                      {takingScreenshot ? "Capturando…" : "Print da tela"}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Aviso de privacidade — exigido pela revisão */}
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">
              Junto à mensagem, enviamos automaticamente: rota atual, resolução de tela e
              identificação do navegador. Esses dados são usados somente para diagnóstico técnico.
            </p>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Send size={14} />
              Enviar feedback
            </button>
          </form>
        )}

        {/* Step: enviando */}
        {step === "sending" && (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-gray-500">
            <Loader2 size={20} className="animate-spin text-blue-500" />
            {uploadingImages ? "Enviando imagens…" : "Enviando feedback…"}
          </div>
        )}

        {/* Step: sucesso / offline */}
        {step === "done" && (
          <div className="py-6 text-center">
            <p className="text-sm font-medium text-green-600">Feedback enviado!</p>
            <p className="mt-1 text-xs text-gray-400">Obrigado pela contribuição.</p>
          </div>
        )}

        {/* Step: erro */}
        {step === "error" && (
          <div className="py-4 text-center">
            <p className="text-sm font-medium text-red-600">Não foi possível enviar.</p>
            <p className="mt-1 text-xs text-gray-400">
              Seu feedback foi salvo localmente e será reenviado automaticamente.
            </p>
            <button
              onClick={() => setStep("write")}
              className="mt-3 text-xs text-blue-500 underline"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
