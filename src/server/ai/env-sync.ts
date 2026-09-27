import fs from "node:fs/promises";
import path from "node:path";

/**
 * Actualiza de forma segura y atómica las variables de IA en el archivo .env físico en disco
 * si este archivo existe en la raíz de la aplicación.
 *
 * Preserva intactos todos los comentarios, líneas vacías y demás variables.
 */
export async function syncEnvFile(updates: {
  token?: string | null;
  model?: string | null;
  baseUrl?: string | null;
}): Promise<boolean> {
  const envPath = path.resolve(process.cwd(), ".env");

  let content = "";
  try {
    content = await fs.readFile(envPath, "utf-8");
  } catch (err: unknown) {
    // Si no existe .env físico (ej. entorno de contenedor donde las vars vienen puramente inyectadas)
    // retornamos false sin fallar.
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT") return false;
    console.warn("[env-sync] no se pudo leer .env:", err);
    return false;
  }

  const keysToUpdate: Record<string, string | undefined> = {
    OPENROUTER_API_TOKEN: updates.token?.trim() || undefined,
    OPENROUTER_MODEL: updates.model?.trim() || undefined,
    OPENROUTER_BASE_URL: updates.baseUrl?.trim() || undefined,
  };

  const lines = content.split(/\r?\n/);
  const foundKeys = new Set<string>();

  const newLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed.includes("=")) {
      return line;
    }

    const eqIdx = line.indexOf("=");
    const key = line.slice(0, eqIdx).trim();

    if (key in keysToUpdate) {
      foundKeys.add(key);
      const val = keysToUpdate[key];
      if (val !== undefined && val.length > 0) {
        return `${key}=${val}`;
      }
      return `${key}=`;
    }

    return line;
  });

  // Agregar cualquier clave faltante al final del archivo si no existía
  for (const [key, val] of Object.entries(keysToUpdate)) {
    if (!foundKeys.has(key) && val !== undefined && val.length > 0) {
      newLines.push(`${key}=${val}`);
    }
  }

  try {
    await fs.writeFile(envPath, newLines.join("\n"), "utf-8");
    return true;
  } catch (err) {
    console.error("[env-sync] error escribiendo .env:", err);
    return false;
  }
}
