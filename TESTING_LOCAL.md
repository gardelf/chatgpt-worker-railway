# 🧪 Testing Local del Endpoint

Este documento explica cómo testear el endpoint localmente antes de desplegarlo en Railway.

## 1. Preparación

### Instalar dependencias
```bash
npm install
```

### Configurar variables de entorno
```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env y añadir tu OPENAI_API_KEY
# OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
```

## 2. Iniciar el servidor

```bash
npm run dev
```

Deberías ver:
```
🚀 Servidor escuchando en http://localhost:3000
```

## 3. Testing del endpoint

### Opción A: Usar curl

```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d @ejemplo_payload.json
```

### Opción B: Usar el archivo de testing

Existe un archivo `ejemplo_payload.json` con un payload de ejemplo. Úsalo como referencia.

### Opción C: Testing manual con Postman

1. Abre Postman
2. Crea una nueva petición POST
3. URL: `http://localhost:3000`
4. Headers: `Content-Type: application/json`
5. Body (raw JSON):
```json
{
  "prompt": "Analiza el contenido y proporciona un análisis breve.",
  "items": [
    {
      "row": 2,
      "url": "https://example.com",
      "keyword": "test keyword",
      "texto": "Este es un contenido de prueba para testear el endpoint."
    }
  ]
}
```
6. Envía la petición

## 4. Respuesta esperada

Si todo funciona correctamente, deberías recibir:

```json
{
  "ok": true,
  "results": [
    {
      "row": 2,
      "analisis": "...",
      "propuesta": "...",
      "accion": "contactar" | "revision_manual" | "error"
    }
  ]
}
```

## 5. Troubleshooting

### Error: "OPENAI_API_KEY no está definida"
- Verifica que el archivo `.env` existe y tiene la clave correcta
- Reinicia el servidor después de actualizar `.env`

### Error: "Invalid API Key"
- Asegúrate de que tu OPENAI_API_KEY es válida
- Obtén una nueva clave en: https://platform.openai.com/api-keys

### Error: "Timeout"
- El modelo `gpt-4o-mini` puede tardar unos segundos
- Aumenta el timeout en tu cliente HTTP si es necesario

### Error: "Bad Request"
- Verifica que el JSON es válido
- Asegúrate de que el payload tiene la estructura correcta

## 6. Monitoreo

Mientras el servidor está corriendo, verás logs como:

```
Recibido lote de 2 items para procesar.
Fila 2 procesada correctamente.
Fila 3 procesada correctamente.
Lote procesado completamente.
```

Si hay errores, verás:

```
Error procesando la fila 2: API rate limit exceeded
```

## 7. Detener el servidor

Presiona `Ctrl+C` en la terminal donde está corriendo el servidor.

---

## 📝 Notas importantes

- El endpoint procesa todas las filas en **paralelo** para mayor eficiencia.
- Si una fila falla, el resto continúa procesándose.
- El servidor devuelve **una única respuesta** con todos los resultados.
- No hay límite de tiempo en local (a diferencia de Google Apps Script que tiene 6 minutos).
