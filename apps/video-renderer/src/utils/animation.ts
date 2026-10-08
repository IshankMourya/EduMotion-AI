export function fadeIn(frame: number, duration: number, delay = 0): number {
  const progress = (frame - delay) / duration;
  return Math.max(0, Math.min(1, progress));
}

export function slideUp(frame: number, duration: number, distance = 50, delay = 0): number {
  const progress = (frame - delay) / duration;
  const clamped = Math.max(0, Math.min(1, progress));
  return distance * (1 - clamped);
}

export function slideDown(frame: number, duration: number, distance = 50, delay = 0): number {
  const progress = (frame - delay) / duration;
  const clamped = Math.max(0, Math.min(1, progress));
  return distance * clamped;
}

export function slideLeft(frame: number, duration: number, distance = 50, delay = 0): number {
  const progress = (frame - delay) / duration;
  const clamped = Math.max(0, Math.min(1, progress));
  return distance * (1 - clamped);
}

export function slideRight(frame: number, duration: number, distance = 50, delay = 0): number {
  const progress = (frame - delay) / duration;
  const clamped = Math.max(0, Math.min(1, progress));
  return distance * clamped;
}

export function springScale(frame: number, fps: number, delay = 0): number {
  const adjustedFrame = frame - delay;
  if (adjustedFrame <= 0) return 0.5;
  
  const springConfig = { damping: 20, stiffness: 200 };
  const progress = adjustedFrame / fps;
  
  // Simple spring approximation
  const omega = Math.sqrt(springConfig.stiffness);
  const damping = springConfig.damping / (2 * Math.sqrt(springConfig.stiffness));
  
  if (damping < 1) {
    const omegaD = omega * Math.sqrt(1 - damping * damping);
    const envelope = Math.exp(-damping * omega * progress);
    return 0.5 + 0.5 * (1 - envelope * Math.cos(omegaD * progress));
  }
  
  return 1;
}

export function typewriter(frame: number, duration: number, textLength: number, delay = 0): number {
  const progress = (frame - delay) / duration;
  const clamped = Math.max(0, Math.min(1, progress));
  return Math.floor(clamped * textLength);
}

export function stagger(frame: number, index: number, itemDuration: number, gap: number): number {
  return frame - index * (itemDuration + gap);
}