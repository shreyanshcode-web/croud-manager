# Use lightweight Node image
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./

# Install ALL dependencies (so we can build the vite React app)
RUN npm install

# Copy application source
COPY . .

# Build the React app into dist/
RUN npm run build

# Expose port (Cloud Run sets PORT env var automatically)
EXPOSE 8080

# Run the backend server
CMD [ "npm", "start" ]
