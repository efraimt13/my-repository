// Global variables
let canvas, ctx;
let gameRunning = false;
let player, enemies = [], coins = [], bonuses = [], powerUps = [], particles = [];
let lastFrameTime = 0;
let score = 0;
let health = 100;
let keysPressed = {};
let gameOver = false;
let level = 1;
let pointsForNextLevel = 100;
let enemySpeedMultiplier = 1; // Increases with each level
let coinSpeedMultiplier = 1;
let bonusSpeedMultiplier = 1;
let powerUpDuration = 5000; // Power-ups last for 5 seconds
let speedBoostActive = false;
let shieldActive = false;
let lastSpawnTime = 0;
let spawnInterval = 2000; // Time between random spawns

// Sound effects
let coinSound = new Audio('coin.mp3'); // Sound for collecting coins
let hitSound = new Audio('hit.mp3');   // Sound for hitting an enemy
let powerUpSound = new Audio('power-up.mp3'); // Power-up sound

// Player size, enemy size, coin size
const playerSize = { width: 50, height: 50 };
const enemySize = { width: 50, height: 50 };
const coinRadius = 15; 
const bonusRadius = 20;
const powerUpRadius = 20; // Power-up size

// Initialize the game
function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize player and objects
    player = new Player(canvas.width / 2 - playerSize.width / 2, canvas.height - playerSize.height - 10);
    spawnEnemies();
    spawnCoins();
    spawnBonuses();
    spawnPowerUps();  // Power-ups added

    // Start listening to key presses
    window.addEventListener('keydown', (e) => keysPressed[e.key] = true);
    window.addEventListener('keyup', (e) => keysPressed[e.key] = false);

    // Start game loop
    requestAnimationFrame(gameLoop);
}

// Resize canvas to fit screen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Main game loop
function gameLoop(timestamp) {
    const deltaTime = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;

    if (gameRunning && !gameOver) {
        updateGame(deltaTime);
        renderGame();

        // Random spawns
        if (timestamp - lastSpawnTime > spawnInterval) {
            randomSpawn();
            lastSpawnTime = timestamp;
            spawnInterval = Math.random() * 2000 + 1000; // Randomize next spawn interval
        }
    } else if (gameOver) {
        renderGameOverScreen();
    }

    requestAnimationFrame(gameLoop);
}

// Update game state
function updateGame(deltaTime) {
    player.update(deltaTime, keysPressed);

    // Update enemies
    enemies.forEach((enemy, index) => {
        enemy.update(deltaTime * enemySpeedMultiplier, player);
        if (enemy.collidesWith(player)) {
            if (!shieldActive) {
                health -= 10; // Player loses health
                hitSound.play(); // Hit sound effect
                if (health <= 0) {
                    endGame();
                }
            }
        }
    });

    // Update coins
    coins.forEach((coin, index) => {
        coin.update(deltaTime * coinSpeedMultiplier);

        if (coin.collidesWith(player)) {
            score += 10; // Earn points
            coinSound.play();
            createParticles(coin.x, coin.y);  // Particle effect
            coins.splice(index, 1);
        } else if (coin.y > canvas.height) {
            coins.splice(index, 1); // Remove off-screen coins
        }
    });

    // Update bonuses
    bonuses.forEach((bonus, index) => {
        bonus.update(deltaTime * bonusSpeedMultiplier);

        if (bonus.collidesWith(player)) {
            score += bonus.value;
            coinSound.play();
            bonuses.splice(index, 1);
        } else if (bonus.y > canvas.height) {
            bonuses.splice(index, 1);
        }
    });

    // Update power-ups
    powerUps.forEach((powerUp, index) => {
        powerUp.update(deltaTime);

        if (powerUp.collidesWith(player)) {
            activatePowerUp(powerUp.type);
            powerUpSound.play(); // Play power-up sound
            powerUps.splice(index, 1);
        } else if (powerUp.y > canvas.height) {
            powerUps.splice(index, 1);
        }
    });

    // Update particles
    particles.forEach((particle, index) => {
        particle.update(deltaTime);
        if (particle.lifetime <= 0) {
            particles.splice(index, 1); // Remove expired particles
        }
    });

    if (score >= pointsForNextLevel) {
        nextLevel();
    }

    updateUI();
}

// Handle level progression
function nextLevel() {
    level += 1;
    health = 100; // Reset health
    pointsForNextLevel += 100;
    enemySpeedMultiplier += 0.2; // Enemies get faster
    coinSpeedMultiplier += 0.1;
    bonusSpeedMultiplier += 0.15;
    spawnEnemies();
    spawnBonuses();
    spawnPowerUps();  // Power-ups added
}

