const express = require('express');
const OpenAI = require('openai');

// Cargar variables de entorno (para desarrollo local)
require('dotenv').config();

// Configuración inicial
const app = express();
const port = process.env.PORT || 3000;

// Middleware para parsear JSON. Aumentamos el límite para payloads grandes.
app.use(express.json({ limit: '50mb' }));

// --- Lógica Principal ---

/**
 * Procesa un único item (fila) con la API de OpenAI.
 * @param {object} item - El objeto que representa una fila de Google Sheet.
 * @param {string} prompt - El prompt base para la IA.
 * @returns {Promise<object>} - El resultado procesado para la fila.
 */
async function procesarItem(item, prompt) {
  const { row, url, keyword, texto } = item;

  try {
    // Obtener la API key en cada llamada (no al inicio)
    let apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY no está configurada');
    }

    // Limpiar la clave: remover espacios y caracteres de escape
    apiKey = apiKey.trim();
    if (apiKey.startsWith('=')) {
      apiKey = apiKey.substring(1);
    }
    
    console.log(`DEBUG: API Key length: ${apiKey.length}, starts with: ${apiKey.substring(0, 10)}...`);

    // Crear cliente de OpenAI con la clave
    const openai = new OpenAI({
      apiKey: apiKey
    });

    // 1. Construir el mensaje para el usuario
    const userMessage = `URL: ${url}\nKEYWORD: ${keyword}\nCONTENIDO: ${texto}`;

    // 2. Llamar a la API de OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.5, // Un buen balance entre creatividad y consistencia
    });

    const responseText = completion.choices[0].message.content;

    // 3. Parsear la respuesta JSON de ChatGPT
    let parsedResponse = {};
    
    try {
      // Intentar parsear como JSON
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      // Si no es JSON válido, intentar extraer JSON del texto
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.warn(`⚠️ No se pudo parsear JSON para fila ${row}. Usando respuesta como texto.`);
          parsedResponse = {
            analisis_resumen: responseText,
            propuesta_comunicativa: responseText,
            accion_recomendada: 'revision_manual',
            estado_analisis: 'analizada'
          };
        }
      } else {
        // Si no hay JSON, usar la respuesta completa
        parsedResponse = {
          analisis_resumen: responseText,
          propuesta_comunicativa: responseText,
          accion_recomendada: 'revision_manual',
          estado_analisis: 'analizada'
        };
      }
    }

    // 4. Validar y extraer los campos esperados
    const resultado = {
      row,
      url: parsedResponse.url || url,
      titulo_pagina: parsedResponse.titulo_pagina || '',
      keyword_origen: parsedResponse.keyword_origen || keyword,
      tipo_resultado: parsedResponse.tipo_resultado || '',
      relevancia_futura: parsedResponse.relevancia_futura || '',
      analisis_resumen: parsedResponse.analisis_resumen || '',
      propuesta_comunicativa: parsedResponse.propuesta_comunicativa || '',
      accion_recomendada: parsedResponse.accion_recomendada || 'revision_manual',
      estado_analisis: parsedResponse.estado_analisis || 'analizada'
    };

    // 5. Validar que accion_recomendada sea uno de los valores permitidos
    const accionesValidas = ['contacto_directo', 'insight', 'descartado', 'contactar', 'revision_manual', 'error'];
    if (!accionesValidas.includes(resultado.accion_recomendada)) {
      resultado.accion_recomendada = 'revision_manual';
    }

    console.log(`✅ Fila ${row} procesada correctamente.`);
    return resultado;

  } catch (error) {
    console.error(`❌ Error procesando la fila ${row}:`, error.message);
    // Devolver un objeto de error si algo falla para no detener el lote
    return {
      row,
      url: url || '',
      titulo_pagina: '',
      keyword_origen: keyword || '',
      tipo_resultado: '',
      relevancia_futura: '',
      analisis_resumen: `Error: ${error.message}`,
      propuesta_comunicativa: `Error: ${error.message}`,
      accion_recomendada: 'error',
      estado_analisis: 'analizada'
    };
  }
}

// --- Endpoint HTTP ---

app.post('/', async (req, res) => {
  const { prompt, items } = req.body;

  // Validar el payload de entrada
  if (!prompt || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      ok: false,
      error: 'Payload inválido. Se requiere un "prompt" y un array de "items".'
    });
  }
  
  console.log(`📥 Recibido lote de ${items.length} items para procesar.`);

  // Procesar todos los items en paralelo para mayor eficiencia
  const promesasDeResultados = items.map(item => procesarItem(item, prompt));
  
  // Esperar a que todas las promesas se resuelvan
  const resultados = await Promise.all(promesasDeResultados);

  console.log('✅ Lote procesado completamente.');

  // Devolver la respuesta final con todos los resultados
  res.status(200).json({
    ok: true,
    results: resultados,
  });
});

// Endpoint de health check para Railway
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Endpoint de info para verificar configuración
app.get('/info', (req, res) => {
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    res.status(200).json({
      status: 'OK',
      openai_configured: hasApiKey,
      node_version: process.version,
      port: port,
      timestamp: new Date().toISOString()
    });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`🚀 Servidor escuchando en puerto ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`ℹ️  Info: http://localhost:${port}/info`);
});
