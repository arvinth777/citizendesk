# Use a lightweight Node.js environment
FROM node:20-slim

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build).
RUN npm install

# Copy local code to the container image.
COPY . ./

# Accept build arguments from Cloud Build
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

# Build the Vite frontend and the Express backend
RUN npm run build

# Set the environment variable to production for runtime
ENV NODE_ENV=production

# Run the web service on container startup.
CMD [ "npm", "start" ]
