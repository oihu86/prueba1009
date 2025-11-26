import http from "http";
import fs from "fs";
import path from "path";
import { EventEmitter } from "events";
import { marked } from "marked";

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 8080;
const emitter = new EventEmitter();

// --- Archivos de configuración ---
// El orden de los archivos es importante para la carga secuencial
const FILE_MAP = {
  tema1: ["tema1_doc1.md", "tema1_doc2.md", "tema1_doc3.md"],
  tema2: ["tema2_doc1.md", "tema2_doc2.md", "tema2_doc3.md"],
};

/**
 * Función para cargar secuencialmente archivos .md usando Streams y EventEmitter.
 * @param {string[]} files - Array de nombres de archivo a cargar.
 * @param {http.ServerResponse} res - El objeto de respuesta HTTP para escribir el contenido.
 * @param {number} index - Índice del archivo actual a cargar.
 */
function loadMarkdownSequentially(files, res, index = 0) {
  if (index >= files.length) {
    // Cuando todos los archivos han sido cargados
    emitter.emit("loadComplete", res);
    return;
  }

  const filename = files[index];
  const filePath = path.join(__dirname, "content", filename);

  console.log(`➡️ Leyendo ${filename}...`);

  // 1. Crear un stream de lectura (fs.createReadStream)
  const readStream = fs.createReadStream(filePath, "utf8");
  let markdownContent = "";

  // 2. Encabezado para separar el contenido
  res.write(`<hr><h3>Contenido de ${filename}</h3>\n`);

  // Escuchar el evento 'data' del stream de lectura
  readStream.on("data", (chunk) => {
    // 3. Escribir el chunk directamente en la respuesta HTTP
    markdownContent += chunk;
  });

  // Escuchar el evento 'end' cuando el stream haya terminado de leer el archivo
  readStream.on("end", () => {
    const htmlContent = marked(markdownContent);
    // 3. Escribir el contenido HTML convertido en la respuesta HTTP
    res.write(`<hr><h3>Contenido de ${filename} (Formateado)</h3>\n`);
    res.write(htmlContent);
    console.log(`✅ ${filename} terminado y formateado`);
    // 4. Emitir un evento para indicar que el archivo actual ha finalizado
    emitter.emit("fileLoaded", files, res, index + 1);
  });

  // Manejo de errores
  readStream.on("error", (err) => {
    console.error(`🚨 Error al leer ${filename}:`, err.message);
    res.write(`<p class="error">Error al cargar ${filename}</p>`);
    // Aunque haya error, intentar pasar al siguiente para no colgarse
    emitter.emit("fileLoaded", files, res, index + 1);
  });
}

// Escuchar el evento 'fileLoaded' para cargar el siguiente archivo en la secuencia
emitter.on("fileLoaded", loadMarkdownSequentially);

// Escuchar el evento 'loadComplete' para finalizar la respuesta HTTP
emitter.on("loadComplete", (res) => {
  res.end();
  console.log("🏁 Respuesta HTTP finalizada.");
});

// --- Configuración del Servidor HTTP ---

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname === "/") {
    // Servir el archivo HTML
    const htmlPath = path.join(__dirname, "index.html");
    res.writeHead(200, { "Content-Type": "text/html" });
    fs.createReadStream(htmlPath).pipe(res);
    return;
  } else if (pathname === "/style.css") {
    // Servir el archivo CSS
    const cssPath = path.join(__dirname, "style.css");
    res.writeHead(200, { "Content-Type": "text/css" });
    fs.createReadStream(cssPath).pipe(res);
    return;
  } else if (pathname === "/content") {
    // Manejar la solicitud de contenido Markdown
    const topic = url.searchParams.get("topic");
    const filesToLoad = FILE_MAP[topic];

    if (!filesToLoad) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Tema no encontrado.");
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      // Esto asegura que el contenido no se comprima o guarde en caché fácilmente
      "Transfer-Encoding": "chunked",
    });

    // Iniciar la carga secuencial con el primer archivo (índice 0)
    loadMarkdownSequentially(filesToLoad, res, 0);
  } else {
    // Ruta no encontrada
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log("Abre esta URL en tu navegador.");
});
