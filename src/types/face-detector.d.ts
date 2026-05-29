// Minimal ambient types for the experimental browser Shape Detection API
// (FaceDetector). Available in Chromium behind a flag / on some platforms;
// we feature-detect at runtime and fall back gracefully when absent.
// https://wicg.github.io/shape-detection-api/#face-detection-api

interface FaceDetectorOptions {
  maxDetectedFaces?: number;
  fastMode?: boolean;
}

interface DetectedFace {
  boundingBox: DOMRectReadOnly;
  landmarks?: ReadonlyArray<{ type: string; locations: ReadonlyArray<{ x: number; y: number }> }>;
}

declare class FaceDetector {
  constructor(options?: FaceDetectorOptions);
  detect(image: CanvasImageSource): Promise<DetectedFace[]>;
}

interface Window {
  FaceDetector?: typeof FaceDetector;
}