// Activate power-up
function activatePowerUp(type) {
    if (type === 'speed') {
        speedBoostActive = true;
        player.speed *= 2; // Double speed
        setTimeout(() => {
            player.speed /= 2;
            speedBoostActive = false;
        }, powerUpDuration);
    } else if (type === 'shield') {
        shieldActive = true;
        setTimeout(() => {
            shieldActive = false;
        }, powerUpDuration);
    }
}

// Create particle effect
function createParticles(x, y) {
    for (let i = 0; i < 10; i++) {
        particles.push(new Particle(x, y));
    }
}

// UI update
function updateUI() {
    document.getElementById('healthBar').value = health;
    document.getElementById('scoreDisplay').innerText = `Score: ${score} | Level: ${level}`;
}

// End game
function endGame() {
    gameRunning = false;
    gameOver = true;
}

// Power-Up class
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.radius = powerUpRadius;
        this.speed = 120;
        this.type = type; // 'speed' or 'shield'
        this.color = type === 'speed' ? 'blue' : 'green'; // Speed is blue, shield is green
    }

    update(deltaTime) {
        this.y += this.speed * deltaTime; // Move downwards
    }

    collidesWith(player) {
        const distX = Math.abs(this.x + this.radius - (player.x + player.width / 2));
        const distY = Math.abs(this.y + this.radius - (player.y + player.height / 2));
        return (distX * distX + distY * distY) <= this.radius * this.radius;
    }

    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x + this.radius, this.y + this.radius, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Particle class for effects
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2; // Random size
        this.speedX = Math.random() * 4 - 2; // Random horizontal speed
        this.speedY = Math.random() * 4 - 2; // Random vertical speed
        this.color = 'yellow';
        this.lifetime = 1; // 1 second lifetime
    }

    update(deltaTime) {
        this.x += this.speedX;
        this.y += this.speedY;
        this.lifetime -= deltaTime;
    }

    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Spawn power-ups randomly
function spawnPowerUps(count = 1) {
    for (let i = 0; i < count; i++) {
        const type = Math.random() > 0.5 ? 'speed' : 'shield'; // Randomly select speed or shield
        powerUps.push(new PowerUp(Math.random() * (canvas.width - powerUpRadius * 2), Math.random() * -300, type));
    }
}

// Other classes (Player, Enemy, Coin, Bonus) remain the same
// ...


// Update UI elements (health, score, level)
function updateUI() {
    document.getElementById('healthBar').value = health;
    document.getElementById('scoreDisplay').innerText = `Score: ${score} | Level: ${level}`;
}

// Randomly spawn enemies, coins, or bonus points
function randomSpawn() {
    const spawnType = Math.random();
    if (spawnType < 0.5) {
        // Spawn an enemy
        spawnEnemies(1);
    } else if (spawnType < 0.8) {
        // Spawn a coin
        spawnCoins(1);
    } else {
        // Spawn a bonus point
        spawnBonuses(1);
    }
}

