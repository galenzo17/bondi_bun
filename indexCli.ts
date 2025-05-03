// src/index.ts
import { stdout } from 'process';

// Configuración con un canvas pequeño optimizado para móviles
const CANVAS_WIDTH = 20;
const CANVAS_HEIGHT = 10;
const DEFAULT_FPS = 8;

// Tipo de un frame de animación
type Frame = string[][];

// Crear un frame vacío
const createEmptyFrame = (): Frame => {
  return Array(CANVAS_HEIGHT).fill(null).map(() => Array(CANVAS_WIDTH).fill(' '));
};

// Animación de una lluvia de estrellas con nave espacial
const createSpaceAnimation = (): Frame[] => {
  const frames: Frame[] = [];
  const totalFrames = 30; // Más frames para una animación más fluida
  
  // Posiciones iniciales de las estrellas (x, y, velocidad)
  const stars: Array<[number, number, number]> = [];
  for (let i = 0; i < 15; i++) {
    stars.push([
      Math.floor(Math.random() * CANVAS_WIDTH),
      Math.floor(Math.random() * CANVAS_HEIGHT),
      Math.random() * 0.5 + 0.2 // Velocidad aleatoria entre 0.2 y 0.7
    ]);
  }
  
  // Posición inicial de la nave
  let shipX = 2;
  let shipY = Math.floor(CANVAS_HEIGHT / 2);
  
  // Movimiento de la nave (ondulación suave)
  const shipPath = [];
  for (let i = 0; i < totalFrames; i++) {
    const angle = (i / totalFrames) * Math.PI * 2;
    const y = Math.floor(CANVAS_HEIGHT / 2) + Math.floor(Math.sin(angle) * 2);
    shipPath.push(y);
  }
  
  // Crear cada frame de la animación
  for (let frame = 0; frame < totalFrames; frame++) {
    const newFrame = createEmptyFrame();
    
    // Dibujar estrellas y actualizar posiciones
    for (let i = 0; i < stars.length; i++) {
      let [x, y, speed] = stars[i];
      
      // Dibujar la estrella
      if (x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
        newFrame[Math.floor(y)][Math.floor(x)] = '.';
      }
      
      // Mover la estrella
      x -= speed;
      if (x < 0) {
        x = CANVAS_WIDTH - 1;
        y = Math.floor(Math.random() * CANVAS_HEIGHT);
      }
      
      stars[i] = [x, y, speed];
    }
    
    // Actualizar y dibujar la nave
    shipY = shipPath[frame];
    
    // Dibujar la nave (más detallada)
    if (shipY >= 0 && shipY < CANVAS_HEIGHT) {
      // Cuerpo principal de la nave
      if (shipX + 2 < CANVAS_WIDTH) newFrame[shipY][shipX + 2] = '>';
      if (shipX + 1 < CANVAS_WIDTH) newFrame[shipY][shipX + 1] = '=';
      if (shipX < CANVAS_WIDTH) newFrame[shipY][shipX] = '>';
      
      // Alas superiores e inferiores
      if (shipY - 1 >= 0 && shipX + 1 < CANVAS_WIDTH) newFrame[shipY - 1][shipX + 1] = '/';
      if (shipY + 1 < CANVAS_HEIGHT && shipX + 1 < CANVAS_WIDTH) newFrame[shipY + 1][shipX + 1] = '\\';
      
      // Propulsores (cambiantes para efecto de fuego)
      if (shipX - 1 >= 0) {
        const thrust = frame % 3;
        if (thrust === 0) newFrame[shipY][shipX - 1] = '~';
        else if (thrust === 1) newFrame[shipY][shipX - 1] = '-';
        else newFrame[shipY][shipX - 1] = '*';
      }
    }
    
    // Añadir texto de "SPACE" que aparece y desaparece
    if (frame % 15 < 7) {
      const text = "SPACE";
      const startX = Math.floor(CANVAS_WIDTH / 2) - Math.floor(text.length / 2);
      const textY = 1;
      
      for (let i = 0; i < text.length; i++) {
        const x = startX + i;
        if (x >= 0 && x < CANVAS_WIDTH) {
          newFrame[textY][x] = text[i];
        }
      }
    }
    
    // Ocasionalmente añadir un planeta o asteroide en el lado derecho
    if (frame % 10 === 0) {
      const planetY = Math.floor(Math.random() * CANVAS_HEIGHT);
      const planetX = CANVAS_WIDTH - 1;
      if (planetY >= 0 && planetY < CANVAS_HEIGHT) {
        newFrame[planetY][planetX] = 'O';
      }
    }
    
    frames.push(newFrame);
  }
  
  return frames;
};

// Limpiar la terminal
const clearScreen = (): void => {
  stdout.write('\x1b[2J');
  stdout.write('\x1b[0;0H');
};

// Dibujar un frame en la terminal
const renderFrame = (frame: Frame): void => {
  clearScreen();
  
  // Borde superior
  stdout.write('┌' + '─'.repeat(CANVAS_WIDTH) + '┐\n');
  
  // Contenido del canvas
  for (let y = 0; y < CANVAS_HEIGHT; y++) {
    stdout.write('│');
    for (let x = 0; x < CANVAS_WIDTH; x++) {
      stdout.write(frame[y][x]);
    }
    stdout.write('│\n');
  }
  
  // Borde inferior
  stdout.write('└' + '─'.repeat(CANVAS_WIDTH) + '┘\n');
  
  // Instrucciones simples
  stdout.write('\n');
  stdout.write('Animación espacial\n');
  stdout.write('Presiona Ctrl+C para salir\n');
};

// Reproducir una animación en bucle
const playAnimation = (frames: Frame[], fps: number): ReturnType<typeof setInterval> => {
  let currentFrame = 0;
  
  return setInterval(() => {
    renderFrame(frames[currentFrame]);
    currentFrame = (currentFrame + 1) % frames.length;
  }, 1000 / fps);
};

// Crear la animación
const spaceAnimation = createSpaceAnimation();

// Configurar la captura de teclas para salir
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', (key: Buffer) => {
  // Ctrl+C para salir
  if (key.toString() === '\u0003') {
    clearScreen();
    process.exit(0);
  }
});

// Iniciar la aplicación con la animación espacial
clearScreen();
console.log('Iniciando Animación Espacial...');

setTimeout(() => {
  playAnimation(spaceAnimation, DEFAULT_FPS);
}, 500);