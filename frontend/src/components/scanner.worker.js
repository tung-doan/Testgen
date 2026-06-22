import jsfeat from 'jsfeat';

// Pre-allocated buffers cho GC Optimization
let img_u8 = null;
let intImg = null;
let binary = null;
let visited = null;
let qX = null;
let qY = null;

self.onmessage = function (e) {
  const { imageData, width, height } = e.data;

  // 1. Khởi tạo hoặc tái sử dụng buffers (GC Optimization)
  if (!img_u8 || img_u8.cols !== width || img_u8.rows !== height) {
    img_u8 = new jsfeat.matrix_t(width, height, jsfeat.U8_t | jsfeat.C1_t);
    intImg = new Int32Array(width * height);
    binary = new Uint8Array(width * height);
    visited = new Uint8Array(width * height);
    qX = new Int16Array(width * height);
    qY = new Int16Array(width * height);
  }

  // Clear visited buffer nhanh
  visited.fill(0);

  // 2. Grayscale (dùng JSFeat cho nhanh)
  jsfeat.imgproc.grayscale(imageData.data, width, height, img_u8);
  
  // Blur để giảm nhiễu hạt
  jsfeat.imgproc.gaussian_blur(img_u8, img_u8, 3);

  // 3. Fast Adaptive Thresholding (Bradley-Roth Integral Image)
  fastAdaptiveThreshold(img_u8.data, binary, width, height, intImg);

  // Tính toán Vùng ngắm (Guide Box) giống hệt trên giao diện
  const templateRatio = 0.8;
  let guideH = height * 0.82;
  let guideW = guideH * templateRatio;
  if (guideW > width * 0.88) {
    guideW = width * 0.88;
    guideH = guideW / templateRatio;
  }
  const guideX = (width - guideW) / 2;
  const guideY = (height - guideH) / 2;
  
  // Tính toán 4 góc (Corners) của Guide Box để giới hạn VÙNG TÌM KIẾM CỰC HẸP
  const cornerSize = Math.max(40, Math.min(guideW, guideH) * 0.16);
  // Chỉ cộng thêm 5 pixel (rất mỏng) để ép điểm đen phải nằm đúng vào trong 4 ô vuông mờ trên UI
  const pad = 5;
  
  const cornerZones = {
    TL: { minX: guideX - pad, maxX: guideX + cornerSize + pad, minY: guideY - pad, maxY: guideY + cornerSize + pad },
    TR: { minX: guideX + guideW - cornerSize - pad, maxX: guideX + guideW + pad, minY: guideY - pad, maxY: guideY + cornerSize + pad },
    BL: { minX: guideX - pad, maxX: guideX + cornerSize + pad, minY: guideY + guideH - cornerSize - pad, maxY: guideY + guideH + pad },
    BR: { minX: guideX + guideW - cornerSize - pad, maxX: guideX + guideW + pad, minY: guideY + guideH - cornerSize - pad, maxY: guideY + guideH + pad }
  };

  // 4. Connected Components (Tìm Blobs) cực kỳ tối ưu
  const blobs = findBlobs(binary, visited, qX, qY, width, height, cornerZones);

  // 5. Lọc và Xác nhận Không gian 4 góc
  const markers = filterMarkers(blobs, width, height);

  // 6. Ping-Pong Transferable Object: Chuyền ngược buffer về Main Thread
  self.postMessage({ markers, buffer: imageData.data.buffer }, [imageData.data.buffer]);
};

/**
 * Thuật toán Phân ngưỡng thích ứng tốc độ cao
 */
