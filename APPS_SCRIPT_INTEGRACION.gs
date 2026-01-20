// ============================================================================
// APPS SCRIPT - INTEGRACIÓN CON RAILWAY WORKER
// ============================================================================
// LÓGICA CORRECTA:
// - Busca filas donde estado_analisis está VACÍO (no enriquecidas)
// - Envía el contenido de "resumen_chatgpt" a Railway
// - Recibe análisis y lo guarda en las columnas correspondientes
// - Marca estado_analisis como "analizada"
// ============================================================================

const CONFIG = {
  RAILWAY_ENDPOINT: 'https://web-production-5cf4f.up.railway.app',
  SHEET_NAME: 'Historial_Resultados',
  PROMPT_SHEET: 'Prompt_ChatGPT',
};

/**
 * Inicia el enriquecimiento de filas no analizadas
 * Ejecutar: iniciarEnriquecimiento()
 */
function iniciarEnriquecimiento() {
  Logger.log('🧠 Iniciando enriquecimiento con Railway...');
  
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const hojaHistorial = sheet.getSheetByName(CONFIG.SHEET_NAME);
    
    const datos = hojaHistorial.getDataRange().getValues();
    const headers = datos[0];
    
    // Encontrar índices de columnas
    const idxEstadoAnalisis = headers.indexOf('estado_analisis');
    const idxResumenChatGPT = headers.indexOf('resumen_chatgpt');
    const idxURL = headers.indexOf('url');
    const idxKeyword = headers.indexOf('keyword');
    const idxAnalisisResumen = headers.indexOf('analisis_resumen');
    const idxPropuestaComunicativa = headers.indexOf('propuesta_comunicativa');
    const idxAccionRecomendada = headers.indexOf('accion_recomendada');
    
    if (idxEstadoAnalisis === -1 || idxResumenChatGPT === -1) {
      throw new Error('Columnas requeridas no encontradas: estado_analisis o resumen_chatgpt');
    }
    
    // Leer prompt
    const hojaPrompt = sheet.getSheetByName(CONFIG.PROMPT_SHEET);
    const prompt = hojaPrompt.getRange('A7').getValue();
    
    if (!prompt) {
      throw new Error('Prompt no encontrado en ' + CONFIG.PROMPT_SHEET + ' celda A7');
    }
    
    // Encontrar filas NO ANALIZADAS (estado_analisis vacío)
    const items = [];
    
    for (let i = 1; i < datos.length; i++) {
      const estadoAnalisis = datos[i][idxEstadoAnalisis];
      const contenido = datos[i][idxResumenChatGPT];
      const url = datos[i][idxURL];
      const keyword = datos[i][idxKeyword];
      
      // Condición: estado_analisis VACÍO Y contenido NO VACÍO
      if (!estadoAnalisis && contenido) {
        items.push({
          row: i + 1,  // Número de fila en Google Sheets (1-indexed)
          url: url || '',
          keyword: keyword || '',
          texto: contenido
        });
      }
    }
    
    if (items.length === 0) {
      Logger.log('⚠️ No hay filas pendientes de análisis');
      return;
    }
    
    Logger.log(`📊 Encontradas ${items.length} filas pendientes de análisis`);
    
    // Enviar al worker de Railway
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
    
    const result = JSON.parse(responseText);
    
    if (!result.ok || !Array.isArray(result.results)) {
      throw new Error('Respuesta inválida del servidor: ' + responseText);
    }
    
    Logger.log(`✅ Respuesta recibida con ${result.results.length} resultados`);
    
    // Actualizar Google Sheets con los resultados
    let contadorExitoso = 0;
    let contadorError = 0;
    
    for (const resultItem of result.results) {
      const { row, analisis, propuesta, accion } = resultItem;
      
      try {
        // Actualizar columnas de resultado
        if (idxAnalisisResumen !== -1 && analisis) {
          hojaHistorial.getRange(row, idxAnalisisResumen + 1).setValue(analisis);
        }
        if (idxPropuestaComunicativa !== -1 && propuesta) {
          hojaHistorial.getRange(row, idxPropuestaComunicativa + 1).setValue(propuesta);
        }
        if (idxAccionRecomendada !== -1 && accion) {
          hojaHistorial.getRange(row, idxAccionRecomendada + 1).setValue(accion);
        }
        
        // Marcar como analizada
        hojaHistorial.getRange(row, idxEstadoAnalisis + 1).setValue('analizada');
        
        if (accion === 'error') {
          contadorError++;
          Logger.log(`⚠️ Fila ${row} procesada con error`);
        } else {
          contadorExitoso++;
          Logger.log(`✅ Fila ${row} enriquecida correctamente`);
        }
      } catch (error) {
        Logger.log(`❌ Error actualizando fila ${row}: ${error.message}`);
        contadorError++;
      }
    }
    
    Logger.log(`\n📈 RESUMEN:`);
    Logger.log(`   ✅ Enriquecidas correctamente: ${contadorExitoso}`);
    Logger.log(`   ❌ Con error: ${contadorError}`);
    Logger.log(`\n✨ Enriquecimiento completado`);
    
  } catch (error) {
    Logger.log(`❌ Error general: ${error.message}`);
    throw error;
  }
}

