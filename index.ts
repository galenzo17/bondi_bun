const server = Bun.serve({
  port: process.env.PORT || 3000,
  hostname: "0.0.0.0", // Importante para Replit
  
  async fetch(req) {
    const url = new URL(req.url);
    
    // Servir index.html para la ruta raíz
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const file = Bun.file("index.html");
      
      if (await file.exists()) {
        return new Response(file, {
          headers: {
            "Content-Type": "text/html",
            "Cache-Control": "no-cache"
          }
        });
      }
    }
    
    // Servir otros archivos estáticos si los tienes
    const filePath = url.pathname.slice(1);
    if (filePath) {
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file);
      }
    }
    
    return new Response("404 - Archivo no encontrado", { 
      status: 404,
      headers: { "Content-Type": "text/plain" }
    });
  },
});

console.log(`🚀 Servidor ASCII Camera corriendo en http://localhost:${server.port}`);
console.log(`📱 Accesible en: ${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);