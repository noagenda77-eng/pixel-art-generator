const express = require('express');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 8080; // Changed default to 8080 to avoid 3000 conflict

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // User requested Gemini 2.5 Flash

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Ensure gen directory exists
const GEN_DIR = path.join(__dirname, 'public', 'gen');
if (!fs.existsSync(GEN_DIR)) {
    fs.mkdirSync(GEN_DIR, { recursive: true });
}

// Routes
// Simple health check route
app.get('/ping', (req, res) => res.send('Pixel Art Generator is Active!'));

app.get('/api/animations', (req, res) => {
    fs.readdir(GEN_DIR, (err, files) => {
        if (err) {
            console.error("Error reading gen dir:", err);
            return res.status(500).json([]);
        }
        // Filter for .js files and sort by creation time (newest first)
        const animationFiles = files
            .filter(f => f.endsWith('.js'))
            .map(f => ({
                name: f,
                time: fs.statSync(path.join(GEN_DIR, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time)
            .map(f => f.name);

        res.json(animationFiles);
    });
});

// Generation Logic
const recentTopics = [];

// Dynamic Prompt Generation
async function generateDynamicPrompt() {
    try {
        const exclusions = recentTopics.length > 0 ? `Do NOT use these recent topics: ${recentTopics.join(', ')}` : "";

        const styles = [
            '8-bit', '16-bit', 'Low Poly', 'Voxel', 'PS1 Aesthetic', 'Game Boy Green', 'CGA Graphics',
            'Atari 2600', 'Vector Arcade', 'Cel Shaded', 'Hand Drawn Indie', 'CRT Filter', 'Scanlines',
            'LCD Screen', 'Dithering', 'Isometric', '2.5D', 'Paper Mario Style', 'Y2K Aesthetic',
            'Glitch Art', 'Retro FPS', 'Text Adventure', 'ASCII Art', 'Wireframe', 'Minecraft Style',
            'Roblox Style', 'N64 Blur', 'Sega Genesis', 'SNES Mode 7', 'Commodore 64'
        ];
        const levels = [
            'Tutorial Level', 'Boss Arena', 'Safe Room', 'Item Shop', 'Character Select Screen',
            'Underwater Level', 'Lava Castle', 'Ice World', 'Sky Fortress', 'Sewers',
            'Dungeon', 'Forest Zone', 'Desert Temple', 'Space Station', 'Cyber City',
            'Haunted Mansion', 'Racing Track', 'Bonus Stage', 'Glitch World', 'Dev Room',
            'Empty Server', 'Corrupted Save File', 'Waiting Lobby', 'Final Destination',
            'Secret Level', 'Retro Arcade', 'Esports Arena', 'Speedrun Route', 'Hub World',
            'Loading Screen', 'Game Over Screen', 'Victory Podium', 'Inventory Screen', 'Skill Tree',
            'Map Screen', 'Cutscene', 'QTE Sequence', 'Crafting Bench', 'Loot Cave', 'Gachapon Shop'
        ];
        const elements = [
            'Power-up', 'Health Potion', 'Mana Potion', 'Epic Loot', 'Quest Item',
            'NPC', 'Final Boss', 'Mini Boss', 'Trash Mob', 'Speedrunner',
            'Noob', 'Pro Player', 'Streamer', 'Griefer', 'Camper',
            'Save Point', 'Checkpoint', 'Spawn Point', 'Hitbox', 'Bug/Glitch',
            'Lag', 'High Score', 'Achievement', 'Easter Egg', 'Cheat Code',
            'Dialogue Box', 'Health Bar', 'Minimap', 'Crosshair', 'Combo Counter',
            'Critical Hit', 'Double Jump', 'Wall Run', 'Rocket Jump', 'Teabagging',
            'Rage Quit', 'Speed Potion', 'Extra Life', 'Game Cartridge', 'Joystick',
            'Keyboard & Mouse', 'VR Headset', 'CRT Monitor', 'Pixel', 'Voxel',
            'Sprite', 'Texture', 'Mesh', 'Polygon', 'Shader'
        ];

        // Always include Style, plus one other category
        const otherCategories = ['level', 'element'];
        const secondCategory = otherCategories[Math.floor(Math.random() * otherCategories.length)];

        // Always pick a style
        const randomStyle = styles[Math.floor(Math.random() * styles.length)];
        let descriptions = [`Style: ${randomStyle}`];

        if (secondCategory === 'level') {
            const randomLevel = levels[Math.floor(Math.random() * levels.length)];
            descriptions.push(`Setting: ${randomLevel}`);
        } else {
            const randomElement = elements[Math.floor(Math.random() * elements.length)];
            descriptions.push(`Object/Mechanic: ${randomElement}`);
        }

        const themeDescription = descriptions.join(" + ");

        const prompt = `
            Generate a creative, UNIQUE idea for a 192x108 (16:9) pixel art animation.
            
            Constraint: Use ONLY this single theme constraint: ${themeDescription}.
            
            Strictly follow the format: "[Object/Creature/Event] in [Setting]".
            Keep it clean and minimalist.
            AVOID GENERIC IDEAS like "duck on pond".
            Examples: "red dragon in snowy cave", "spaceship flying over mars", "duck floating on pond".
            ${exclusions}
            Output ONLY the description. Strictly keep it UNDER 6 WORDS.
        `;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const topic = response.text().trim();

        // Update history
        recentTopics.push(topic);
        if (recentTopics.length > 50) recentTopics.shift();

        // Return both topic and style
        return { topic, style: randomStyle };
    } catch (error) {
        console.error("Error generating prompt:", error);
        return { topic: "neon cat in dark alley", style: "Cyberpunk" }; // Fallback
    }
}

async function generateAnimation() {
    try {
        const { topic, style } = await generateDynamicPrompt();
        console.log(`Generating animation for: ${topic} (Style: ${style})`);

        const prompt = `
            Write a Javascript function named \`draw(ctx, frame)\` that draws a 192x108 pixel art animation of "${topic}" on the provided 2D context \`ctx\`. 
            
            VISUAL STYLE: ${style}
            The animation MUST strictly adhere to the "${style}" visual style.
            
            CRITICAL REQUIREMENT:
            Draw the text "${topic}" in the bottom-left corner (around x=2, y=104).
            Use a VERY SMALL font: "8px monospace" or similar pixel font.
            The text color must be readable against the background (e.g., White with Black outline/shadow, or vice versa).
            The text must be clearly visible but unobtrusive.

            The \`frame\` argument is an incrementing integer. 
            Do not use any external libraries. Use only standard Canvas API. 
            The canvas size is strictly 192x108.
            Make it colorful and detailed. 
            Do NOT wrap in markdown code blocks. Just output the raw code.
            Ensure the function is named 'draw'.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let code = response.text();

        // Cleanup markdown if present
        code = code.replace(/```javascript/g, '').replace(/```/g, '').trim();

        // Basic validation
        if (!code.includes('function draw')) {
            console.error("Generated code missing draw function, retrying...");
            return; // Skip saving bad generation
        }

        const filename = `anim_${Date.now()}.js`;
        const filepath = path.join(GEN_DIR, filename);

        fs.writeFileSync(filepath, code);
        console.log(`Generated and saved: ${filename}`);

        cleanupOldFiles();

    } catch (error) {
        console.error("Error generating animation:", error);
    }
}

function cleanupOldFiles() {
    fs.readdir(GEN_DIR, (err, files) => {
        if (err) return;

        const jsFiles = files.filter(f => f.endsWith('.js'))
            .map(f => ({
                name: f,
                time: fs.statSync(path.join(GEN_DIR, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time); // Newest first

        if (jsFiles.length > 20) {
            const toDelete = jsFiles.slice(20);
            toDelete.forEach(file => {
                fs.unlink(path.join(GEN_DIR, file.name), err => {
                    if (err) console.error("Error deleting file:", err);
                    else console.log(`Deleted old file: ${file.name}`);
                });
            });
        }
    });
}

// Initial Check and Fill
async function ensureBuffer() {
    try {
        const files = await fs.promises.readdir(GEN_DIR);
        const jsFiles = files.filter(f => f.endsWith('.js'));
        const count = jsFiles.length;
        console.log(`Current animation count: ${count}`);

        if (count < 20) {
            const needed = 20 - count;
            console.log(`Generating ${needed} animations to fill buffer...`);
            for (let i = 0; i < needed; i++) {
                await generateAnimation();
                // Add a small delay to respect rate limits
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            console.log("Buffer filled.");
        }
    } catch (err) {
        console.error("Error during startup check:", err);
    }
}

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    ensureBuffer();
});

// Cron Job: Every 5 minutes
cron.schedule('*/5 * * * *', () => {
    console.log('Running scheduled animation generation...');
    generateAnimation();
});
