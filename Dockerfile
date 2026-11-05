# Static site served by nginx, running as a non-root user on port 8080.
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY --chown=nginx:nginx index.html style.css diff.js app.js /usr/share/nginx/html/

EXPOSE 8080
