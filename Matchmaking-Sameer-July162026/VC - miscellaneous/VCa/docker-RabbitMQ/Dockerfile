# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
# Using --only=production can be better for final builds, but for dev this is fine
RUN npm install

# Bundle app source
COPY . .

# Your app binds to port 3002
EXPOSE 3002

# Define the command to run your app
CMD [ "node", "index.js" ]