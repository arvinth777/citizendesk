# Use a lightweight Node.js environment
FROM node:20-slim

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
COPY package*.json ./

# Set the environment variable to production
ENV NODE_ENV=production

# Install production dependencies.
RUN npm install

# Copy local code to the container image.
COPY . ./

# Build the Vite frontend and the Express backend
RUN npm run build

# Run the web service on container startup.
CMD [ "npm", "start" ]
