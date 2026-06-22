FROM node:20-alpine

# Cài đặt các dependencies cần thiết
WORKDIR /app

# Copy package.json và cài đặt dependencies
COPY package*.json ./
RUN npm install

# Copy toàn bộ mã nguồn
COPY . .

# Build ứng dụng Next.js
RUN npm run build

# Mở port 3000
EXPOSE 3000

# Khởi chạy ứng dụng
CMD ["npm", "run", "start"]
