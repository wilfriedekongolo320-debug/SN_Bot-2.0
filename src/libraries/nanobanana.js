/**
 * Ai Image Editing - Nano Banana (Versión Corregida y Estable)
 * Author  : gienetic & FongsiDev
 * Base    : https://nanobanana.ai
 * Nota: Este servicio puede requerir API Key oficial
 */
import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import fs from "fs";

// ✅ Headers estándar y realistas (evitan detección de bot)
function getStandardHeaders() {
  return {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/json",
    "origin": "https://nanobanana.ai",
    "referer": "https://nanobanana.ai/",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };
}

class NanoBananaClient {
  constructor(apiKey = null) {
    this.jar = new CookieJar();
    this.apiKey = apiKey;
    
    this.api = wrapper(
      axios.create({
        baseURL: "https://nanobanana.ai",
        headers: getStandardHeaders(),
        jar: this.jar,
        withCredentials: true,
        timeout: 30000,
        maxRedirects: 5,
      })
    );

    // Interceptor para agregar API Key si existe
    if (apiKey) {
      this.api.interceptors.request.use(config => {
        config.headers["Authorization"] = `Bearer ${apiKey}`;
        return config;
      });
    }
  }

  async initSession() {
    try {      const res = await this.api.get("/api/auth/session");
      return res.data;
    } catch (error) {
      // No bloquear si la sesión opcional falla
      console.warn("⚠️ initSession falló, continuando...", error.code || error.message);
      return null;
    }
  }

  async getUploadUrl(file, filename = "upload.jpg") {
    const fileSize = Buffer.isBuffer(file) 
      ? file.length 
      : (file.size || file.byteLength || 0);
    
    const contentType = "image/jpeg";
    
    const res = await this.api.post("/api/get-upload-url", {
      fileName: filename,
      contentType: contentType,
      fileSize: fileSize,
    });
    
    if (!res.data?.uploadUrl || !res.data?.publicUrl) {
      throw new Error("❌ Respuesta inválida de get-upload-url: " + JSON.stringify(res.data));
    }
    
    return { 
      uploadUrl: res.data.uploadUrl, 
      publicUrl: res.data.publicUrl, 
      file 
    };
  }

  async uploadFile(uploadUrl, file, contentType = "image/jpeg") {
    // Las URLs pre-firmadas (S3/Cloud) no necesitan cookies de sesión
    await axios.put(uploadUrl, file, {
      headers: { 
        "content-type": contentType,
        "content-length": Buffer.isBuffer(file) ? file.length : (file.size || file.byteLength)
      },
      timeout: 60000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
  }

  async generateImage(prompt, styleId, publicUrl) {
    const payload = {
      prompt,
      styleId: styleId || "realistic",      mode: "image",
      imageUrl: publicUrl,
    };

    const res = await this.api.post("/api/generate-image", payload);
    
    if (!res.data?.taskId) {
      throw new Error("❌ No se recibió taskId: " + JSON.stringify(res.data));
    }
    
    return res.data;
  }

  async checkStatus(taskId) {
    const res = await this.api.get("/api/generate-image/status", {
      params: { taskId, _t: Date.now() }, // Evitar caché
      timeout: 15000,
    });
    return res.data;
  }

  async waitForResult(taskId, pollInterval = 5000, pollTimeout = 2 * 60 * 1000) {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const timer = setInterval(async () => {
        try {
          if (Date.now() - startTime > pollTimeout) {
            clearInterval(timer);
            reject(new Error(`⏳ Timeout (${pollTimeout/1000}s) esperando resultado.`));
            return;
          }

          const status = await this.checkStatus(taskId);
          const st = status?.status?.toLowerCase();

          if (st === "completed" || st === "success") {
            clearInterval(timer);
            resolve(status);
          } else if (st === "failed" || st === "error") {
            clearInterval(timer);
            const errorMsg = status.error || status.message || "Error desconocido";
            reject(new Error(`❌ Tarea fallida: ${errorMsg}`));
          }
          // pending/processing/waiting → continuar polling
          
        } catch (err) {
          // Reintentar errores de red transitorios
          if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'EAI_AGAIN') {
            console.warn(`⚠️ Error de red, reintentando... (${err.code})`);            return;
          }
          clearInterval(timer);
          reject(new Error(`❌ Error en polling: ${err.message}`));
        }
      }, pollInterval);
    });
  }
}