// Render the game (2D canvas rendering)
function renderGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas

    // Render the player
    player.render(ctx);

    // Render the enemies
    enemies.forEach(enemy => enemy.render(ctx));

    // Render the coins
    coins.forEach(coin => coin.render(ctx));

    // Render the bonuses
    bonuses.forEach(bonus => bonus.render(ctx));

    // Render health, score, and level
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Health: ${health}`, 10, 30);
    ctx.fillText(`Score: ${score}`, 10, 60);
    ctx.fillText(`Level: ${level}`, 10, 90);
}

// End the game
function endGame() {
    gameRunning = false;
    gameOver = true;
}

// Render the game over screen
function renderGameOverScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    ctx.fillStyle = 'red';
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 50);
    ctx.font = '30px Arial';
    ctx.fillText('Final Score: ' + score, canvas.width / 2, canvas.height / 2);
    ctx.fillText('Press R to Retry', canvas.width / 2, canvas.height / 2 + 50);

    // Listen for retry key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'r') {
            resetGame();
        }
    });
}

// Reset the game
function resetGame() {
    gameRunning = true;
    gameOver = false;
    health = 100;
    score = 0;
    level = 1;
    pointsForNextLevel = 100;
    enemySpeedMultiplier = 1;
    coinSpeedMultiplier = 1;
    bonusSpeedMultiplier = 1;
    enemies = [];
    coins = [];
    bonuses = [];
    player = new Player(canvas.width / 2 - playerSize.width / 2, canvas.height - playerSize.height - 10);
    spawnEnemies();
    spawnCoins();
    spawnBonuses();
}

// Start the game when the button is clicked
document.getElementById('startGameBtn').addEventListener('click', () => {
    gameRunning = true;
    document.getElementById('mainMenu').style.display = 'none';
    initGame();
});

// Spawn enemies
function spawnEnemies(count = 5) {
    for (let i = 0; i < count; i++) {
        enemies.push(new Enemy(Math.random() * (canvas.width - enemySize.width), Math.random() * -300));
    }
}

// Spawn coins
function spawnCoins(count = 3) {
    for (let i = 0; i < count; i++) {
        coins.push(new Coin(Math.random() * (canvas.width - coinRadius * 2), Math.random() * -300));
    }
}

// Spawn bonus points
function spawnBonuses(count = 1) {
    for (let i = 0; i < count; i++) {
        bonuses.push(new Bonus(Math.random() * (canvas.width - bonusRadius * 2), Math.random() * -300));
    }
}

// Player class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = playerSize.width;
        this.height = playerSize.height;
        this.speed = 300; // Pixels per second
    }

    update(deltaTime, keysPressed) {
        if (keysPressed['ArrowUp'] || keysPressed['w']) {
            this.y -= this.speed * deltaTime;
        }
        if (keysPressed['ArrowDown'] || keysPressed['s']) {
            this.y += this.speed * deltaTime;
        }
        if (keysPressed['ArrowLeft'] || keysPressed['a']) {
            this.x -= this.speed * deltaTime;
        }
        if (keysPressed['ArrowRight'] || keysPressed['d']) {
            this.x += this.speed * deltaTime;
        }

        // Boundary checks
        this.x = Math.max(0, Math.min(this.x, canvas.width - this.width));
        this.y = Math.max(0, Math.min(this.y, canvas.height - this.height));
    }

    render(ctx) {
        ctx.fillStyle = 'blue';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// Enemy class
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = enemySize.width;
        this.height = enemySize.height;
        this.speed = 150; // Pixels per second
    }

    update(deltaTime, player) {
        // Move downward towards the player
        this.y += this.speed * deltaTime;

        // Reset enemy position if it goes off-screen
        if (this.y > canvas.height) {
            this.x = Math.random() * (canvas.width - this.width);
            this.y = Math.random() * -300;
        }
    }

    collidesWith(player) {
        // Simple collision detection (AABB - Axis-Aligned Bounding Box)
        return (
            this.x < player.x + player.width &&
            this.x + this.width > player.x &&
            this.y < player.y + player.height &&
            this.y + this.height > player.y
        );
    }

    render(ctx) {
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// Coin class
class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = coinRadius;
        this.speed = 100; // Coins fall slower than enemies
    }

    update(deltaTime) {
        // Move the coin downward
        this.y += this.speed * deltaTime;
    }

    collidesWith(player) {
        // Simple collision detection for circle (coin) and rectangle (player)
        const distX = Math.abs(this.x + this.radius - (player.x + player.width / 2));
        const distY = Math.abs(this.y + this.radius - (player.y + player.height / 2));
        const dx = distX - player.width / 2;
        const dy = distY - player.height / 2;
        return (dx * dx + dy * dy) <= this.radius * this.radius;
    }

    render(ctx) {
        ctx.fillStyle = 'gold';
        ctx.beginPath();
        ctx.arc(this.x + this.radius, this.y + this.radius, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }
}

// Bonus class (Random bonuses worth more points)
class Bonus {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = bonusRadius;
        this.speed = 120; // Bonus items fall a bit slower than enemies
        this.value = Math.floor(Math.random() * 50) + 20; // Random bonus point value (between 20 and 70)
        this.color = `hsl(${Math.random() * 360}, 100%, 50%)`; // Random color
    }

    update(deltaTime) {
        // Move the bonus item downward
        this.y += this.speed * deltaTime;
    }

    collidesWith(player) {
        // Simple collision detection for circle (bonus) and rectangle (player)
        const distX = Math.abs(this.x + this.radius - (player.x + player.width / 2));
        const distY = Math.abs(this.y + this.radius - (player.y + player.height / 2));
        const dx = distX - player.width / 2;
        const dy = distY - player.height / 2;
        return (dx * dx + dy * dy) <= this.radius * this.radius;
    }

    render(ctx) {
        ctx.fillStyle = this.color; // Use random color for bonus item
        ctx.beginPath();
        ctx.arc(this.x + this.radius, this.y + this.radius, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }
}