function fastAdaptiveThreshold(gray, binary, width, height, intImg) {
  const s = Math.max(1, Math.floor(width / 16)); // Block size
  // Nới lỏng độ tương phản: Chỉ cần tối hơn trung bình 7% thay vì 10% (để bắt được marker bị mờ do downscale)
  const t = 7; 

  // Tính Integral Image
  for (let i = 0; i < width; i++) {
    let sum = 0;
    for (let j = 0; j < height; j++) {
      sum += gray[j * width + i];
      intImg[j * width + i] = (i > 0 ? intImg[j * width + i - 1] : 0) + sum;
    }
  }

  // Áp dụng Threshold
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      const x1 = Math.max(i - s, 0);
      const x2 = Math.min(i + s, width - 1);
      const y1 = Math.max(j - s, 0);
      const y2 = Math.min(j + s, height - 1);
      const count = (x2 - x1) * (y2 - y1);

      const sum =
        intImg[y2 * width + x2] -
        intImg[y1 * width + x2] -
        intImg[y2 * width + x1] +
        intImg[y1 * width + x1];

      // Pixel đen = 1 (mực), Pixel trắng = 0 (giấy)
      binary[j * width + i] = gray[j * width + i] * count < (sum * (100 - t)) / 100 ? 1 : 0;
    }
  }
}

/**
 * Thuật toán tìm vùng liên thông (Connected Components) bằng BFS
 */
function findBlobs(binary, visited, qX, qY, width, height, cornerZones) {
  const blobs = [];
  const imgArea = width * height;

  // Diện tích Marker thường khá nhỏ (nhưng không quá to để tránh nhầm với tóc/quần áo)
  // Phải nới lỏng minArea xuống mức CỰC TIỂU vì khi bị nén xuống 320px, marker có thể chỉ còn 3x3 hoặc 4x4 pixel!
  const minArea = imgArea * 0.0001; // Khoảng 7 pixel vuông (tương đương 3x3)
  const maxArea = imgArea * 0.05; 

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (binary[idx] === 1 && visited[idx] === 0) {
        // Tìm thấy một blob mới, bắt đầu BFS
        let head = 0, tail = 0;
        qX[tail] = x; qY[tail] = y; tail++;
        visited[idx] = 1;

        let minX = x, maxX = x, minY = y, maxY = y;
        let area = 0;

        while (head < tail) {
          const cx = qX[head];
          const cy = qY[head];
          head++;
          area++;

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          // Quét 4 điểm lân cận
          if (cx > 0) {
            const nIdx = cy * width + (cx - 1);
            if (binary[nIdx] === 1 && visited[nIdx] === 0) { visited[nIdx] = 1; qX[tail] = cx - 1; qY[tail] = cy; tail++; }
          }
          if (cx < width - 1) {
            const nIdx = cy * width + (cx + 1);
            if (binary[nIdx] === 1 && visited[nIdx] === 0) { visited[nIdx] = 1; qX[tail] = cx + 1; qY[tail] = cy; tail++; }
          }
          if (cy > 0) {
            const nIdx = (cy - 1) * width + cx;
            if (binary[nIdx] === 1 && visited[nIdx] === 0) { visited[nIdx] = 1; qX[tail] = cx; qY[tail] = cy - 1; tail++; }
          }
          if (cy < height - 1) {
            const nIdx = (cy + 1) * width + cx;
            if (binary[nIdx] === 1 && visited[nIdx] === 0) { visited[nIdx] = 1; qX[tail] = cx; qY[tail] = cy + 1; tail++; }
          }
        }

        // --- Lọc nhiễu (Heuristic Filtering) ---
        if (area > minArea && area < maxArea) {
          const bw = maxX - minX + 1;
          const bh = maxY - minY + 1;
          const cx = minX + bw / 2;
          const cy = minY + bh / 2;

          // BỘ LỌC VÙNG SIÊU CHẶT: Chỉ chấp nhận các Blob nằm lọt thỏm trong 1 trong 4 góc của Guide Box!
          const inTL = cx >= cornerZones.TL.minX && cx <= cornerZones.TL.maxX && cy >= cornerZones.TL.minY && cy <= cornerZones.TL.maxY;
          const inTR = cx >= cornerZones.TR.minX && cx <= cornerZones.TR.maxX && cy >= cornerZones.TR.minY && cy <= cornerZones.TR.maxY;
          const inBL = cx >= cornerZones.BL.minX && cx <= cornerZones.BL.maxX && cy >= cornerZones.BL.minY && cy <= cornerZones.BL.maxY;
          const inBR = cx >= cornerZones.BR.minX && cx <= cornerZones.BR.maxX && cy >= cornerZones.BR.minY && cy <= cornerZones.BR.maxY;

          if (!(inTL || inTR || inBL || inBR)) {
            continue; // Rác nằm ngoài 4 góc ngắm -> Bỏ qua ngay!
          }

          const aspect = bw / bh;

          // Nới lỏng lại Aspect Ratio (0.5 - 2.0) và Fill Ratio > 0.4 
          // (Vì chúng ta đã khóa vùng tìm kiếm bằng cornerZones nên không sợ bắt nhầm chữ viết nữa.
          //  Nới lỏng giúp marker 3x4 pixel không bị rớt đài khi khung hình chớp nháy)
          if (aspect > 0.5 && aspect < 2.0) {
            const fill = area / (bw * bh);
            if (fill > 0.4) {
              blobs.push({ 
                minX, maxX, minY, maxY, 
                bw, bh, area, fill,
                cx: minX + bw / 2, 
                cy: minY + bh / 2 
              });
            }
          }
        }
      }
    }
  }
  return blobs;
}

