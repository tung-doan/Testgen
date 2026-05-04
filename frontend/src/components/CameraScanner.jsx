"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Check, X, Loader2, ZoomIn } from "lucide-react";

/**
 * CameraScanner Component
 *
 * Opens webcam, shows live preview with corner marker detection overlay.
 * When 4 black corner markers are detected → auto-captures the frame.
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
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [markersDetected, setMarkersDetected] = useState(0);
  const [autoCapturing, setAutoCapturing] = useState(false);
  const [error, setError] = useState(null);

  // Stable frame counter for auto-capture (need N consecutive frames with 4 markers)
  const stableCountRef = useRef(0);
  const STABLE_FRAMES_NEEDED = 15; // ~0.5s at 30fps

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
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

  // Detect black corner markers in the video frame
  const detectMarkers = useCallback(() => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay || !cameraReady || capturedImage) return;

    const ctx = overlay.getContext("2d", { willReadFrequently: true });
    const w = video.videoWidth;
    const h = video.videoHeight;

    if (w === 0 || h === 0) {
      animFrameRef.current = requestAnimationFrame(detectMarkers);
      return;
    }

    overlay.width = w;
    overlay.height = h;

    // Draw video frame to overlay for analysis
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Clear overlay and draw guide
    ctx.clearRect(0, 0, w, h);

    // Check 4 corner regions for dark pixels
    const cornerSize = Math.floor(Math.min(w, h) * 0.08); // 8% of smallest dimension
    const scanMargin = Math.floor(Math.min(w, h) * 0.05); // 5% from edges

    const corners = [
      {
        x: scanMargin,
        y: scanMargin,
        label: "TL",
      }, // top-left
      {
        x: w - scanMargin - cornerSize,
        y: scanMargin,
        label: "TR",
      }, // top-right
      {
        x: scanMargin,
        y: h - scanMargin - cornerSize,
        label: "BL",
      }, // bottom-left
      {
        x: w - scanMargin - cornerSize,
        y: h - scanMargin - cornerSize,
        label: "BR",
      }, // bottom-right
    ];

    let detected = 0;

    corners.forEach((corner) => {
      const darkPixels = countDarkPixels(
        data,
        w,
        corner.x,
        corner.y,
        cornerSize,
        cornerSize,
      );
      const totalPixels = cornerSize * cornerSize;
      const darkRatio = darkPixels / totalPixels;

      // If >25% of the corner region is dark → marker detected
      const isDetected = darkRatio > 0.25;
      if (isDetected) detected++;

      // Draw detection box
      ctx.strokeStyle = isDetected
        ? "rgba(0, 255, 0, 0.8)"
        : "rgba(255, 0, 0, 0.5)";
      ctx.lineWidth = 3;
      ctx.strokeRect(corner.x, corner.y, cornerSize, cornerSize);

      // Draw status icon
      ctx.fillStyle = isDetected
        ? "rgba(0, 255, 0, 0.7)"
        : "rgba(255, 0, 0, 0.3)";
      ctx.font = `bold ${Math.floor(cornerSize * 0.5)}px monospace`;
      ctx.fillText(
        isDetected ? "✓" : "?",
        corner.x + cornerSize * 0.3,
        corner.y + cornerSize * 0.6,
      );
    });

    setMarkersDetected(detected);

    // Draw center guide text
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = `bold ${Math.floor(w * 0.025)}px sans-serif`;
    ctx.textAlign = "center";

    if (detected === 4) {
      ctx.fillStyle = "rgba(0, 255, 0, 0.9)";
      ctx.fillText("✓ All markers detected — Hold still...", w / 2, h * 0.05);
      stableCountRef.current += 1;

      // Auto-capture after stable detection
      if (stableCountRef.current >= STABLE_FRAMES_NEEDED && !autoCapturing) {
        setAutoCapturing(true);
        captureFrame();
        return;
      }
    } else {
      stableCountRef.current = 0;
      ctx.fillText(
        `Align paper: ${detected}/4 markers detected`,
        w / 2,
        h * 0.05,
      );
    }

    // Draw progress bar for auto-capture
    if (detected === 4 && stableCountRef.current > 0) {
      const progress = stableCountRef.current / STABLE_FRAMES_NEEDED;
      const barWidth = w * 0.4;
      const barHeight = 8;
      const barX = (w - barWidth) / 2;
      const barY = h * 0.07;
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
      ctx.fillRect(barX, barY, barWidth * progress, barHeight);
    }

    animFrameRef.current = requestAnimationFrame(detectMarkers);
  }, [cameraReady, capturedImage, autoCapturing]);

  // Count dark pixels in a region
  function countDarkPixels(data, imgWidth, rx, ry, rw, rh) {
    let count = 0;
    const threshold = 60; // RGB values below this = "dark"
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        const idx = (y * imgWidth + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        if (r < threshold && g < threshold && b < threshold) {
          count++;
        }
      }
    }
    return count;
  }

  // Capture the current frame
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);

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

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Start detection loop when camera is ready
  useEffect(() => {
    if (cameraReady && !capturedImage) {
      animFrameRef.current = requestAnimationFrame(detectMarkers);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [cameraReady, capturedImage, detectMarkers]);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {error ? (
        <div className="text-center py-8">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
            <p className="font-medium">{error}</p>
          </div>
          <Button onClick={startCamera} className="bg-blue-600 hover:bg-blue-700">
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      ) : capturedImage ? (
        /* ===== PREVIEW CAPTURED IMAGE ===== */
        <div className="w-full">
          <div className="relative rounded-lg overflow-hidden border-2 border-green-400 bg-black">
            <img
              src={capturedImage}
              alt="Captured answer sheet"
              className="w-full object-contain max-h-[60vh]"
            />
            <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              ✓ Captured
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
      ) : (
        /* ===== LIVE CAMERA PREVIEW ===== */
        <div className="w-full">
          <div className="relative rounded-lg overflow-hidden bg-black border-2 border-gray-300">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-[60vh] object-contain"
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
            {/* Marker status badge */}
            {cameraReady && (
              <div
                className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-sm font-bold shadow-lg ${
                  markersDetected === 4
                    ? "bg-green-500 text-white animate-pulse"
                    : markersDetected >= 2
                      ? "bg-yellow-500 text-white"
                      : "bg-red-500/80 text-white"
                }`}
              >
                {markersDetected}/4 markers
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              {markersDetected === 4
                ? "Hold still — auto-capturing..."
                : "Point camera at answer sheet with 4 corner markers"}
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
      )}

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
