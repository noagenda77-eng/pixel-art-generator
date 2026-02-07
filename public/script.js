const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let animations = [];
let currentIndex = 0;
let requestID;

async function fetchAnimations() {
    try {
        const response = await fetch(`/api/animations?t=${Date.now()}`);
        const newAnimations = await response.json();

        if (newAnimations.length > 0) {
            // Shuffle
            for (let i = newAnimations.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newAnimations[i], newAnimations[j]] = [newAnimations[j], newAnimations[i]];
            }

            // Only force load if we had nothing before
            const isFirstLoad = animations.length === 0;
            animations = newAnimations;

            if (isFirstLoad) {
                loadAnimation(currentIndex);
            }
        }
    } catch (error) {
        console.error('Error fetching animations:', error);
    }
}

function loadAnimation(index) {
    if (animations.length === 0) return;

    const animationFile = animations[index];
    // Remove previous script if any (though we can't really unload JS, we can just stop calling its draw function)
    // A better approach for dynamic JS:
    // Fetch the text content of the JS file, eval it or use new Function.
    // Since we control the backend, let's fetch the script content.

    fetch(`/gen/${animationFile}`)
        .then(res => res.text())
        .then(scriptContent => {
            // Check if there is a running loop and stop it
            if (requestID) cancelAnimationFrame(requestID);

            // Create a function from the script content
            // The script should return a draw function or define one globally.
            // Let's assume the script defines: "window.currentDraw = function(ctx, frame) { ... }"
            // Or we wrap it.

            try {
                // Execute the script. It should replace window.currentDraw
                // Make sure the backend generates code that assigns to window.currentDraw
                const func = new Function('ctx', 'frame', scriptContent + '\nreturn draw;');
                // The backend should produce "function draw(ctx, frame) { ... }"
                // new Function will wrap it. 
                // Actually, if the backend provides "function draw(ctx, frame) { ... }",
                // new Function(script + "; return draw;") will return the function.

                const drawFunc = func();

                let frame = 0;
                function loop() {
                    ctx.clearRect(0, 0, 192, 108);
                    try {
                        drawFunc(ctx, frame);
                    } catch (e) {
                        console.error("Animation error", e);
                    }
                    frame++;
                    requestID = requestAnimationFrame(loop);
                }
                loop();

            } catch (e) {
                console.error("Error parsing animation script", e);
            }
        });
}

// Cycle every 20 seconds
setInterval(() => {
    if (animations.length > 0) {
        currentIndex = (currentIndex + 1) % animations.length;
        loadAnimation(currentIndex);
    }
}, 20000); // 20 seconds

// Refresh the list periodically to get new generations
setInterval(fetchAnimations, 60000); // Every 1 minute

// Initial load
fetchAnimations();
