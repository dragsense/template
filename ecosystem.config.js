module.exports = {
  apps: [
    {
      name: "template-prod",
      script: "dist/backend/src/main.js",
      cwd: "/app/backend",
      env: {
        NODE_ENV: "production",
      },
      error_file: "/app/backend/logs/pm2-error.log",
      out_file: "/app/backend/logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 4000,
    },
    {
      name: "template-staging",
      script: "dist/backend/src/main.js",
      cwd: "/app/backend",
      env: {
        NODE_ENV: "staging",
      },
      error_file: "/app/backend/logs/pm2-error.log",
      out_file: "/app/backend/logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 4000,
    },
  ],
  deploy: {
    prod: {
      user: "ubuntu",
      host: "35.84.225.108",
      ref: "origin/main",
      repo: "git@octa_github.com:Octathorn/template.git",
      path: "/var/www/template_io_usr/data/www/template.io",
      // Use WSL path (no spaces) or copy key to ~/.ssh/template-dev.pem
      key: process.env.HOME + "/.ssh/template-dev.pem",
      "post-setup": "touch ../shared/.env ../shared/.env.prod ../shared/.env.dev ../shared/.env.shared",
      "post-deploy": "sh ./deploy.sh",
    },
    staging: {
      user: "ubuntu",
      host: "35.84.225.108",
      ref: "origin/testing",
      repo: "git@octa_github.com:Octathorn/template.git",
      path: "/var/www/template_io_usr/data/www/template.io/staging",
      key: process.env.HOME + "/.ssh/template-dev.pem",
      "post-setup": "touch ../shared/.env ../shared/.env.prod ../shared/.env.dev ../shared/.env.shared",
      "post-deploy": "sh ./deploy.sh",
    },
  },
};
