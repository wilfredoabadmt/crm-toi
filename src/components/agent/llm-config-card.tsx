"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Key,
  Globe,
  Cpu,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface LlmConfig {
  baseUrl: string;
  model: string;
  tokenLast4: string | null;
  isCustom: boolean;
  configured: boolean;
}

interface LlmConfigCardProps {
  initialConfig: LlmConfig;
  onSaved: () => void;
}

interface LlmProvider {
  id: string;
  name: string;
  badge: string;
  defaultBaseUrl: string;
  apiKeyHelpUrl: string;
  tokenPrefixPlaceholder: string;
  models: { id: string; label: string; tag: string }[];
}

const PROVIDERS: LlmProvider[] = [
  {
    id: "openai",
    name: "OpenAI (ChatGPT)",
    badge: "Oficial",
    defaultBaseUrl: "https://api.openai.com/v1",
    apiKeyHelpUrl: "https://platform.openai.com/api-keys",
    tokenPrefixPlaceholder: "sk-proj-...",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o mini", tag: "Económico y veloz" },
      { id: "gpt-4o", label: "GPT-4o", tag: "Máxima inteligencia" },
      { id: "o1-mini", label: "o1 mini", tag: "Razonamiento puro" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    badge: "Oficial",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    apiKeyHelpUrl: "https://console.anthropic.com/settings/keys",
    tokenPrefixPlaceholder: "sk-ant-api03-...",
    models: [
      { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", tag: "Calidad superior" },
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", tag: "Ultra rápido" },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    badge: "Oficial",
    defaultBaseUrl: "https://api.deepseek.com",
    apiKeyHelpUrl: "https://platform.deepseek.com/api_keys",
    tokenPrefixPlaceholder: "sk-...",
    models: [
      { id: "deepseek-chat", label: "DeepSeek V3", tag: "Gran rendimiento y bajo costo" },
      { id: "deepseek-reasoner", label: "DeepSeek R1", tag: "Razonamiento profundo" },
    ],
  },
  {
    id: "groq",
    name: "Groq Cloud",
    badge: "Ultra Veloz",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    apiKeyHelpUrl: "https://console.groq.com/keys",
    tokenPrefixPlaceholder: "gsk_...",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", tag: "Velocidad extrema" },
      { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B", tag: "Contexto amplio" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    badge: "Multi-modelo",
    defaultBaseUrl: "https://openrouter.ai/api",
    apiKeyHelpUrl: "https://openrouter.ai/keys",
    tokenPrefixPlaceholder: "sk-or-v1-...",
    models: [
      { id: "openai/gpt-4o-mini", label: "GPT-4o mini", tag: "OpenRouter" },
      { id: "deepseek/deepseek-chat", label: "DeepSeek V3", tag: "OpenRouter" },
      { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", tag: "OpenRouter" },
      { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", tag: "OpenRouter" },
    ],
  },
  {
    id: "custom",
    name: "Personalizado / Otros",
    badge: "Z.AI, Ollama, xAI",
    defaultBaseUrl: "https://api.x.ai/v1",
    apiKeyHelpUrl: "https://x.ai/api",
    tokenPrefixPlaceholder: "Tu clave API...",
    models: [
      { id: "grok-2-latest", label: "Grok 2 (xAI)", tag: "x.ai" },
    ],
  },
];

function detectProviderId(baseUrl: string): string {
  const clean = baseUrl.toLowerCase();
  if (clean.includes("openai.com")) return "openai";
  if (clean.includes("anthropic.com")) return "anthropic";
  if (clean.includes("deepseek.com")) return "deepseek";
  if (clean.includes("groq.com")) return "groq";
  if (clean.includes("openrouter.ai")) return "openrouter";
  return "custom";
}

export function LlmConfigCard({ initialConfig, onSaved }: LlmConfigCardProps) {
  const [selectedProviderId, setSelectedProviderId] = useState<string>(() =>
    detectProviderId(initialConfig.baseUrl || "https://openrouter.ai/api")
  );
  const [baseUrl, setBaseUrl] = useState(initialConfig.baseUrl || "https://openrouter.ai/api");
  const [model, setModel] = useState(initialConfig.model || "openai/gpt-4o-mini");
  const [token, setToken] = useState("");
  const [isEditingToken, setIsEditingToken] = useState(!initialConfig.configured);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const activeProvider = PROVIDERS.find((p) => p.id === selectedProviderId) || PROVIDERS[0];

  useEffect(() => {
    const provId = detectProviderId(initialConfig.baseUrl || "https://openrouter.ai/api");
    setSelectedProviderId(provId);
    setBaseUrl(initialConfig.baseUrl || "https://openrouter.ai/api");
    setModel(initialConfig.model || "openai/gpt-4o-mini");
    setIsEditingToken(!initialConfig.configured);
  }, [initialConfig]);

  function handleSelectProvider(provider: LlmProvider) {
    setSelectedProviderId(provider.id);
    setBaseUrl(provider.defaultBaseUrl);
    if (provider.models.length > 0) {
      setModel(provider.models[0].id);
    }
    setTestResult(null);
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    setSaveError(null);

    if (!token.trim()) {
      setTestResult({
        ok: false,
        message: "Por favor ingresa la clave de API para verificar la conexión.",
      });
      setTesting(false);
      return;
    }

    try {
      const res = await fetch("/api/agent/llm-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          token: token.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Falló la prueba con el proveedor de IA");
      }

      setTestResult({
        ok: true,
        message: data.message || `Conexión exitosa con ${model} (${data.latencyMs}ms)`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al conectar con el proveedor";
      setTestResult({
        ok: false,
        message: msg,
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const body: Record<string, string> = {
        llmBaseUrl: baseUrl.trim(),
        llmModel: model.trim(),
      };

      if (token.trim()) {
        body.llmToken = token.trim();
      }

      const res = await fetch("/api/agent/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "No se pudieron guardar las credenciales");
      }

      setSaveSuccess(true);
      setToken("");
      setIsEditingToken(false);
      onSaved();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Proveedor y Modelo de IA
                {initialConfig.configured ? (
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-300">
                    Activo ✓
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs text-amber-600 border-amber-300 bg-amber-500/10">
                    Sin configurar
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Personaliza la API Key y el modelo de LLM que utilizará tu agente para responder a tus clientes.
              </CardDescription>
            </div>
          </div>

          <a
            href={activeProvider.apiKeyHelpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
          >
            <span>Obtener clave en {activeProvider.name}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Selector de Proveedor Oficial / Custom */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            1. Selecciona tu Proveedor o Pasarela
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROVIDERS.map((prov) => {
              const isSelected = selectedProviderId === prov.id;
              return (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => handleSelectProvider(prov)}
                  className={`p-2.5 rounded-lg border text-left transition-all relative ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                      : "border-border/70 bg-card hover:border-foreground/30 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {prov.name}
                    </span>
                    <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${
                      isSelected ? "border-primary text-primary" : "text-muted-foreground"
                    }`}>
                      {prov.badge}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Endpoint / Base URL */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="llm-base-url" className="text-xs flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              URL Base del Endpoint
            </Label>
            <button
              type="button"
              onClick={() => setBaseUrl(activeProvider.defaultBaseUrl)}
              className="text-[11px] text-primary hover:underline"
            >
              Restablecer URL de {activeProvider.name}
            </button>
          </div>
          <Input
            id="llm-base-url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={activeProvider.defaultBaseUrl}
            className="text-xs font-mono"
          />
        </div>

        {/* Modelo de LLM */}
        <div className="space-y-1.5">
          <Label htmlFor="llm-model" className="text-xs flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
            Modelo de Inteligencia Artificial
          </Label>
          <Input
            id="llm-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={activeProvider.models[0]?.id || "gpt-4o-mini"}
            className="text-xs font-mono"
          />

          {/* Modelos sugeridos según el proveedor activo */}
          {activeProvider.models.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {activeProvider.models.map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setModel(pm.id)}
                  className={`text-[11px] px-2.5 py-1 rounded-md border transition-all flex items-center gap-1.5 ${
                    model === pm.id
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border/80 bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  <span>{pm.label}</span>
                  <span className="text-[9px] opacity-70">({pm.tag})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* API Token */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="llm-token" className="text-xs flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-muted-foreground" />
              API Key / Clave Privada ({activeProvider.name})
            </Label>
            {initialConfig.tokenLast4 && !isEditingToken && (
              <button
                type="button"
                onClick={() => setIsEditingToken(true)}
                className="text-[11px] text-primary hover:underline"
              >
                Cambiar clave
              </button>
            )}
          </div>

          {!isEditingToken && initialConfig.tokenLast4 ? (
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-xs font-mono text-muted-foreground">
              <span>••••••••••••••••••••••••{initialConfig.tokenLast4}</span>
              <span className="text-[11px] text-emerald-600 font-sans font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Cifrada en BD
              </span>
            </div>
          ) : (
            <div className="space-y-1">
              <Input
                id="llm-token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={activeProvider.tokenPrefixPlaceholder}
                className="text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Tu clave se almacena cifrada con AES-256-GCM y se sincroniza en caliente en el entorno del CRM.
              </p>
            </div>
          )}
        </div>

        {/* Resultado del Test */}
        {testResult && (
          <div
            className={`rounded-lg p-3 text-xs flex items-start gap-2 border ${
              testResult.ok
                ? "bg-emerald-500/10 border-emerald-300 text-emerald-700 dark:text-emerald-400"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <p className="font-semibold">{testResult.ok ? "Prueba exitosa" : "Error de conexión"}</p>
              <p>{testResult.message}</p>
            </div>
          </div>
        )}

        {saveError && (
          <div className="rounded-lg p-3 text-xs bg-destructive/10 border border-destructive/30 text-destructive flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="rounded-lg p-2.5 text-xs bg-emerald-500/10 border border-emerald-300 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Configuración de IA guardada y sincronizada exitosamente ✓</span>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleTestConnection()}
            disabled={testing || (!token.trim() && isEditingToken)}
            className="text-xs gap-1.5"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Probar conexión
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving || !model.trim()}
            className="text-xs gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Guardar proveedor de IA
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
