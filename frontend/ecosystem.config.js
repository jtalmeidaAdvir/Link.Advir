module.exports = {
  apps: [
    {
      name: "Link.Advir",
      script: "npx",
      args: "serve -s web-build -l 8080", // se o export gerar 'dist', troca para 'dist'
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
 
 