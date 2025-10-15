// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "Link.Advir",
      script: "./node_modules/serve/bin/serve.js", // ou "node_modules/.bin/serve"
      args: "-s web-build -l 8080",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      min_uptime: "10s",
      max_restarts: 50,
      restart_delay: 5000,
      exp_backoff_restart_delay: 1000,
      max_memory_restart: "300M",       // agora o PM2 consegue medir a RAM do processo certo
      watch: false,
      env: { NODE_ENV: "production" }
    }
  ]
}
