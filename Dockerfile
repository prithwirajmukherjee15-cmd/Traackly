# One image serves the API, WebSockets and the built client from the same origin,
# which the SameSite=Strict session cookies require.

FROM node:22-alpine AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npm run build

FROM golang:1.26-alpine AS server
WORKDIR /app/server
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/traackly ./cmd/traackly \
 && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/seed ./cmd/seed

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=server /out/ /app/
COPY --from=client /app/client/dist /app/public
ENV STATIC_DIR=/app/public \
    PORT=8080
EXPOSE 8080
USER nonroot
ENTRYPOINT ["/app/traackly"]
