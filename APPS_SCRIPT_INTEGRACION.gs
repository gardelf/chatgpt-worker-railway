// ============================================================================
// APPS SCRIPT - INTEGRACIÓN CON RAILWAY WORKER
// ============================================================================
// Este script lee filas pendientes de Google Sheets y las envía al endpoint
// en Railway para procesamiento con ChatGPT.
// ============================================================================

// ⚙️ CONFIGURACIÓN - ACTUALIZAR ESTOS VALORES
const CONFIG = {
  RAILWAY_ENDPOINT: 'https://chatgpt-worker-production-xxxx.up.railway.app', // Reemplazar con tu URL de Railway
  SHEET_NAME: 'Historial_Resultados',
  PROMPT_SHEET: 'Prompt_ChatGPT',
};

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

/**
 * Inicia el enriquecimiento enviando filas pendientes al worker de Railway
 * Ejecutar: iniciarEnriquecimiento()
 */
function iniciarEnriquecimiento() {
  Logger.log('🧠 Iniciando enriquecimiento con Railway...');
  
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const hojaHistorial = sheet.getSheetByName(CONFIG.SHEET_NAME);
    
    // 1. Leer datos
    const datos = hojaHistorial.getDataRange().getValues();
    const headers = datos[0];
    
    // Encontrar índices de columnas
    const idxEstado = headers.indexOf('estado');
    const idxResumenChatGPT = headers.indexOf('resumen_chatgpt');
    const idxURL = headers.indexOf('url');
    const idxKeyword = headers.indexOf('keyword');
    const idxAnalisis = headers.indexOf('analisis_resumen');
    const idxPropuesta = headers.indexOf('propuesta_comunicativa');
    const idxAccion = headers.indexOf('accion_recomendada');
    
    if (idxEstado === -1 || idxResumenChatGPT === -1) {
      throw new Error('Columnas requeridas no encontradas');
    }
    
    // 2. Leer prompt
    const hojaPrompt = sheet.getSheetByName(CONFIG.PROMPT_SHEET);
    const prompt = hojaPrompt.getRange('A7').getValue();
    
    if (!prompt) {
      throw new Error('Prompt no encontrado en ' + CONFIG.PROMPT_SHEET + ' celda A7');
    }
    
    // 3. Encontrar filas pendientes
    const items = [];
    
    for (let i = 1; i < datos.length; i++) {
      const estado = datos[i][idxEstado];
      const contenido = datos[i][idxResumenChatGPT];
      const url = datos[i][idxURL];
      const keyword = datos[i][idxKeyword];
      
      if (estado === 'pendiente' && contenido) {
        items.push({
          row: i + 1,  // Número de fila en Google Sheets (1-indexed)
          url: url || '',
          keyword: keyword || '',
          texto: contenido
        });
      }
    }
    
    if (items.length === 0) {
      Logger.log('⚠️ No hay filas pendientes');
      return;
    }
    
    Logger.log(`📊 Encontradas ${items.length} filas pendientes`);
    
    // 4. Marcar filas como "procesando"
    for (const item of items) {
      hojaHistorial.getRange(item.row, idxEstado + 1).setValue('procesando');
    }
    
    // 5. Enviar al worker de Railway
    Logger.log('📤 Enviando lote al worker de Railway...');
    const payload = {
      prompt: prompt,
      items: items
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(CONFIG.RAILWAY_ENDPOINT, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode !== 200) {
      throw new Error(`Error del servidor (${responseCode}): ${responseText}`);
    }
    
    // 6. Procesar respuesta
    const result = JSON.parse(responseText);
    
    if (!result.ok || !Array.isArray(result.results)) {
      throw new Error('Respuesta inválida del servidor');
    }
    
    Logger.log(`✅ Respuesta recibida con ${result.results.length} resultados`);
    
    // 7. Actualizar Google Sheets con los resultados
    let contadorExitoso = 0;
    let contadorError = 0;
    
    for (const resultItem of result.results) {
      const { row, analisis, propuesta, accion } = resultItem;
      
      try {
        // Actualizar las columnas de resultado
        if (idxAnalisis !== -1) {
          hojaHistorial.getRange(row, idxAnalisis + 1).setValue(analisis);
        }
        if (idxPropuesta !== -1) {
          hojaHistorial.getRange(row, idxPropuesta + 1).setValue(propuesta);
        }
        if (idxAccion !== -1) {
          hojaHistorial.getRange(row, idxAccion + 1).setValue(accion);
        }
        
        // Actualizar estado
        const nuevoEstado = accion === 'error' ? 'error' : 'procesada';
        hojaHistorial.getRange(row, idxEstado + 1).setValue(nuevoEstado);
        
        if (accion === 'error') {
          contadorError++;
        } else {
          contadorExitoso++;
        }
        
        Logger.log(`✅ Fila ${row} actualizada (acción: ${accion})`);
      } catch (error) {
        Logger.log(`❌ Error actualizando fila ${row}: ${error.message}`);
        contadorError++;
      }
    }
    
    Logger.log(`\n📈 RESUMEN:`);
    Logger.log(`   ✅ Procesadas correctamente: ${contadorExitoso}`);
    Logger.log(`   ❌ Con error: ${contadorError}`);
    Logger.log(`\n✨ Enriquecimiento completado`);
    
  } catch (error) {
    Logger.log(`❌ Error general: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// FUNCIÓN: VERIFICAR PROGRESO
// ============================================================================

/**
 * Muestra el progreso del enriquecimiento
 * Ejecutar: verificarProgreso()
 */
function verificarProgreso() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const hojaHistorial = sheet.getSheetByName(CONFIG.SHEET_NAME);
  
  const datos = hojaHistorial.getDataRange().getValues();
  const headers = datos[0];
  const idxEstado = headers.indexOf('estado');
  
  if (idxEstado === -1) {
    Logger.log('❌ Columna "estado" no encontrada');
    return;
  }
  
  let pendientes = 0;
  let procesando = 0;
  let procesadas = 0;
  let errores = 0;
  
  for (let i = 1; i < datos.length; i++) {
    const estado = datos[i][idxEstado];
    
    if (estado === 'pendiente') pendientes++;
    else if (estado === 'procesando') procesando++;
    else if (estado === 'procesada') procesadas++;
    else if (estado === 'error') errores++;
  }
  
  Logger.log(`\n📊 PROGRESO DEL ENRIQUECIMIENTO:`);
  Logger.log(`   ⏳ Pendientes: ${pendientes}`);
  Logger.log(`   🔄 Procesando: ${procesando}`);
  Logger.log(`   ✅ Procesadas: ${procesadas}`);
  Logger.log(`   ❌ Errores: ${errores}`);
  Logger.log(`   📈 Total: ${pendientes + procesando + procesadas + errores}`);
}

// ============================================================================
// FUNCIÓN: REINTENTRAR ERRORES
// ============================================================================

/**
 * Reintenta las filas que tuvieron error
 * Ejecutar: reintentarErrores()
 */
function reintentarErrores() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const hojaHistorial = sheet.getSheetByName(CONFIG.SHEET_NAME);
  
  const datos = hojaHistorial.getDataRange().getValues();
  const headers = datos[0];
  const idxEstado = headers.indexOf('estado');
  
  if (idxEstado === -1) {
    Logger.log('❌ Columna "estado" no encontrada');
    return;
  }
  
  let contadorReintentos = 0;
  
  for (let i = 1; i < datos.length; i++) {
    if (datos[i][idxEstado] === 'error') {
      hojaHistorial.getRange(i + 1, idxEstado + 1).setValue('pendiente');
      contadorReintentos++;
    }
  }
  
  Logger.log(`🔄 ${contadorReintentos} filas marcadas para reintentar`);
  Logger.log(`   Ejecuta: iniciarEnriquecimiento()`);
}

// ============================================================================
// FUNCIÓN: TEST DE CONEXIÓN
// ============================================================================

/**
 * Testa la conexión con el endpoint de Railway
 * Ejecutar: testConexion()
 */
function testConexion() {
  Logger.log('🧪 Testeando conexión con Railway...');
  
  const testPayload = {
    prompt: 'Responde con un JSON: {"test": "ok"}',
    items: [
      {
        row: 999,
        url: 'https://example.com',
        keyword: 'test',
        texto: 'Este es un mensaje de prueba'
      }
    ]
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(testPayload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(CONFIG.RAILWAY_ENDPOINT, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log(`Status: ${responseCode}`);
    Logger.log(`Response: ${responseText}`);
    
    if (responseCode === 200) {
      Logger.log('✅ Conexión exitosa');
    } else {
      Logger.log('❌ Error en la conexión');
    }
  } catch (error) {
    Logger.log(`❌ Error: ${error.message}`);
  }
}
