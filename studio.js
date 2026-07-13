/* studio.js */

// Global App Storage Variables
let trackTimer = null;
let reelRotation = 0;

const mixtapeData = {
  isPlaying: false,
  currentTrack: "SIDE A: MIDNIGHT DRIFT",
  tracks: ["SIDE A: MIDNIGHT DRIFT", "SIDE A: NEON LOOPS", "SIDE B: AMBER WAVES", "SIDE B: STATIC HEADSPACE"],
  speedFactor: 1
};

document.addEventListener("DOMContentLoaded", () => {
  syncLocalUIState();
  initGlobalDeckControls();
});

function syncLocalUIState() {
  // Pull status states from local storage to keep tabs aligned during navigation
  const storedPlaying = localStorage.getItem("studio_playing") === "true";
  const storedTrack = localStorage.getItem("studio_track") || mixtapeData.tracks[0];
  const storedSpeed = parseFloat(localStorage.getItem("studio_speed") || 1);

  mixtapeData.isPlaying = storedPlaying;
  mixtapeData.currentTrack = storedTrack;
  mixtapeData.speedFactor = storedSpeed;

  const label = document.getElementById("currentTrackLabel");
  if (label) label.innerText = mixtapeData.currentTrack;

  const deck = document.getElementById("deckPanel");
  if (deck && mixtapeData.isPlaying) {
    deck.classList.add("playing");
    startReelEngine();
  }
}

function initGlobalDeckControls() {
  const toggleBtn = document.getElementById("globalPlayBtn");
  const deck = document.getElementById("deckPanel");
  const label = document.getElementById("currentTrackLabel");

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      mixtapeData.isPlaying = !mixtapeData.isPlaying;
      localStorage.setItem("studio_playing", mixtapeData.isPlaying);
      
      if (mixtapeData.isPlaying) {
        deck.classList.add("playing");
        startReelEngine();
      } else {
        deck.classList.remove("playing");
        clearInterval(trackTimer);
      }
    });
  }

  // Interactively skip tracks by clicking the cassette deck face directly
  const cassette = document.querySelector(".cassette-shell");
  if (cassette) {
    cassette.addEventListener("click", () => {
      let index = mixtapeData.tracks.indexOf(mixtapeData.currentTrack);
      index = (index + 1) % mixtapeData.tracks.length;
      mixtapeData.currentTrack = mixtapeData.tracks[index];
      
      localStorage.setItem("studio_track", mixtapeData.currentTrack);
      if (label) {
        label.style.transform = "scale(0.95)";
        setTimeout(() => {
          label.innerText = mixtapeData.currentTrack;
          label.style.transform = "scale(1)";
        }, 100);
      }
    });
  }
}

function startReelEngine() {
  clearInterval(trackTimer);
  trackTimer = setInterval(() => {
    if (!mixtapeData.isPlaying) return;
    // Rotate calculations map seamlessly onto inline SVGs
    reelRotation += (3 * mixtapeData.speedFactor);
    document.querySelectorAll(".reel").forEach(reel => {
      reel.style.transform = `rotate(${reelRotation}deg)`;
    });
  }, 20);
}

function updateReelSpeed(multiplier) {
  mixtapeData.speedFactor = multiplier;
  localStorage.setItem("studio_speed", multiplier);
}