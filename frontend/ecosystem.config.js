// ~/Link.Advir/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "Link.Advir",
      cwd: "./frontend",
      script: "npx",
      args: "serve -s web-build -l 8080", // servir build estático
      exec_mode: "fork",
      instances: 1,

      autorestart: true,
      min_uptime: "10s",
      max_restarts: 50,
      restart_delay: 5000,
      exp_backoff_restart_delay: 1000,

      max_memory_restart: "300M",
      watch: false,
      env: { NODE_ENV: "production" }
    }
  ]
}
