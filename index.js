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
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY no está configurada');
    }

    // Crear cliente de OpenAI con la clave
    const openai = new OpenAI({ apiKey });

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

    // 3. Interpretar la respuesta de la IA.
    // Para este caso, la respuesta completa se asigna a ambos campos.
    // Se podría mejorar con un parsing más robusto si ChatGPT devolviera un JSON.
    const analisis = responseText;
    const propuesta = responseText;

    // 4. Determinar la acción recomendada
    let accion = 'revision_manual';
    const lowerCaseResponse = responseText.toLowerCase();
    if (lowerCaseResponse.includes('dm') || lowerCaseResponse.includes('mensaje') || lowerCaseResponse.includes('contactar')) {
      accion = 'contactar';
    }

    // 5. Devolver el resultado estructurado para esta fila
    console.log(`✅ Fila ${row} procesada correctamente.`);
    return {
      row,
      analisis: analisis,
      propuesta: propuesta,
      accion: accion,
    };

  } catch (error) {
    console.error(`❌ Error procesando la fila ${row}:`, error.message);
    // 6. Devolver un objeto de error si algo falla para no detener el lote
    return {
      row,
      analisis: `Error: ${error.message}`,
      propuesta: `Error: ${error.message}`,
      accion: 'error',
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
