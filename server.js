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
            // Art Styles
            'Cyberpunk', 'Vaporwave', 'Fantasy', 'Dark Souls', 'Studio Ghibli',
            'Retro Sci-Fi', 'Steampunk', 'Noir', 'Zen Garden', 'Post-Apocalyptic',
            'Underwater', 'Space Western', 'Horror', 'Abstract Geometry',
            'Minimalist', 'Isometric', 'Glitch Art', 'Surrealism', 'Gothic',
            'Art Deco', 'Biopunk', 'Solarpunk', 'Synthwave', 'Medieval',
            'Prehistoric', 'Candy Land', 'Dreamcore', 'Lovecraftian',
            '8-bit RPG', '16-bit Platformer', 'Ukiyo-e (Japanese Woodblock)',
            'Liminal Space', 'High Fantasy', 'Low Poly', 'Desert Wasteland',
            'Bauhaus', 'Cubism', 'Impressionist', 'Pixel Noir', 'Alien Flora',
            'Brutalism', 'Constructivism', 'Fauvism', 'De Stijl', 'Op Art',
            'Precisionism', 'Rococo', 'Baroque', 'Renaissance', 'Utopian',
            'Dystopian', 'Cyber-Noir', 'Acidwave', 'Outrun', 'Lo-Fi',
            'Pixel Horror', 'Eldritch', 'Cosmic Horror', 'High Tech Low Life',
            'Bio-Organic', 'Crystalline', 'Liquid Metal', 'Papercraft',
            'Origami', 'Claymation', 'Voxel', 'Low Resolution', 'Glitchcore',
            'Webcore', 'Frutiger Aero', 'Y2K Aesthetic', 'Memphis Design',
            'Industrial', 'Organic Architecture', 'Fractal', 'Kaleidoscopic',
            'Vector Art', 'Chalk Drawing', 'Oil Painting', 'Watercolor',
            'stained glass', 'mosaic', 'tapestry', 'blueprint', 'diagram',
            'thermal vision', 'x-ray', 'sonar', 'lidar', 'point cloud'
        ];
        const times = [
            'Sunset', 'Midnight', 'Dawn', 'Stormy Afternoon', 'Starry Night',
            'Foggy Morning', 'Eclipse', 'Golden Hour', 'Blue Hour',
            'During a Meteor Shower', 'Under a Blood Moon', 'High Noon',
            'Twilight', 'Pitch Black with Neon Lights', 'Sunrise',
            'During a Blizzard', 'In the middle of a Sandstorm', 'During an Aurora',
            'During a Solar Flare', 'In the Eye of a Storm', 'Post-Heat Death',
            'The Big Bang', 'Jurassic Period', 'Year 3000', 'Second before Impact',
            'Time Freeze', 'The Golden Age', 'Industrial Revolution',
            'Feudal Japan', 'Wild West', 'Roaring 20s', '80s Arcade', 'Neon Future',
            'During an Alien Invasion', 'Zombie Apocalypse', 'Nuclear Winter',
            'After the Rain', 'Before the Storm', 'Eternal Night', 'Perpetual Day',
            'In a Dream', 'In a Nightmare', 'Inside a Computer Simulation',
            'At the End of Time', 'During a Parade', 'During a Festival'
        ];
        const mood = [
            'Melancholic', 'Energetic', 'Peaceful', 'Eerie', 'Cozy',
            'Mysterious', 'Dreamy', 'Chaotic', 'Nostalgic', 'Romantic',
            'Lonely', 'Vibrant', 'Zen', 'Hopeful', 'Desolate',
            'Whimsical', 'Terrifying', 'Serene', 'Bustling', 'Quiet',
            'Etherial', 'Foreboding', 'Festive', 'Tranquil',
            'Nihilistic', 'Euphoric', 'Anxious', 'Serendipitous', 'Melodramatic',
            'Stoic', 'Hysterical', 'Zen-like', 'Claustrophobic', 'Agoraphobic',
            'Heartbreaking', 'Victorious', 'Defeated', 'Confused', 'Enlightened',
            'Rebellious', 'Obedient', 'Wild', 'Tame', 'Ancient', 'Futuristic',
            'Divine', 'Cursed', 'Blessed', 'Haunted', 'Alive', 'Dead'
        ];

        // Pick ONE category at random
        const categories = ['style', 'time', 'mood'];
        const chosenCategory = categories[Math.floor(Math.random() * categories.length)];

        let themeDescription = "";
        if (chosenCategory === 'style') {
            const randomStyle = styles[Math.floor(Math.random() * styles.length)];
            themeDescription = `Style: ${randomStyle}`;
        } else if (chosenCategory === 'time') {
            const randomTime = times[Math.floor(Math.random() * times.length)];
            themeDescription = `Time: ${randomTime}`;
        } else {
            const randomMood = mood[Math.floor(Math.random() * mood.length)];
            themeDescription = `Mood: ${randomMood}`;
        }

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

        return topic;
    } catch (error) {
        console.error("Error generating prompt:", error);
        return "neon cat in dark alley"; // Fallback
    }
}

async function generateAnimation() {
    try {
        const topic = await generateDynamicPrompt();
        console.log(`Generating animation for: ${topic}`);

        const prompt = `
            Write a Javascript function named \`draw(ctx, frame)\` that draws a 192x108 pixel art animation of "${topic}" on the provided 2D context \`ctx\`. 
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
