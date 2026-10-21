FROM node:22-alpine
WORKDIR /app
COPY server ./server
COPY docs ./docs
ENV PORT=8080 DATA_FILE=/data/scores.json
VOLUME /data
EXPOSE 8080
CMD ["node", "server/leaderboard.js"]
