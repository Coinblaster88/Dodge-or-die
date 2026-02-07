// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game state variables
let gameRunning = false;
let gamePaused = false;
let score = 0;
let animationId;
let gameSpeed = 1.0;

// Balloon object
const balloon = {
    x: canvas.width / 2,
    y: canvas.height - 150,
    width: 50,
    height: 70,
    baseSpeed: 6,
    speed: 6,
    dx: 0,
    baseRiseSpeed: 4,
    riseSpeed: 4
};

// Obstacles array
let obstacles = [];
let obstacleTimer = 0;
let difficulty = 1;

// Cloud decorations
let clouds = [];
for (let i = 0; i < 5; i++) {
    clouds.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        width: 100 + Math.random() * 100,
        height: 40 + Math.random() * 30,
        speed: 0.3 + Math.random() * 0.5
    });
}

// Input controls
const keys = {};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (gameRunning) {
            togglePause();
        }
        return;
    }
    keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Draw balloon
function drawBalloon() {
    ctx.save();
    ctx.beginPath();
    
    // Create gradient for balloon
    const gradient = ctx.createRadialGradient(
        balloon.x, balloon.y - 10, 5,
        balloon.x, balloon.y, balloon.width
    );
    gradient.addColorStop(0, '#FF7F7F');
    gradient.addColorStop(0.5, '#FF4444');
    gradient.addColorStop(1, '#CC0000');
    
    ctx.fillStyle = gradient;
    
    // Draw balloon oval shape
    ctx.ellipse(balloon.x, balloon.y, balloon.width / 2, balloon.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Balloon highlight
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.ellipse(balloon.x - 10, balloon.y - 15, 12, 18, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Balloon knot
    ctx.beginPath();
    ctx.fillStyle = '#990000';
    ctx.moveTo(balloon.x, balloon.y + balloon.height / 2);
    ctx.lineTo(balloon.x - 5, balloon.y + balloon.height / 2 + 8);
    ctx.lineTo(balloon.x + 5, balloon.y + balloon.height / 2 + 8);
    ctx.closePath();
    ctx.fill();
    
    // Balloon string
    ctx.beginPath();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.moveTo(balloon.x, balloon.y + balloon.height / 2 + 8);
    ctx.quadraticCurveTo(
        balloon.x + 10, balloon.y + balloon.height / 2 + 30,
        balloon.x - 5, balloon.y + balloon.height / 2 + 50
    );
    ctx.stroke();
    
    ctx.restore();
}

// Draw clouds
function drawClouds() {
    clouds.forEach(cloud => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.ellipse(cloud.x, cloud.y, cloud.width / 2, cloud.height / 2, 0, 0, Math.PI * 2);
        ctx.ellipse(cloud.x + 40, cloud.y - 10, cloud.width / 3, cloud.height / 2.5, 0, 0, Math.PI * 2);
        ctx.ellipse(cloud.x - 30, cloud.y - 5, cloud.width / 3, cloud.height / 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Move clouds only if not paused
        if (!gamePaused) {
            cloud.x -= cloud.speed;
            if (cloud.x < -200) {
                cloud.x = canvas.width + 100;
                cloud.y = Math.random() * canvas.height;
            }
        }
    });
}

// Create obstacle
function createObstacle() {
    const size = 40 + Math.random() * 40;
    const obstacle = {
        x: Math.random() * (canvas.width - 100) + 50,
        y: -size,
        width: size,
        height: size,
        speed: 4 + difficulty * 0.5,
        type: Math.random() > 0.5 ? 'spike' : 'bird'
    };
    obstacles.push(obstacle);
}

// Draw obstacles
function drawObstacles() {
    obstacles.forEach((obs, index) => {
        if (obs.type === 'spike') {
            // Draw spike obstacle
            ctx.fillStyle = '#333';
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i;
                const radius = i % 2 === 0 ? obs.width / 2 : obs.width / 4;
                const x = obs.x + Math.cos(angle) * radius;
                const y = obs.y + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // Draw bird obstacle
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 3;
            ctx.beginPath();
            // Bird wings
            ctx.moveTo(obs.x - obs.width / 2, obs.y);
            ctx.quadraticCurveTo(obs.x - obs.width / 4, obs.y - obs.height / 3, obs.x, obs.y);
            ctx.quadraticCurveTo(obs.x + obs.width / 4, obs.y - obs.height / 3, obs.x + obs.width / 2, obs.y);
            ctx.stroke();
            
            // Bird body
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.ellipse(obs.x, obs.y + 5, obs.width / 6, obs.height / 4, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Move obstacle down only if not paused
        if (!gamePaused) {
            obs.y += obs.speed * gameSpeed;

            // Remove off-screen obstacles
            if (obs.y > canvas.height + obs.height) {
                obstacles.splice(index, 1);
                score += 10;
                document.getElementById('score').textContent = `Score: ${score}`;
            }
        }
    });
}

// Collision detection with circular hitboxes
function checkCollision() {
    // Balloon hitbox is circular
    const balloonRadius = balloon.width / 2.5; // Slightly smaller for more forgiving gameplay
    
    for (let obs of obstacles) {
        // Calculate distance between centers
        const dx = balloon.x - obs.x;
        const dy = balloon.y - obs.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Obstacle hitbox radius (smaller for more precise collision)
        const obsRadius = obs.width / 2.8;
        
        // Circular collision detection
        if (distance < balloonRadius + obsRadius) {
            return true;
        }
    }
    return false;
}

// Update balloon position
function updateBalloon() {
    if (gamePaused) return;

    // Update speeds based on game speed multiplier
    balloon.speed = balloon.baseSpeed * gameSpeed;
    balloon.riseSpeed = balloon.baseRiseSpeed * gameSpeed;

    // Horizontal movement
    if (keys['ArrowLeft']) {
        balloon.dx = -balloon.speed;
    } else if (keys['ArrowRight']) {
        balloon.dx = balloon.speed;
    } else {
        balloon.dx = 0;
    }

    balloon.x += balloon.dx;

    // Keep balloon in bounds
    if (balloon.x < balloon.width / 2) balloon.x = balloon.width / 2;
    if (balloon.x > canvas.width - balloon.width / 2) balloon.x = canvas.width - balloon.width / 2;

    // Balloon rises continuously
    balloon.y -= balloon.riseSpeed;
    
    // Keep balloon in view, centered vertically
    if (balloon.y < canvas.height / 2) {
        balloon.y = canvas.height / 2;
    }
}

// Game loop
function gameLoop() {
    if (!gameRunning) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background elements
    drawClouds();

    // Update and draw game elements
    updateBalloon();
    drawBalloon();
    drawObstacles();

    // Create obstacles only if not paused
    if (!gamePaused) {
        obstacleTimer++;
        if (obstacleTimer > (40 - difficulty * 2) / gameSpeed) {
            createObstacle();
            obstacleTimer = 0;
        }

        // Progressively increase game speed over time
        if (score > 0 && score % 50 === 0) {
            difficulty += 0.1;
        }
        
        // Gradual speed increase every second of gameplay
        gameSpeed += 0.0005;
        if (gameSpeed > 2.5) gameSpeed = 2.5; // Cap max speed

        // Check collision
        if (checkCollision()) {
            endGame();
            return;
        }
    }

    animationId = requestAnimationFrame(gameLoop);
}

// Toggle pause
function togglePause() {
    gamePaused = !gamePaused;
    const pauseScreen = document.getElementById('pauseScreen');
    
    if (gamePaused) {
        pauseScreen.classList.remove('hidden');
    } else {
        pauseScreen.classList.add('hidden');
    }
}

// Resume game
function resumeGame() {
    gamePaused = false;
    document.getElementById('pauseScreen').classList.add('hidden');
}

// Start game
function startGame() {
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('score').classList.remove('hidden');
    document.getElementById('instructions').classList.remove('hidden');
    
    gameRunning = true;
    gamePaused = false;
    score = 0;
    difficulty = 1;
    gameSpeed = 1.0;
    obstacles = [];
    balloon.x = canvas.width / 2;
    balloon.y = canvas.height - 150;
    balloon.speed = balloon.baseSpeed;
    balloon.riseSpeed = balloon.baseRiseSpeed;
    
    document.getElementById('score').textContent = 'Score: 0';
    gameLoop();
}

// End game
function endGame() {
    gameRunning = false;
    gamePaused = false;
    cancelAnimationFrame(animationId);
    
    document.getElementById('finalScore').textContent = `Your score: ${score}`;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

// Restart game
function restartGame() {
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('pauseScreen').classList.add('hidden');
    startGame();
}

// Quit to main menu
function quitToMenu() {
    gameRunning = false;
    gamePaused = false;
    cancelAnimationFrame(animationId);
    
    document.getElementById('pauseScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('score').classList.add('hidden');
    document.getElementById('instructions').classList.add('hidden');
    document.getElementById('startScreen').classList.remove('hidden');
    
    // Reset game state
    obstacles = [];
    score = 0;
    difficulty = 1;
    gameSpeed = 1.0;
    balloon.x = canvas.width / 2;
    balloon.y = canvas.height - 150;
    balloon.speed = balloon.baseSpeed;
    balloon.riseSpeed = balloon.baseRiseSpeed;
}

// Handle window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
