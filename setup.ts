// Archivo: package.json
{
  "name": "space-invaders-mobile",
  "version": "1.0.0",
  "type": "module",
  "main": "index.ts",
  "dependencies": {
    "phaser": "^3.60.0",
    "express": "^4.18.2"
  }
}

// Archivo: src/index.js
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(join(__dirname, '../public')));

app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});

// Archivo: public/index.html
// Guardar como: public/index.html
`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Space Invaders Mobile</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #000;
            overflow: hidden;
            touch-action: none;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -khtml-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }
        #game-container {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 100vh;
        }
    </style>
</head>
<body>
    <div id="game-container"></div>
    <script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>
    <script src="js/game.js" type="module"></script>
</body>
</html>`

// Archivo: public/js/game.js
// Guardar como: public/js/game.js
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#000000',
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

// Variables globales
let player;
let aliens;
let bullets;
let enemyBullets;
let explosions;
let scoreText;
let livesText;
let gameOverText;
let restartText;
let leftButton;
let rightButton;
let fireButton;
let score = 0;
let lives = 3;
let gameOver = false;
let alienDirection = 1;
let alienMoveCounter = 0;
let gameWidth;
let gameHeight;
let alienRows = 4;
let alienCols = 6;
let alienSpeed = 1;
let alienFireRate = 1000; // ms entre disparos
let touchLeft = false;
let touchRight = false;
let isFireButtonPressed = false;
let lastFired = 0;
let fireRate = 500; // tiempo entre disparos del jugador (ms)
let invincible = false;
let levelText;
let level = 1;
let startButton;
let gameStarted = false;
let pauseButton;
let gamePaused = false;
let pauseOverlay;
let resumeButton;
let currentTime = 0;
let scorePopups = [];

const game = new Phaser.Game(config);

function preload() {
    this.load.image('player', 'assets/player.png');
    this.load.image('alien', 'assets/alien.png');
    this.load.image('bullet', 'assets/bullet.png');
    this.load.image('enemyBullet', 'assets/enemy-bullet.png');
    this.load.spritesheet('explosion', 'assets/explosion.png', { frameWidth: 64, frameHeight: 64 });
    this.load.image('background', 'assets/background.png');
    this.load.image('button', 'assets/button.png');
}

function create() {
    gameWidth = this.scale.width;
    gameHeight = this.scale.height;

    // Fondo con parallax
    this.background = this.add.tileSprite(0, 0, gameWidth, gameHeight, 'background');
    this.background.setOrigin(0, 0);

    // Inicializar textos
    scoreText = this.add.text(16, 16, 'Puntos: 0', { fontSize: '18px', fill: '#fff' });
    livesText = this.add.text(gameWidth - 150, 16, 'Vidas: 3', { fontSize: '18px', fill: '#fff' });
    levelText = this.add.text(gameWidth / 2 - 40, 16, 'Nivel: 1', { fontSize: '18px', fill: '#fff' });

    // Pantalla inicial
    const startScreen = this.add.rectangle(0, 0, gameWidth, gameHeight, 0x000000, 0.8);
    startScreen.setOrigin(0, 0);

    const title = this.add.text(gameWidth / 2, gameHeight / 4, 'SPACE INVADERS', { 
        fontSize: '40px', 
        fill: '#fff',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    startButton = this.add.text(gameWidth / 2, gameHeight / 2, 'COMENZAR', { 
        fontSize: '30px', 
        fill: '#fff',
        backgroundColor: '#4a4a4a',
        padding: { x: 20, y: 10 }
    }).setOrigin(0.5);

    startButton.setInteractive();
    startButton.on('pointerdown', () => {
        startScreen.destroy();
        title.destroy();
        startButton.destroy();

        // Iniciar el juego
        initGame.call(this);
        gameStarted = true;
    });

    // Animación para la explosión
    this.anims.create({
        key: 'explode',
        frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 15 }),
        frameRate: 24,
        repeat: 0
    });
}

function initGame() {
    // Crear jugador
    player = this.physics.add.sprite(gameWidth / 2, gameHeight - 50, 'player');
    player.setCollideWorldBounds(true);
    player.setScale(gameWidth / 1500); // Escala adaptada a la pantalla

    // Crear aliens
    createAliens.call(this);

    // Crear balas del jugador
    bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 10
    });

    // Crear balas enemigas
    enemyBullets = this.physics.add.group({
        defaultKey: 'enemyBullet',
        maxSize: 30
    });

    // Grupo para explosiones
    explosions = this.add.group();

    // Colisiones
    this.physics.add.overlap(bullets, aliens, bulletHitAlien, null, this);
    this.physics.add.overlap(player, enemyBullets, enemyBulletHitPlayer, null, this);

    // Timer para disparos enemigos
    this.time.addEvent({ 
        delay: alienFireRate, 
        callback: alienFire, 
        callbackScope: this, 
        loop: true 
    });

    // Controles táctiles
    createTouchControls.call(this);

    // Botón de pausa
    pauseButton = this.add.text(gameWidth - 80, 16, 'PAUSA', {
        fontSize: '18px',
        fill: '#fff',
        backgroundColor: '#4a4a4a',
        padding: { x: 10, y: 5 }
    });

    pauseButton.setInteractive();
    pauseButton.on('pointerdown', togglePause, this);
}

