'''
# 🚀 ChatGPT Worker para Google Sheets en Railway

Este proyecto es un endpoint HTTP construido con Node.js y Express, diseñado para ser desplegado en [Railway](https://railway.app). Su función es recibir un lote de filas desde un Google Sheet, procesar cada una con la API de OpenAI (ChatGPT) y devolver los resultados de manera estructurada.

## 📋 Flujo de Trabajo

1.  **Google Apps Script**: Un script en Google Sheets recopila todas las filas con `estado = "pendiente"`. 
2.  **Llamada HTTP**: Apps Script envía una única petición `POST` a este endpoint en Railway con todas las filas.
3.  **Procesamiento en Paralelo**: El endpoint recibe el lote y procesa cada fila en paralelo para mayor eficiencia, llamando a la API de OpenAI.
4.  **Respuesta Agrupada**: Una vez que todas las filas han sido procesadas (o han fallado individualmente), el endpoint devuelve una única respuesta JSON con los resultados de cada fila.
5.  **Actualización en Google Sheets**: Apps Script recibe la respuesta y actualiza las filas correspondientes en la hoja de cálculo.

---

## 🛠️ Desarrollo Local

1.  **Clonar el repositorio**:
    ```bash
    git clone <tu-repositorio>
    cd railway_endpoint
    ```

2.  **Instalar dependencias**:
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno**:
    - Renombra el archivo `.env.example` a `.env`.
    - Añade tu `OPENAI_API_KEY` en el archivo `.env`.
    ```ini
    OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
    PORT=3000
    ```

4.  **Iniciar el servidor de desarrollo**:
    ```bash
    npm run dev
    ```
    El servidor se iniciará en `http://localhost:3000` y se reiniciará automáticamente con cada cambio gracias a `nodemon`.

---

## 🚂 Despliegue en Railway

El despliegue en Railway es extremadamente sencillo y se puede hacer en minutos.

1.  **Sube tu código a un repositorio de GitHub**.

2.  **Crea una cuenta en [Railway](https://railway.app)** (puedes usar tu cuenta de GitHub).

3.  **Crea un nuevo proyecto**:
    - En tu dashboard de Railway, haz clic en **New Project**.
    - Selecciona **Deploy from GitHub repo**.
    - Elige tu repositorio. Railway detectará automáticamente que es un proyecto de Node.js y lo configurará.

4.  **Añade las variables de entorno**:
    - Dentro de tu proyecto en Railway, ve a la pestaña **Variables**.
    - Añade una nueva variable llamada `OPENAI_API_KEY`.
    - Pega tu clave de API de OpenAI en el campo del valor.
    - Railway desplegará automáticamente la nueva versión con la variable de entorno configurada.

5.  **Obtén la URL pública**:
    - Ve a la pestaña **Settings** de tu servicio.
    - En la sección **Domains**, encontrarás la URL pública generada por Railway (ej: `https://chatgpt-worker-production-xxxx.up.railway.app`).
    - **¡Esta es la URL que debes usar en tu Google Apps Script!**

---

## 🔄 Actualización en Google Apps Script

Finalmente, actualiza la constante `RAILWAY_ENDPOINT` en tu pestaña "Claves" o directamente en tu código de Apps Script con la URL que obtuviste de Railway.

```javascript
// Ejemplo en Apps Script
const RAILWAY_ENDPOINT = 'https://chatgpt-worker-production-xxxx.up.railway.app';

function llamarAWorker() {
  const payload = {
    prompt: "...",
    items: [...]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };

  const response = UrlFetchApp.fetch(RAILWAY_ENDPOINT, options);
  // ... procesar la respuesta
}
```
'''
