FROM node:16
WORKDIR /app

# Install FFMPEG
RUN apt-get -y update
RUN apt-get -y upgrade
RUN apt-get install -y ffmpeg

# Intall dependencies
COPY ["package.json", "package-lock.json*", "./"]
ENV TEST=HI
RUN npm ci

# Build
COPY . .
RUN npm run build
# TODO mount external storage to store joinsounds

# Start service
CMD ["npm", "run", "start"]