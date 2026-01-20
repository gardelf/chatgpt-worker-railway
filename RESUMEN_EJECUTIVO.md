# 📊 Resumen Ejecutivo - Endpoint ChatGPT para Railway

## 🎯 Objetivo

Crear un servicio backend que procese múltiples filas de Google Sheets con la API de ChatGPT, sin los límites de tiempo de Google Apps Script.

---

## 🏗️ Arquitectura

```
Google Sheets (datos)
        ↓
Google Apps Script (orquestador)
        ↓
Railway Endpoint (worker)
        ↓
OpenAI ChatGPT API
        ↓
Railway Endpoint (procesa resultados)
        ↓
Google Sheets (actualiza resultados)
```

---

## 📦 Archivos Incluidos

| Archivo | Propósito |
|---------|-----------|
| `index.js` | Código principal del endpoint Express |
| `package.json` | Dependencias de Node.js |
| `.env.example` | Template para variables de entorno |
| `.gitignore` | Archivos a ignorar en Git |
| `README.md` | Documentación de despliegue |
| `TESTING_LOCAL.md` | Guía de testing local |
| `APPS_SCRIPT_INTEGRACION.gs` | Código para Google Apps Script |
| `ejemplo_payload.json` | Ejemplo de payload para testing |

---

## 🚀 Flujo de Ejecución

### 1. Google Apps Script Lee Datos
```javascript
iniciarEnriquecimiento()
```
- Lee todas las filas con `estado = "pendiente"`
- Agrupa todas en un único lote
- Marca filas como "procesando"

### 2. Envía al Endpoint
```javascript
POST https://railway-endpoint.com
{
  "prompt": "...",
  "items": [
    { "row": 2, "url": "...", "keyword": "...", "texto": "..." },
    { "row": 3, "url": "...", "keyword": "...", "texto": "..." }
  ]
}
```

### 3. Endpoint Procesa en Paralelo
- Recibe el lote
- Procesa cada fila en paralelo (sin esperar)
- Llama a ChatGPT para cada una
- Maneja errores por fila (una falla no detiene las otras)

### 4. Devuelve Resultados
```json
{
  "ok": true,
  "results": [
    {
      "row": 2,
      "analisis": "...",
      "propuesta": "...",
      "accion": "contactar"
    },
    {
      "row": 3,
      "analisis": "...",
      "propuesta": "...",
      "accion": "revision_manual"
    }
  ]
}
```

### 5. Google Apps Script Actualiza Google Sheets
- Escribe los resultados en las columnas correspondientes
- Actualiza `estado` a "procesada" o "error"
- Marca `accion_recomendada` con el valor de ChatGPT

---

## 🔑 Características Clave

✅ **Sin límites de tiempo**: El endpoint en Railway no tiene los 6 minutos de límite de Apps Script

✅ **Procesamiento en paralelo**: Procesa 20-100 filas simultáneamente

✅ **Manejo de errores robusto**: Si una fila falla, las otras continúan

✅ **Respuesta única**: Una sola llamada HTTP para todo el lote (más eficiente)

✅ **Bajo costo**: Railway ofrece 500 horas/mes gratis (suficiente para este caso)

✅ **Fácil de desplegar**: Railway detecta automáticamente que es Node.js

---

## 💻 Requisitos Previos

- Cuenta en [Railway](https://railway.app)
- Repositorio en GitHub (para desplegar)
- OPENAI_API_KEY válida
- Google Sheet con datos en la estructura correcta

---

## 🚀 Pasos de Despliegue

### 1. Preparar el código
```bash
# Clonar o descargar este proyecto
git clone <tu-repo>
cd railway_endpoint
```

### 2. Subir a GitHub
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 3. Desplegar en Railway
1. Ir a https://railway.app
2. Crear nuevo proyecto
3. Seleccionar "Deploy from GitHub repo"
4. Elegir este repositorio
5. Añadir variable de entorno `OPENAI_API_KEY`
6. Railway despliega automáticamente

### 4. Obtener URL pública
- En Railway → Settings → Domains
- Copiar la URL generada

### 5. Actualizar Google Apps Script
```javascript
const CONFIG = {
  RAILWAY_ENDPOINT: 'https://tu-railway-url.up.railway.app',
  // ...
};
```

---

## 🧪 Testing

### Local
```bash
npm install
npm run dev
# Luego: curl -X POST http://localhost:3000 -d @ejemplo_payload.json
```

### En Railway
```bash
# Usar la URL pública directamente desde Google Apps Script
testConexion()
```

---

## 📊 Rendimiento Esperado

| Métrica | Valor |
|---------|-------|
| Tiempo por fila | ~2-5 segundos |
| Filas simultáneas | 5-10 |
| Tiempo total (10 filas) | ~5-10 segundos |
| Tiempo total (100 filas) | ~30-60 segundos |
| Coste por 100 filas | ~$0.02-0.10 (ChatGPT) + gratis (Railway) |

---

## 🔒 Seguridad

- OPENAI_API_KEY se configura como variable de entorno en Railway (nunca en el código)
- El endpoint valida que reciba el formato correcto
- No se guardan datos sensibles en logs
- HTTPS por defecto en Railway

---

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| "OPENAI_API_KEY no válida" | Verifica en https://platform.openai.com/api-keys |
| "Timeout en Railway" | Aumentar timeout a 120s en settings |
| "Filas no se actualizan" | Verifica que RAILWAY_ENDPOINT es correcta en Apps Script |
| "Error 429 (rate limit)" | Reducir número de filas simultáneas o esperar |

---

## 📞 Soporte

- Documentación de Railway: https://docs.railway.app
- Documentación de OpenAI: https://platform.openai.com/docs
- Documentación de Express: https://expressjs.com

---

## 📈 Próximos Pasos

1. ✅ Desplegar el endpoint en Railway
2. ✅ Integrar con Google Apps Script
3. ✅ Procesar todas las filas pendientes
4. ✅ Validar resultados
5. ✅ Ajustar prompt si es necesario
6. ✅ Escalar a producción

---

**Versión**: 1.0.0  
**Última actualización**: Enero 2025  
**Autor**: Manus AI
