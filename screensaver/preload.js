const { ipcRenderer } = require('electron');

let initialX = null;
let initialY = null;

// Wait for DOM to load before adding listeners
window.addEventListener('DOMContentLoaded', () => {
    // Mouse Movement
    window.addEventListener('mousemove', (e) => {
        // Set initial position if not set
        if (initialX === null) {
            initialX = e.screenX;
            initialY = e.screenY;
            return;
        }

        // Calculate distance moved
        // We use a threshold of 20 pixels to avoid accidental triggers
        // (e.g., slight mouse drift or startup jitter)
        const dist = Math.sqrt(
            Math.pow(e.screenX - initialX, 2) +
            Math.pow(e.screenY - initialY, 2)
        );

        if (dist > 20) {
            ipcRenderer.send('quit');
        }
    });

    // Instant Quit Triggers
    window.addEventListener('keydown', () => ipcRenderer.send('quit'));
    window.addEventListener('mousedown', () => ipcRenderer.send('quit'));
    window.addEventListener('wheel', () => ipcRenderer.send('quit'));
});
