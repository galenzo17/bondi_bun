import { Elysia } from 'elysia';
import { createAI, generateText, experimental_createMCPClient as createMCPClient } from 'ai';
import { createOllama } from 'ollama-ai-provider';

// Clase para el transporte SSE para conectarse al servidor MCP
class StreamableHTTPClientTransport {
  #url: string;
  #headers: Record<string, string>;
  #events: Record<string, any> = {};
  #sessionId: string | null = null;
  #eventSource: EventSource | null = null;
  
  constructor(url: string, headers: Record<string, string> = {}) {
    this.#url = url;
    this.#headers = headers;
  }
  
  async connect() {
    return new Promise<void>((resolve, reject) => {
      try {
        const headerParams = new URLSearchParams();
        Object.entries(this.#headers).forEach(([key, value]) => {
          headerParams.append(key, value);
        });
        
        const url = `${this.#url}?${headerParams.toString()}`;
        this.#eventSource = new EventSource(url);
        
        this.#eventSource.addEventListener('connected', (event) => {
          try {
            const data = JSON.parse(event.data);
            this.#sessionId = data.sessionId;
            resolve();
          } catch (err) {
            reject(new Error('Invalid connected event'));
          }
        });
        
        this.#eventSource.addEventListener('error', (event) => {
          reject(new Error('SSE connection error'));
        });
        
        this.#eventSource.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (this.#events['message']) {
              this.#events['message'](data);
            }
          } catch (err) {
            console.error('Error parsing message:', err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }
  
  async send(message: any) {
    const response = await fetch(`${this.#url.replace('/sse', '')}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.#headers
      },
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    
    return { id: Date.now().toString() };
  }
  
  close() {
    if (this.#eventSource) {
      this.#eventSource.close();
      this.#eventSource = null;
    }
  }
  
  on(event: string, callback: (data: any) => void) {
    this.#events[event] = callback;
    return this;
  }
}

// Configuración de Ollama
// Crea una instancia del proveedor Ollama con la configuración por defecto
// (se conectará a http://localhost:11434/api)
const ollama = createOllama();
// Puedes personalizarlo así:
// const ollama = createOllama({
//   baseUrl: 'http://localhost:11434/api', // URL de la API de Ollama
// });

// Crear aplicación Elysia para el cliente
const app = new Elysia()
  .get('/', () => 'Elysia MCP Client with Ollama')
  .post('/api/chat', async ({ body, set }) => {
    try {
      if (!body || !Array.isArray(body.messages)) {
        set.status = 400;
        return { error: 'Invalid request format' };
      }
      
      const messages = body.messages;
      
      // Crear cliente MCP
      const mcpClient = await createMCPClient({
        transport: {
          type: 'custom',
          transport: new StreamableHTTPClientTransport('http://localhost:3001/sse')
        }
      });
      
      try {
        // Obtener las herramientas del servidor MCP
        const tools = await mcpClient.tools();
        
        // Define el modelo de Ollama que deseas usar
        // Ejemplos: 'llama3', 'mistral', 'phi', etc.
        const modelName = 'phi4';
        
        // Generar respuesta utilizando Ollama local
        const response = await generateText({
          model: ollama(modelName),
          messages,
          tools, // Pasar las herramientas MCP al modelo
          maxTokens: 1000
        });
        
        // Cerrar el cliente MCP
        await mcpClient.close();
        
        return { response };
      } catch (error) {
        console.error('Generation error:', error);
        await mcpClient.close();
        throw error;
      }
    } catch (error) {
      console.error('Chat API error:', error);
      set.status = 500;
      return { error: 'Internal server error' };
    }
  })
  .post('/api/completion', async ({ body, set }) => {
    try {
      if (!body || !body.prompt) {
        set.status = 400;
        return { error: 'Invalid request format' };
      }
      
      const prompt = body.prompt;
      
      // Crear cliente MCP
      const mcpClient = await createMCPClient({
        transport: {
          type: 'custom',
          transport: new StreamableHTTPClientTransport('http://localhost:3001/sse')
        }
      });
      
      try {
        // Obtener las herramientas del servidor MCP
        const tools = await mcpClient.tools();
        
        // Define el modelo de Ollama que deseas usar
        const modelName = 'llama3';
        
        // Generar respuesta utilizando Ollama local
        const response = await generateText({
          model: ollama(modelName),
          messages: [{ role: 'user', content: prompt }],
          tools, // Pasar las herramientas MCP al modelo
          maxTokens: 1000
        });
        
        // Cerrar el cliente MCP
        await mcpClient.close();
        
        return { completion: response };
      } catch (error) {
        console.error('Completion error:', error);
        await mcpClient.close();
        throw error;
      }
    } catch (error) {
      console.error('Completion API error:', error);
      set.status = 500;
      return { error: 'Internal server error' };
    }
  })
  .get('/api/models', async ({ set }) => {
    try {
      // Crear cliente MCP
      const mcpClient = await createMCPClient({
        transport: {
          type: 'custom',
          transport: new StreamableHTTPClientTransport('http://localhost:3001/sse')
        }
      });
      
      try {
        // Obtener las herramientas del servidor MCP
        const tools = await mcpClient.tools();
        
        // Usar la herramienta de listar modelos
        const listModelsToolDef = tools.find(tool => tool.name === 'list_models');
        
        if (!listModelsToolDef) {
          throw new Error('list_models tool not found');
        }
        
        // Ejecutar la herramienta
        const result = await listModelsToolDef.execute({});
        
        // Cerrar el cliente MCP
        await mcpClient.close();
        
        return result;
      } catch (error) {
        console.error('Models API error:', error);
        await mcpClient.close();
        throw error;
      }
    } catch (error) {
      console.error('Models API error:', error);
      set.status = 500;
      return { error: 'Internal server error' };
    }
  })
  .listen(3000);

console.log(`🚀 MCP Client running at http://${app.server?.hostname}:${app.server?.port}`);

// Exportar para TypeScript
export type { };