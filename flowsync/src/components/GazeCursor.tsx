import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface GazeCursorProps {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  fixationStability: number; // 0-100
  visible: boolean;
}

export default function GazeCursor({ x, y, fixationStability, visible }: GazeCursorProps) {
  const [screenX, setScreenX] = useState(0);
  const [screenY, setScreenY] = useState(0);

  useEffect(() => {
    setScreenX(x * window.innerWidth);
    setScreenY(y * window.innerHeight);
  }, [x, y]);

  if (!visible) return null;

  // Subtle color based on fixation stability (more refined)
  const getColor = () => {
    if (fixationStability > 80) return '#A7C7E7'; // Soft blue - very stable
    if (fixationStability > 60) return '#93C5FD'; // Sky blue - stable
    if (fixationStability > 40) return '#FCD34D'; // Soft yellow - moderate
    return '#F87171'; // Soft red - unstable
  };

  // Subtle size variation
  const getSize = () => {
    return Math.max(10, Math.min(18, 10 + (fixationStability / 100) * 8));
  };

  return (
    <motion.div
      className="fixed pointer-events-none z-[9999]"
      animate={{
        left: screenX,
        top: screenY,
        opacity: visible ? 0.8 : 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 35,
        mass: 0.3,
      }}
      style={{
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full blur-xl"
        style={{
          backgroundColor: getColor(),
          width: getSize() * 2,
          height: getSize() * 2,
          marginLeft: -getSize(),
          marginTop: -getSize(),
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Inner dot */}
      <motion.div
        className="relative rounded-full"
        style={{
          backgroundColor: getColor(),
          width: getSize(),
          height: getSize(),
          boxShadow: `0 0 ${getSize()}px ${getColor()}`,
        }}
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Ring indicator */}
      <motion.div
        className="absolute rounded-full border-2"
        style={{
          borderColor: getColor(),
          width: getSize() * 2,
          height: getSize() * 2,
          marginLeft: -getSize() / 2,
          marginTop: -getSize() / 2,
        }}
        animate={{
          scale: [1, 1.5],
          opacity: [0.8, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      />
    </motion.div>
  );
}

