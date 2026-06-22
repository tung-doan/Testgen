"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Check, X, Loader2, ZoomIn } from "lucide-react";

/**
 * CameraScanner Component
 *
 * Opens webcam, shows live preview with a PORTRAIT scan guide overlay.
 * Detects paper edges using contrast-based analysis.
 * When all 4 edges are detected → auto-captures the frame.
 * User can confirm or retake. On confirm → calls onCapture(blob).
 *
 * Props:
 *   - onCapture(blob): called with the captured image Blob
 *   - onClose(): called when user closes the scanner
 */
export default function CameraScanner({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const containerRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [edgesDetected, setEdgesDetected] = useState(0);
  const [autoCapturing, setAutoCapturing] = useState(false);
  const [error, setError] = useState(null);

  // Giảm thời gian chờ xuống còn chưa tới 1 giây (vì thuật toán giờ đã quá chính xác, bắt dính là ăn luôn)
  const stableCountRef = useRef(0);
  const STABLE_FRAMES_NEEDED = 20;

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
      } catch (firstErr) {
        console.warn("Environment camera failed, falling back to default camera:", firstErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraReady(true);
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError(
        "Cannot access camera. Please allow camera permission and try again.",
      );
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  // Process video frame using Web Worker
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay || !cameraReady || capturedImage || autoCapturing) return;

    const ctx = overlay.getContext("2d", { willReadFrequently: true });
    const w = video.videoWidth;
    const h = video.videoHeight;

    if (w === 0 || h === 0) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const container = containerRef.current;
    if (!container) return;
    const cW = container.clientWidth;
    const cH = container.clientHeight;

    if (cW === 0 || cH === 0) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    overlay.width = cW;
    overlay.height = cH;

    // Nếu Worker đang bận xử lý frame trước, ta chỉ vẽ lại frame và marker cũ (chống giật)
    if (isProcessingRef.current || !workerRef.current) {
      ctx.clearRect(0, 0, cW, cH);
      drawMarkersAndUI(ctx, cW, cH);
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Thu nhỏ (downscale) ảnh để Worker xử lý siêu nhanh, BẢO TOÀN TỶ LỆ KHUNG HÌNH (tránh méo marker)
    const procW = 320;
    const procH = Math.round(procW * (cH / cW)); // Tính procH theo tỷ lệ thật của màn hình
    
    if (!window._procCanvas) {
       window._procCanvas = document.createElement('canvas');
    }
    window._procCanvas.width = procW;
    window._procCanvas.height = procH;
    const pCtx = window._procCanvas.getContext('2d', { willReadFrequently: true });
    
    // Kích thước video nguyên bản
    const scale = Math.max(cW / w, cH / h);
    const sW = w * scale;
    const sH = h * scale;
    const dx = (cW - sW) / 2;
    const dy = (cH - sH) / 2;

    // Vẽ video lên procCanvas thu nhỏ
    const scaleRatio = procW / cW; 
    pCtx.scale(scaleRatio, scaleRatio);
    pCtx.drawImage(video, 0, 0, w, h, dx, dy, sW, sH);
    pCtx.setTransform(1, 0, 0, 1, 0, 0);
    
    const imageData = pCtx.getImageData(0, 0, procW, procH);
    
    isProcessingRef.current = true;
    
    // Gửi buffer qua Worker bằng Transferable Objects (Ping-pong)
    workerRef.current.postMessage(
      { imageData, width: procW, height: procH }, 
      [imageData.data.buffer]
    );

    // Bắt đầu vẽ giao diện quét đè lên video
    ctx.clearRect(0, 0, cW, cH);
    drawMarkersAndUI(ctx, cW, cH);

    animFrameRef.current = requestAnimationFrame(processFrame);
  }, [cameraReady, capturedImage, autoCapturing]);

  const drawMarkersAndUI = (ctx, cW, cH) => {
    const markers = detectedMarkersRef.current;
    
    // Vẽ màn mờ (Dim background)
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(0, 0, cW, cH);

    const procW = 320;
    const procH = Math.round(procW * (cH / cW)); // SỬA LỖI: procH phải tính theo tỷ lệ màn hình giống hệt lúc nén!
    const scaleX = cW / procW;
    const scaleY = cH / procH;
    
    if (markers && markers.length === 4) {
      if (edgesDetected !== 4) setEdgesDetected(4); // Cập nhật state UI
      stableCountRef.current += 1;

      // Vẽ Polygon nối 4 góc (Khoét lỗ sáng vùng giấy)
      ctx.beginPath();
      ctx.moveTo(markers[0].cx * scaleX, markers[0].cy * scaleY); // TL
      ctx.lineTo(markers[1].cx * scaleX, markers[1].cy * scaleY); // TR
      ctx.lineTo(markers[2].cx * scaleX, markers[2].cy * scaleY); // BR
      ctx.lineTo(markers[3].cx * scaleX, markers[3].cy * scaleY); // BL
      ctx.closePath();
      
      // Xóa lớp mờ bên trong vùng giấy
      ctx.save();
      ctx.clip();
      ctx.clearRect(0, 0, cW, cH);
      ctx.restore();

      // Viền vùng giấy mỏng và trong suốt để không làm rối mắt
      ctx.strokeStyle = `rgba(0, 255, 100, 0.2)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Nâng cấp UX: Vẽ Bounding Box ĐÚNG kích thước ôm sát từng Marker, và khung này sẽ dày lên
      const progress = Math.min(1, stableCountRef.current / STABLE_FRAMES_NEEDED);
      const dynamicLineWidth = 2 + (progress * 4); // Từ 2px dày lên 6px
      
      markers.forEach(m => {
        ctx.strokeStyle = `rgba(0, 255, 100, ${0.7 + progress * 0.3})`; // Xanh lá cây chói
        ctx.lineWidth = dynamicLineWidth;
        
        // Thêm chút padding để viền ôm ra ngoài rìa màu đen của marker
        const pad = 3;
        ctx.strokeRect(
          m.minX * scaleX - pad, 
          m.minY * scaleY - pad, 
          m.bw * scaleX + pad * 2, 
          m.bh * scaleY + pad * 2
        );
      });

      // Auto capture trigger
      if (stableCountRef.current >= STABLE_FRAMES_NEEDED && !autoCapturing) {
        setAutoCapturing(true);
        captureFrame();
      }
    } else {
      if (edgesDetected !== 0) setEdgesDetected(0);
      stableCountRef.current = 0;
      
      // Tính toán vị trí 4 ô vuông theo tỷ lệ chuẩn của Template Backend (800x1000)
      const templateRatio = 800 / 1000; // 0.8
      let guideH = cH * 0.82; // Chiếm 82% chiều cao màn hình
      let guideW = guideH * templateRatio;

      // Nếu guideW vượt quá 88% chiều rộng màn hình, thu nhỏ lại theo chiều rộng
      if (guideW > cW * 0.88) {
        guideW = cW * 0.88;
        guideH = guideW / templateRatio;
      }
      
      const guideX = (cW - guideW)/2;
      const guideY = (cH - guideH)/2;
      
      ctx.clearRect(guideX, guideY, guideW, guideH); // Xóa lớp màn mờ ở giữa để tạo vùng sáng cho giấy

      // Vẽ 4 ô vuông to ở 4 góc để hướng dẫn User đặt Marker vào
      const cornerSize = Math.max(40, Math.min(guideW, guideH) * 0.16); // Kích thước ô vuông RẤT TO (16% cạnh ngắn)
      ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 2.5;
      
      const corners = [
        {x: guideX, y: guideY}, // TL
        {x: guideX + guideW - cornerSize, y: guideY}, // TR
        {x: guideX, y: guideY + guideH - cornerSize}, // BL
        {x: guideX + guideW - cornerSize, y: guideY + guideH - cornerSize} // BR
      ];
      
      corners.forEach(c => {
        ctx.fillRect(c.x, c.y, cornerSize, cornerSize);
        ctx.strokeRect(c.x, c.y, cornerSize, cornerSize);
        
        // Vẽ thêm chấm tròn nhỏ ở giữa ô vuông mờ để tăng độ trực quan (tâm ngắm)
        ctx.beginPath();
        ctx.arc(c.x + cornerSize/2, c.y + cornerSize/2, 4, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fill();
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)"; // Reset fill style
      });
    }
    
    // Vẽ Progress Bar Auto-Capture tĩnh ở dưới cùng
    if (stableCountRef.current > 0) {
      const progress = Math.min(1, stableCountRef.current / STABLE_FRAMES_NEEDED);
      const barW = cW * 0.6;
      const barH = 8;
      const barX = (cW - barW)/2;
      const barY = cH * 0.85;
      
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 4); ctx.fill();
      
      ctx.fillStyle = "#00FF64";
      ctx.beginPath(); ctx.roundRect(barX, barY, barW * progress, barH, 4); ctx.fill();
    }
  };

  // Capture the current frame
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    
    const container = containerRef.current;
    if (!container) return;
    const cW = container.clientWidth;
    const cH = container.clientHeight;

    // Tính toán tỷ lệ mô phỏng CSS object-cover
    const scale = Math.max(cW / w, cH / h);
    
    // Kích thước vùng video thực sự hiển thị cho người dùng (tính theo pixel của video gốc)
    const cropW = cW / scale;
    const cropH = cH / scale;
    const cropX = (w - cropW) / 2;
    const cropY = (h - cropH) / 2;

    // Chỉ crop đúng phần hình ảnh người dùng nhìn thấy trên màn hình
    canvas.width = cropW;
    canvas.height = cropH;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          setCapturedImage(canvas.toDataURL("image/jpeg", 0.95));
        }
      },
      "image/jpeg",
      0.95,
    );
  }, []);

  // Manual capture
  const handleManualCapture = useCallback(() => {
    captureFrame();
  }, [captureFrame]);

  // Retake
  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setCapturedBlob(null);
    setAutoCapturing(false);
    stableCountRef.current = 0;
  }, []);

  // Confirm and send
  const handleConfirm = useCallback(() => {
    if (capturedBlob && onCapture) {
      onCapture(capturedBlob);
    }
  }, [capturedBlob, onCapture]);

  // Handle close
  const handleClose = useCallback(() => {
    stopCamera();
    if (onClose) onClose();
  }, [stopCamera, onClose]);

  const workerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const detectedMarkersRef = useRef(null);

  // Start camera and setup Worker on mount
  useEffect(() => {
    // Khởi tạo Web Worker để chạy thuật toán nhận diện Marker (Computer Vision) độc lập với UI Thread
    workerRef.current = new Worker(new URL('./scanner.worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      // Worker trả về mảng 4 markers và chuyền (transfer) lại bộ đệm ArrayBuffer (Ping-Pong GC optimization)
      const { markers } = e.data;
      detectedMarkersRef.current = markers;
      isProcessingRef.current = false; // Mở khóa cho frame tiếp theo
    };

    startCamera();
    
    return () => {
      stopCamera();
      if (workerRef.current) workerRef.current.terminate();
    };
  }, []);

  // Start detection loop when camera is ready
  useEffect(() => {
    if (cameraReady && !capturedImage) {
      animFrameRef.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [cameraReady, capturedImage, processFrame]);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {error && (
        <div className="text-center py-8">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
            <p className="font-medium">{error}</p>
          </div>
          <Button
            onClick={startCamera}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )}

      {/* ===== PREVIEW CAPTURED IMAGE ===== */}
      <div className={`w-full ${capturedImage && !error ? "block" : "hidden"}`}>
        <div className="relative rounded-lg overflow-hidden border-2 border-green-400 bg-black mx-auto w-full h-[360px] sm:h-[480px]">
          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured answer sheet"
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            Captured
          </div>
        </div>
        <div className="flex gap-3 mt-4 justify-center">
          <Button
            variant="outline"
            onClick={handleRetake}
            className="gap-2 px-6"
          >
            <RotateCcw className="h-4 w-4" />
            Retake
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-green-600 hover:bg-green-700 gap-2 px-6"
          >
            <Check className="h-4 w-4" />
            Confirm & Submit
          </Button>
        </div>
      </div>

      {/* ===== LIVE CAMERA PREVIEW ===== */}
      <div
        className={`w-full ${!capturedImage && !error ? "block" : "hidden"}`}
      >
        <div 
          ref={containerRef}
          className="relative rounded-lg overflow-hidden bg-black border-2 border-gray-300 mx-auto w-full h-[360px] sm:h-[480px]"
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
          {/* Detection overlay */}
          <canvas
            ref={overlayRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />
          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
                <p className="font-medium">Starting camera...</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500 h-6 flex items-center">
            {edgesDetected === 4
              ? "Hold still — auto-capturing..."
              : "Align the paper within the border"}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualCapture}
              disabled={!cameraReady}
              className="gap-1"
            >
              <Camera className="h-4 w-4" />
              Manual Capture
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
