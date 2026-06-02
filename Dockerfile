FROM node:22.2.0-alpine

############################################
# General Docker image configuration
############################################
WORKDIR /srv/app
EXPOSE 3000
CMD [ "pnpm", "preview", "--host", "0.0.0.0", "--port", "3000" ]
ENTRYPOINT [ "./entrypoint.sh" ]

############################################
# System Dependencies
############################################
RUN apk update && apk add --no-cache gettext dos2unix

############################################
# Install pnpm
############################################
RUN npm install -g pnpm

############################################
# None root user
############################################
RUN chown -R node:node /srv/app
USER node
COPY --chown=node:node [ "package.json", "pnpm-lock.yaml", "astro.config.mjs", "tailwind.config.mjs", "tsconfig.json", "404.html", "./"]
COPY --chown=node:node [ "./docker/entrypoint.sh", "./entrypoint.sh"]
COPY --chown=node:node [ "public", "public"]
COPY --chown=node:node [ "src", "src"]

############################################
# Building Application
############################################
RUN pnpm install --frozen-lockfile
RUN pnpm build

RUN chmod +x entrypoint.sh
RUN dos2unix entrypoint.sh

USER root
RUN chgrp -R 0 /srv/app && \
    chmod -R g=u /srv/app
USER node