/**
 * Phân tích cấu trúc không gian để chốt 4 marker
 */
function filterMarkers(blobs, width, height) {
  const corners = { TL: null, TR: null, BL: null, BR: null };
  const bestScores = { TL: 0, TR: 0, BL: 0, BR: 0 };
  
  const midX = width / 2;
  const midY = height / 2;

  for (const b of blobs) {
    let quad = '';
    if (b.cx < midX && b.cy < midY) quad = 'TL';
    else if (b.cx >= midX && b.cy < midY) quad = 'TR';
    else if (b.cx < midX && b.cy >= midY) quad = 'BL';
    else if (b.cx >= midX && b.cy >= midY) quad = 'BR';
    
    if (!quad) continue;

    let dx = quad === 'TL' || quad === 'BL' ? b.cx : width - b.cx;
    let dy = quad === 'TL' || quad === 'TR' ? b.cy : height - b.cy;

    // Siết lại khoảng cách góc (tối đa 35%) để người dùng phải để giấy tương đối khớp khung
    const maxDistX = width * 0.35;
    const maxDistY = height * 0.35;
    if (dx > maxDistX || dy > maxDistY) continue;

    // Ưu tiên tuyệt đối khoảng cách tới góc ngoài (distPenalty).
    // Không nhân với diện tích hay fill nữa để tránh trường hợp Marker bị mờ một chút thì bị ô tô đáp án bên cạnh cướp điểm!
    // Marker gốc luôn luôn là điểm ngoài cùng sát lề nhất.
    const distPenalty = (maxDistX - dx) + (maxDistY - dy); 
    const score = distPenalty;

    if (score > bestScores[quad]) {
      bestScores[quad] = score;
      corners[quad] = b;
    }
  }

  // Phải đủ 4 góc mới Validate không gian
  if (corners.TL && corners.TR && corners.BL && corners.BR) {
    const topLen = Math.hypot(corners.TR.cx - corners.TL.cx, corners.TR.cy - corners.TL.cy);
    const botLen = Math.hypot(corners.BR.cx - corners.BL.cx, corners.BR.cy - corners.BL.cy);
    const leftLen = Math.hypot(corners.BL.cx - corners.TL.cx, corners.BL.cy - corners.TL.cy);
    const rightLen = Math.hypot(corners.BR.cx - corners.TR.cx, corners.BR.cy - corners.TR.cy);
    
    // Diện tích hộp tạo bởi 4 marker phải chiếm ít nhất 30% khung hình
    if (topLen < width * 0.3 || leftLen < height * 0.3) return null; 
    
    // Cạnh đối diện phải tương đối song song / bằng nhau (Siết chặt nhất ở mức 1.3x)
    const hRatio = Math.max(topLen, botLen) / Math.min(topLen, botLen);
    const vRatio = Math.max(leftLen, rightLen) / Math.min(leftLen, rightLen);
    
    if (hRatio < 1.3 && vRatio < 1.3) {
       // Trả về theo thứ tự chuẩn
       return [corners.TL, corners.TR, corners.BR, corners.BL]; 
    }
  }
  return null;
}
