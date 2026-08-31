FROM --platform=linux/amd64 node:20-alpine AS build

ARG APP_COMMIT_SHA
ARG APP_BUILD_TIMESTAMP
ENV VITE_APP_COMMIT_SHA=${APP_COMMIT_SHA} \
    VITE_APP_BUILD_TIMESTAMP=${APP_BUILD_TIMESTAMP}

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
