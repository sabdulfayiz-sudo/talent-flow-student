import React from 'react';

interface WatermarkProps {
  label: string;
}

/**
 * Diagonal repeating watermark drawn behind the test content. If a
 * student takes a screenshot of a question and shares it, their name /
 * student id is baked into the image. Cheap deterrent, not a real
 * defense, but the asymmetry it creates is the point.
 */
const Watermark: React.FC<WatermarkProps> = ({ label }) => {
  const tile = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='480' height='240'><g fill='rgba(15,23,42,0.05)' font-family='Inter,sans-serif' font-size='18' font-weight='700' transform='rotate(-25 240 120)'><text x='10' y='80'>${label}</text><text x='10' y='160'>${label}</text></g></svg>`,
  );
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10"
      style={{
        backgroundImage: `url("data:image/svg+xml,${tile}")`,
        backgroundRepeat: 'repeat',
      }}
    />
  );
};

export default Watermark;
