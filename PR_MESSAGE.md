# Pull Request: Limpieza Histórica y Soporte Google Maps Short URLs

## Resumen
Este PR elimina completamente los secretos del historial de Git y agrega soporte para URLs acortadas de Google Maps (`maps.app.goo.gl`).

## Cambios Principales

### 🔒 Seguridad - Limpieza de Secretos (GH013)
- **Problema**: GitHub Secret Scanning bloqueaba pushes por claves OpenRouter API (`sk-or-v1-...`) expuestas en el historial
- **Solución**: Reescritura completa del historial mediante branch orphan (`clean-master`)
- **Archivos afectados**: `.env.example`, `saas-toi-agent/.env.example`, eliminación de `OPENROUTER_FIX_SOLUTION.md`
- **Resultado**: Historial limpio sin tokens reales; placeholders vacíos en `.env.example`

### 🗺️ Feature - Google Maps Short URLs
- **Archivo**: `src/server/coverage/naps.ts`
- **Función**: `parseCoordinatesOrLink()`
- **Nuevo patrón (Patrón 5)**: Detecta URLs `https://maps.app.goo.gl/<hash>`
- **Comportamiento**: Retorna `{ lat: null, lng: null, is_gmaps_short_url: true, gmaps_short_hash: "<hash>" }` para resolución posterior

### 🛡️ Prevención Futura
- Script `scripts/verify-secrets.js` para escaneo local de secretos
- Patrones detectados: `sk-or-v1-`, `sk-`, `Bearer <token>`

## Testing
```bash
# Verificar limpieza de secretos
node scripts/verify-secrets.js
# ✅ No se encontraron secretos reales (solo placeholders de test)

# Probar parseo de URL corta
parseCoordinatesOrLink("https://maps.app.goo.gl/jD6SXjGCtmyTAdRz6")
# → { is_gmaps_short_url: true, gmaps_short_hash: "jD6SXjGCtmyTAdRz6" }
```

## Cobertura de Cambios
- `src/server/coverage/naps.ts` - +15 líneas (nuevo patrón 5 + comentarios)
- `.env.example` - Tokens vacíos
- `saas-toi-agent/.env.example` - Token vacío
- `scripts/verify-secrets.js` - Nuevo script (ES modules)

## Checklist
- [x] Historial limpio verificado (sin `sk-or-v1-`)
- [x] `.env.example` con placeholders vacíos
- [x] Soporte `maps.app.goo.gl` implementado
- [x] Tests de verificación pasando
- [x] Build local exitoso (`npm run build`)

---

**Nota**: Esta es una reescritura de historial. Tras merge, forzar actualización local:
```bash
git fetch origin && git reset --hard origin/master
```