FROM node:20-alpine

# Cài đặt các dependencies cần thiết
WORKDIR /app

# Copy package.json và cài đặt dependencies
COPY package*.json ./
RUN npm install

# Copy toàn bộ mã nguồn
COPY . .

# Build ứng dụng Next.js
ARG INTERNAL_API_URL=http://127.0.0.1:8000
ENV INTERNAL_API_URL=$INTERNAL_API_URL
RUN npm run build

# Mở port 3000
EXPOSE 3000

# Khởi chạy ứng dụng
CMD ["npm", "run", "start"]
