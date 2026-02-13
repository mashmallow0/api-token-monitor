module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-cyan': '#00f5ff',
        'neon-purple': '#b829ff',
        'neon-pink': '#ff2d95',
        'neon-green': '#00ff88',
        'neon-yellow': '#ffd700',
        'neon-red': '#ff2d2d',
        'bg-primary': '#0a0a0f',
        'bg-secondary': '#12121a',
        'bg-card': 'rgba(20, 20, 30, 0.6)',
      }
    },
  },
  plugins: [],
}