// ============================================================================
// 🔧 FUNCIÓN PRINCIPAL: img2img (COMPATIBLE CON TU BOT)
// ============================================================================
export async function img2img(imageBuffer, prompt, options = {}) {
  // 🎯 Manejo flexible de parámetros (soporta signature antigua y nueva)
  let pollInterval = 5000;
  let pollTimeout = 2 * 60 * 1000;
  let styleId = "realistic";
  let apiKey = null;
  let filename = null;
  
  if (typeof options === 'object' && options !== null) {
    pollInterval = options.pollInterval ?? pollInterval;
    pollTimeout = options.pollTimeout ?? pollTimeout;
    styleId = options.styleId ?? styleId;
    apiKey = options.apiKey ?? apiKey;
    filename = options.filename ?? filename;
  } else if (typeof options === 'number') {
    // Soporte legacy: img2img(buffer, prompt, 5000)
    pollInterval = options;
  }

  try {
    // Validaciones de entrada
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
      throw new Error("❌ imageBuffer debe ser un Buffer válido no vacío");
    }
    if (!prompt || typeof prompt !== 'string') {
      throw new Error("❌ prompt debe ser una cadena de texto");
    }

    const client = new NanoBananaClient(apiKey);
    await client.initSession();

    // 🔧 Generar filename único y seguro
    const safeFilename = filename || `img_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.jpg`;

    console.log("📤 Obteniendo URL de subida...");
    const { uploadUrl, publicUrl } = await client.getUploadUrl(imageBuffer, safeFilename);
    console.log("🔄 Subiendo imagen...");
    await client.uploadFile(uploadUrl, imageBuffer);

    console.log("🎨 Generando imagen con prompt:", prompt);
    const task = await client.generateImage(prompt, styleId, publicUrl);

    console.log("⏳ Esperando resultado (taskId:", task.taskId + ")...");
    const result = await client.waitForResult(task.taskId, pollInterval, pollTimeout);

    // Extraer URL de resultado de múltiples posibles campos
    const resultUrl = result?.result?.url 
      || result?.imageUrl 
      || result?.url 
      || result?.output?.url;
      
    if (!resultUrl) {
      console.warn("⚠️ Respuesta completa:", JSON.stringify(result, null, 2));
      throw new Error("⚠️ No se encontró URL de imagen en la respuesta");
    }

    console.log("📥 Descargando resultado...");
    const resultImg = await axios.get(resultUrl, { 
      responseType: "arraybuffer",
      timeout: 30000,
      headers: { "user-agent": getStandardHeaders()["user-agent"] }
    });

    console.log("✅ Imagen generada exitosamente!");
    return Buffer.from(resultImg.data);

  } catch (error) {
    // Manejo de errores específico y útil
    if (error.response) {
      const { status, data } = error.response;
      console.error(`❌ Error HTTP ${status}:`, data);
      
      if (status === 429) {
        throw new Error("🚫 Rate limit excedido. Espera ~60s antes de reintentar.");
      } else if (status === 401 || status === 403) {
        throw new Error("🔐 Error de autenticación. El servicio puede requerir API Key oficial.");
      } else if (status === 400) {
        throw new Error(`📭 Solicitud inválida: ${JSON.stringify(data)}`);
      } else if (status >= 500) {
        throw new Error("🔧 Error interno del servidor. Intenta más tarde.");
      } else {
        throw new Error(`❌ Error ${status}: ${JSON.stringify(data)}`);
      }
    } else if (error.request) {
      // Error de conexión / DNS / Timeout
      const code = error.code || error.errno;      if (code === 'EAI_AGAIN' || code === 'ENOTFOUND') {
        throw new Error("🌐 No se pudo resolver nanobanana.ai. Verifica tu DNS o si el servicio está activo.");
      } else if (code === 'ETIMEDOUT' || code === 'ECONNABORTED') {
        throw new Error("⏳ Conexión agotada. El servidor no responde a tiempo.");
      } else {
        throw new Error(`🌐 Error de conexión: ${code || error.message}`);
      }
    } else {
      // Error de lógica o aplicación
      throw error;
    }
  }
}

// ============================================================================
// 📁 FUNCIÓN AUXILIAR: img2imgFromFile
// ============================================================================
export async function img2imgFromFile(filePath, prompt, options = {}) {
  // Manejo flexible de parámetros para esta función también
  let pollInterval = 5000;
  let filename = null;
  
  if (typeof options === 'object' && options !== null) {
    pollInterval = options.pollInterval ?? pollInterval;
    filename = options.filename;
  } else if (typeof options === 'number') {
    pollInterval = options;
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`❌ Archivo no encontrado: ${filePath}`);
  }
  
  const imageBuffer = fs.readFileSync(filePath);
  const safeFilename = filename || filePath.split(/[\\/]/).pop() || `img_${Date.now()}.jpg`;
  
  const opts = {
    ...(typeof options === 'object' && options !== null ? options : {}),
    pollInterval,
    filename: safeFilename
  };
  
  return img2img(imageBuffer, prompt, opts);
}

// ============================================================================
// 🧪 FUNCIÓN DE DIAGNÓSTICO OPCIONAL
// ============================================================================
export async function testNanoBananaConnection() {
  try {    const res = await axios.get("https://nanobanana.ai", { 
      timeout: 10000,
      headers: { "user-agent": getStandardHeaders()["user-agent"] }
    });
    console.log("✅ nanobanana.ai responde:", res.status);
    return true;
  } catch (e) {
    console.error("❌ No se puede conectar a nanobanana.ai:", e.code || e.message);
    return false;
  }
}
