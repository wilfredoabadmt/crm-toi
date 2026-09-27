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

const POPULAR_MODELS = [
  { id: "openai/gpt-4o-mini", label: "GPT-4o mini", tag: "Rápido y económico" },
  { id: "deepseek/deepseek-chat", label: "DeepSeek V3", tag: "Excelente razonamiento" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", tag: "Máxima precisión" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", tag: "Open-source líder" },
  { id: "openai/gpt-4o", label: "GPT-4o", tag: "Potencia total" },
];

export function LlmConfigCard({ initialConfig, onSaved }: LlmConfigCardProps) {
  const [baseUrl, setBaseUrl] = useState(initialConfig.baseUrl || "https://openrouter.ai/api");
  const [model, setModel] = useState(initialConfig.model || "openai/gpt-4o-mini");
  const [token, setToken] = useState("");
  const [isEditingToken, setIsEditingToken] = useState(!initialConfig.configured);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setBaseUrl(initialConfig.baseUrl || "https://openrouter.ai/api");
    setModel(initialConfig.model || "openai/gpt-4o-mini");
    setIsEditingToken(!initialConfig.configured);
  }, [initialConfig]);

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    setSaveError(null);

    // Si no ha ingresado un nuevo token y ya estaba configurado, requerimos ingresar token para testear o probar
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
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
          >
            <span>Obtener API Key</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Endpoint / Base URL */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="llm-base-url" className="text-xs flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              Endpoint Base (Compatible OpenAI)
            </Label>
            <button
              type="button"
              onClick={() => setBaseUrl("https://openrouter.ai/api")}
              className="text-[11px] text-primary hover:underline"
            >
              Restablecer OpenRouter
            </button>
          </div>
          <Input
            id="llm-base-url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://openrouter.ai/api"
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
            placeholder="openai/gpt-4o-mini"
            className="text-xs font-mono"
          />

          {/* Modelos sugeridos */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {POPULAR_MODELS.map((pm) => (
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
        </div>

        {/* API Token */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="llm-token" className="text-xs flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-muted-foreground" />
              API Key / Token del Proveedor
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
              <span>sk-or-••••••••••••••••••••••••{initialConfig.tokenLast4}</span>
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
                placeholder="sk-or-v1-..."
                className="text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Tu clave se almacena cifrada con AES-256-GCM y se actualiza de inmediato en el entorno del CRM.
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