/**
 * Verifica el progreso del enriquecimiento
 * Ejecutar: verificarProgreso()
 */
function verificarProgreso() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const hojaHistorial = sheet.getSheetByName(CONFIG.SHEET_NAME);
  
  const datos = hojaHistorial.getDataRange().getValues();
  const headers = datos[0];
  const idxEstadoAnalisis = headers.indexOf('estado_analisis');
  
  if (idxEstadoAnalisis === -1) {
    Logger.log('❌ Columna "estado_analisis" no encontrada');
    return;
  }
  
  let pendientes = 0;
  let analizadas = 0;
  
  for (let i = 1; i < datos.length; i++) {
    const estadoAnalisis = datos[i][idxEstadoAnalisis];
    
    if (!estadoAnalisis) {
      pendientes++;
    } else if (estadoAnalisis === 'analizada') {
      analizadas++;
    }
  }
  
  Logger.log(`\n📊 PROGRESO DEL ENRIQUECIMIENTO:`);
  Logger.log(`   ⏳ Pendientes de análisis: ${pendientes}`);
  Logger.log(`   ✅ Analizadas: ${analizadas}`);
  Logger.log(`   📈 Total: ${pendientes + analizadas}`);
}

/**
 * Testa la conexión con el endpoint de Railway
 * Ejecutar: testConexion()
 */
function testConexion() {
  Logger.log('🧪 Testeando conexión con Railway...');
  
  const testPayload = {
    prompt: 'Eres un asistente de análisis. Responde brevemente sobre el contenido.',
    items: [
      {
        row: 999,
        url: 'https://example.com',
        keyword: 'test',
        texto: 'Este es un mensaje de prueba para verificar que el endpoint funciona correctamente.'
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
      const result = JSON.parse(responseText);
      if (result.ok) {
        Logger.log('✅ Conexión exitosa - Endpoint funcionando correctamente');
      } else {
        Logger.log('⚠️ Respuesta recibida pero con error: ' + result.error);
      }
    } else {
      Logger.log('❌ Error en la conexión (código ' + responseCode + ')');
    }
  } catch (error) {
    Logger.log(`❌ Error: ${error.message}`);
  }
}

/**
 * Limpiar estado_analisis para reintentar (solo para testing)
 * Ejecutar: limpiarEstadoAnalisis()
 */
function limpiarEstadoAnalisis() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const hojaHistorial = sheet.getSheetByName(CONFIG.SHEET_NAME);
  
  const datos = hojaHistorial.getDataRange().getValues();
  const headers = datos[0];
  const idxEstadoAnalisis = headers.indexOf('estado_analisis');
  
  if (idxEstadoAnalisis === -1) {
    Logger.log('❌ Columna "estado_analisis" no encontrada');
    return;
  }
  
  // Limpiar estado_analisis (dejar vacío)
  for (let i = 1; i < datos.length; i++) {
    hojaHistorial.getRange(i + 1, idxEstadoAnalisis + 1).setValue('');
  }
  
  Logger.log(`🧹 Estado_analisis limpiado - todas las filas listas para análisis`);
}