function createAliens() {
    aliens = this.physics.add.group();

    const alienSize = gameWidth / 15;
    const xOffset = (gameWidth - (alienCols * alienSize * 1.5)) / 2;
    const yOffset = gameHeight / 8;

    for (let y = 0; y < alienRows; y++) {
        for (let x = 0; x < alienCols; x++) {
            const alien = aliens.create(xOffset + x * alienSize * 1.5, yOffset + y * alienSize * 1.5, 'alien');
            alien.setScale(alienSize / alien.width);
            alien.setOrigin(0.5);
            alien.setCollideWorldBounds(true);
            // Dar a cada alien una puntuación basada en su fila (los más cercanos valen menos)
            alien.points = (alienRows - y) * 10;
        }
    }
}

function createTouchControls() {
    // Controles de dirección - Dividir la pantalla en tres partes
    const buttonHeight = 80;
    const buttonWidth = gameWidth / 3;

    // Área izquierda para moverse a la izquierda
    leftButton = this.add.rectangle(0, gameHeight - buttonHeight / 2, buttonWidth, buttonHeight, 0x0000ff, 0.2);
    leftButton.setOrigin(0, 0.5);
    leftButton.setInteractive();
    leftButton.on('pointerdown', () => { touchLeft = true; });
    leftButton.on('pointerup', () => { touchLeft = false; });
    leftButton.on('pointerout', () => { touchLeft = false; });

    // Área central para disparar
    fireButton = this.add.rectangle(buttonWidth, gameHeight - buttonHeight / 2, buttonWidth, buttonHeight, 0xff0000, 0.2);
    fireButton.setOrigin(0, 0.5);
    fireButton.setInteractive();
    fireButton.on('pointerdown', () => { isFireButtonPressed = true; });
    fireButton.on('pointerup', () => { isFireButtonPressed = false; });
    fireButton.on('pointerout', () => { isFireButtonPressed = false; });

    // Área derecha para moverse a la derecha
    rightButton = this.add.rectangle(buttonWidth * 2, gameHeight - buttonHeight / 2, buttonWidth, buttonHeight, 0x0000ff, 0.2);
    rightButton.setOrigin(0, 0.5);
    rightButton.setInteractive();
    rightButton.on('pointerdown', () => { touchRight = true; });
    rightButton.on('pointerup', () => { touchRight = false; });
    rightButton.on('pointerout', () => { touchRight = false; });

    // Textos informativos
    this.add.text(leftButton.x + leftButton.width / 2, gameHeight - buttonHeight / 2, '←', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
    this.add.text(fireButton.x + fireButton.width / 2, gameHeight - buttonHeight / 2, 'DISPARO', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);
    this.add.text(rightButton.x + rightButton.width / 2, gameHeight - buttonHeight / 2, '→', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
}

function togglePause() {
    gamePaused = !gamePaused;

    if (gamePaused) {
        // Crear overlay de pausa
        pauseOverlay = this.add.rectangle(0, 0, gameWidth, gameHeight, 0x000000, 0.7);
        pauseOverlay.setOrigin(0, 0);

        const pauseTitle = this.add.text(gameWidth / 2, gameHeight / 3, 'JUEGO PAUSADO', {
            fontSize: '40px',
            fill: '#fff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        resumeButton = this.add.text(gameWidth / 2, gameHeight / 2, 'CONTINUAR', {
            fontSize: '30px',
            fill: '#fff',
            backgroundColor: '#4a4a4a',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        resumeButton.setInteractive();
        resumeButton.on('pointerdown', togglePause, this);

        // Pausar físicas
        this.physics.pause();
    } else {
        // Eliminar overlay de pausa
        pauseOverlay.destroy();
        this.children.each(child => {
            if (child.text === 'JUEGO PAUSADO' || child.text === 'CONTINUAR') {
                child.destroy();
            }
        });

        // Reanudar físicas
        this.physics.resume();
    }
}

function update(time) {
    currentTime = time;

    if (!gameStarted || gamePaused) return;

    // Fondo con parallax
    this.background.tilePositionY -= 0.5;

    if (!gameOver) {
        // Movimiento del jugador
        const playerSpeed = 4 * (gameWidth / 400); // Velocidad adaptada al tamaño de pantalla

        if (touchLeft) {
            player.x -= playerSpeed;
        } else if (touchRight) {
            player.x += playerSpeed;
        }

        // Disparar
        if (isFireButtonPressed && time > lastFired) {
            fireBullet(time);
        }

        // Movimiento de aliens
        moveAliens.call(this);

        // Actualizar textos
        scoreText.setText('Puntos: ' + score);
        livesText.setText('Vidas: ' + lives);

        // Actualizar popups de puntuación
        updateScorePopups.call(this);

        // Comprobar si todos los aliens han sido eliminados
        if (aliens.countActive() === 0) {
            levelUp.call(this);
        }
    }
}

function updateScorePopups() {
    for (let i = 0; i < scorePopups.length; i++) {
        const popup = scorePopups[i];
        popup.y -= 1;
        popup.alpha -= 0.01;

        if (popup.alpha <= 0) {
            popup.destroy();
            scorePopups.splice(i, 1);
            i--;
        }
    }
}

function moveAliens() {
    alienMoveCounter += alienSpeed;

    if (alienMoveCounter >= 100) {
        alienMoveCounter = 0;

        // Moverse lateralmente
        const alienGroup = aliens.getChildren();
        let changeDirection = false;

        for (let i = 0; i < alienGroup.length; i++) {
            const alien = alienGroup[i];
            alien.x += 10 * alienDirection;

            // Comprobar bordes
            if (alien.x > gameWidth - alien.width/2 || alien.x < alien.width/2) {
                changeDirection = true;
            }

            // Comprobar si han llegado abajo (game over)
            if (alien.y > player.y - alien.height) {
                gameOver = true;
                gameOverSequence.call(this);
                break;
            }
        }

        if (changeDirection) {
            alienDirection *= -1;

            for (let i = 0; i < alienGroup.length; i++) {
                const alien = alienGroup[i];
                alien.y += gameHeight / 20; // Bajar
            }
        }
    }
}

function fireBullet(time) {
    const bullet = bullets.get();

    if (bullet) {
        bullet.setScale(gameWidth / 2000);
        bullet.setActive(true);
        bullet.setVisible(true);
        bullet.setPosition(player.x, player.y - player.height/2);
        bullet.setVelocityY(-300 * (gameHeight / 800)); // Velocidad adaptada al tamaño

        lastFired = time + fireRate;
    }
}

function alienFire() {
    if (gameOver || !gameStarted || gamePaused) return;

    const alienGroup = aliens.getChildren();

    if (alienGroup.length > 0) {
        // Seleccionar un alien aleatorio de la fila inferior de cada columna
        const lowestAliens = [];
        const groupedByX = {};

        // Agrupar aliens por su posición X aproximada
        alienGroup.forEach(alien => {
            const roundedX = Math.round(alien.x / 20) * 20;
            if (!groupedByX[roundedX]) {
                groupedByX[roundedX] = [];
            }
            groupedByX[roundedX].push(alien);
        });

        // Obtener el alien más bajo de cada columna
        Object.values(groupedByX).forEach(column => {
            if (column.length > 0) {
                const lowestAlien = column.reduce((lowest, current) => 
                    current.y > lowest.y ? current : lowest, column[0]);
                lowestAliens.push(lowestAlien);
            }
        });

        // Seleccionar un alien aleatorio entre los más bajos
        if (lowestAliens.length > 0) {
            const shooter = Phaser.Utils.Array.GetRandom(lowestAliens);

            const enemyBullet = enemyBullets.get();
            if (enemyBullet) {
                enemyBullet.setScale(gameWidth / 2000);
                enemyBullet.setActive(true);
                enemyBullet.setVisible(true);
                enemyBullet.setPosition(shooter.x, shooter.y + shooter.height/2);
                enemyBullet.setVelocityY(150 * (gameHeight / 800)); // Velocidad adaptada
            }
        }
    }
}

function bulletHitAlien(bullet, alien) {
    // Crear explosión
    const explosion = this.add.sprite(alien.x, alien.y, 'explosion');
    explosion.setScale(gameWidth / 1000);
    explosion.play('explode');
    explosion.once('animationcomplete', () => {
        explosion.destroy();
    });

    // Mostrar puntuación ganada
    const pointsText = this.add.text(alien.x, alien.y, '+' + alien.points, { 
        fontSize: '20px', 
        fill: '#ffff00' 
    });
    pointsText.setOrigin(0.5);
    scorePopups.push(pointsText);

    // Actualizar puntuación
    score += alien.points;

    // Eliminar bala y alien
    bullet.setActive(false);
    bullet.setVisible(false);
    alien.destroy();

    return true;
}

function enemyBulletHitPlayer(player, bullet) {
    if (invincible) return false;

    // Eliminar bala
    bullet.setActive(false);
    bullet.setVisible(false);

    // Crear explosión
    const explosion = this.add.sprite(player.x, player.y, 'explosion');
    explosion.setScale(gameWidth / 1000);
    explosion.play('explode');
    explosion.once('animationcomplete', () => {
        explosion.destroy();
    });

    // Reducir vidas
    lives--;
    livesText.setText('Vidas: ' + lives);

    // Hacer jugador invencible temporalmente
    invincible = true;
    player.setAlpha(0.5);

    // Volver a la normalidad después de 2 segundos
    this.time.delayedCall(2000, () => {
        invincible = false;
        player.setAlpha(1);
    });

    if (lives <= 0) {
        gameOver = true;
        gameOverSequence.call(this);
    }

    return true;
}

function gameOverSequence() {
    // Detener físicas
    this.physics.pause();

    // Texto de Game Over
    gameOverText = this.add.text(gameWidth / 2, gameHeight / 2 - 50, 'GAME OVER', { 
        fontSize: '40px', 
        fill: '#ff0000',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    // Texto de puntuación final
    const finalScoreText = this.add.text(gameWidth / 2, gameHeight / 2, 'Puntuación final: ' + score, { 
        fontSize: '30px', 
        fill: '#fff' 
    }).setOrigin(0.5);

    // Botón para reiniciar
    restartText = this.add.text(gameWidth / 2, gameHeight / 2 + 100, 'REINICIAR', { 
        fontSize: '30px', 
        fill: '#fff',
        backgroundColor: '#4a4a4a',
        padding: { x: 20, y: 10 }
    }).setOrigin(0.5);

    restartText.setInteractive();
    restartText.on('pointerdown', restart, this);
}

function restart() {
    // Reiniciar valores
    score = 0;
    lives = 3;
    gameOver = false;
    alienDirection = 1;
    alienMoveCounter = 0;
    level = 1;
    alienSpeed = 1;
    alienFireRate = 1000;

    // Eliminar textos de game over
    gameOverText.destroy();
    restartText.destroy();
    this.children.each(child => {
        if (child.text && child.text.includes('Puntuación final')) {
            child.destroy();
        }
    });

    // Limpiar grupos
    bullets.clear(true, true);
    enemyBullets.clear(true, true);
    aliens.clear(true, true);

    // Reanudar físicas
    this.physics.resume();

    // Reiniciar juego
    createAliens.call(this);

    // Actualizar textos
    scoreText.setText('Puntos: 0');
    livesText.setText('Vidas: 3');
    levelText.setText('Nivel: 1');
}

function levelUp() {
    level++;
    levelText.setText('Nivel: ' + level);

    // Aumentar dificultad
    alienSpeed += 0.2;
    alienFireRate = Math.max(300, alienFireRate - 100);

    // Actualizar timer de disparos enemigos
    this.time.removeAllEvents();
    this.time.addEvent({ 
        delay: alienFireRate, 
        callback: alienFire, 
        callbackScope: this, 
        loop: true 
    });

    // Crear nuevo nivel
    createAliens.call(this);

    // Mensaje de nivel
    const levelUpText = this.add.text(gameWidth / 2, gameHeight / 2, '¡NIVEL ' + level + '!', { 
        fontSize: '40px', 
        fill: '#00ff00',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    // Hacer que el mensaje desaparezca
    this.tweens.add({
        targets: levelUpText,
        alpha: 0,
        duration: 2000,
        ease: 'Power2',
        onComplete: () => {
            levelUpText.destroy();
        }
    });
}

// Archivo: public/assets/player.png
// Crear una imagen simple para el jugador (una nave triangular) de 64x64 pixeles

// Archivo: public/assets/alien.png
// Crear una imagen simple para los aliens (un ovni) de 64x64 pixeles

// Archivo: public/assets/bullet.png
// Crear una imagen simple para las balas (pequeño láser) de 16x32 pixeles

// Archivo: public/assets/enemy-bullet.png
// Crear una imagen simple para las balas enemigas (pequeño láser) de 16x32 pixeles

// Archivo: public/assets/explosion.png
// Crear un spritesheet para la explosión con 16 frames de 64x64 pixeles

// Archivo: public/assets/background.png
// Crear una imagen para el fondo espacial con estrellas