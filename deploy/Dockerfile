FROM node:22-bookworm-slim AS build
RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ffmpeg libheif-examples \
	&& rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
ENV PORT=3000
ENV DATA_DIR=/data
ENV BODY_SIZE_LIMIT=220M
EXPOSE 3000
CMD ["node", "build"]
