"use client";

import { motion } from "motion/react";

export function AnimatedBackground() {
  const circles = [
    { x: "20%", y: "30%", size: 8, color: "bg-[#e8631a]/20" },
    { x: "80%", y: "20%", size: 6, color: "bg-white/10" },
    { x: "85%", y: "70%", size: 10, color: "bg-[#e8631a]/20" },
    { x: "10%", y: "80%", size: 7, color: "bg-white/10" },
    { x: "50%", y: "90%", size: 6, color: "bg-[#e8631a]/20" },
    { x: "95%", y: "40%", size: 8, color: "bg-white/10" },
  ];

  const squares = [
    { x: "25%", y: "85%", size: 12, color: "border-[#e8631a]/20" },
    { x: "70%", y: "75%", size: 10, color: "border-white/10" },
    { x: "90%", y: "50%", size: 14, color: "border-[#e8631a]/20" },
  ];

  // Fixed positions to avoid Math.random() hydration mismatch in Next.js
  const binaryDots = [
    { left: "12%", top: "8%",  val: "1" },
    { left: "34%", top: "15%", val: "0" },
    { left: "67%", top: "5%",  val: "1" },
    { left: "88%", top: "22%", val: "0" },
    { left: "5%",  top: "42%", val: "1" },
    { left: "45%", top: "38%", val: "0" },
    { left: "72%", top: "44%", val: "1" },
    { left: "92%", top: "35%", val: "0" },
    { left: "18%", top: "58%", val: "1" },
    { left: "55%", top: "62%", val: "0" },
    { left: "78%", top: "55%", val: "1" },
    { left: "38%", top: "72%", val: "0" },
    { left: "60%", top: "78%", val: "1" },
    { left: "25%", top: "92%", val: "0" },
    { left: "82%", top: "90%", val: "1" },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Vertical lines */}
      {[...Array(12)].map((_, i) => (
        <motion.div
           // ...
          key={`vline-${i}`}
          className="absolute h-full w-px bg-gradient-to-b from-transparent via-[#e8631a]/10 to-transparent"
          style={{ left: `${8 + i * 8}%` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.05, 0.2, 0.05] }}
          transition={{ duration: 3, delay: i * 0.2, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Animated circles */}
      {circles.map((circle, i) => (
        <motion.div
          key={`circle-${i}`}
          className={`absolute rounded-full ${circle.color}`}
          style={{ left: circle.x, top: circle.y, width: circle.size, height: circle.size }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3, delay: i * 0.4, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Animated squares */}
      {squares.map((square, i) => (
        <motion.div
          key={`square-${i}`}
          className={`absolute border ${square.color}`}
          style={{ left: square.x, top: square.y, width: square.size, height: square.size }}
          animate={{ rotate: [0, 90, 0], opacity: [0.15, 0.4, 0.15] }}
          transition={{ duration: 6, delay: i * 0.6, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Embedded AI Visualization Core */}
      <div className="absolute inset-0 flex items-center justify-center opacity-50 scale-150 transform transition-all">
        <AIVisualization />
      </div>
    </div>
  );
}

export function AIVisualization() {
  return (
    <div className="relative w-full h-80">
      {/* Central Brain/AI Core */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          {/* Outer Ring */}
          <motion.div
            className="w-48 h-48 rounded-full border-4 border-[#e8631a]/20"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          {/* Middle Ring */}
          <motion.div
            className="absolute inset-6 rounded-full border-4 border-[#e8631a]/30"
            animate={{ scale: [1, 0.9, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />

          {/* Inner Core */}
          <motion.div
            className="absolute inset-12 rounded-full bg-[#e8631a]/20 backdrop-blur-sm flex items-center justify-center"
            animate={{
              boxShadow: [
                "0 0 20px rgba(232,131,26,0.2)",
                "0 0 40px rgba(232,131,26,0.4)",
                "0 0 20px rgba(232,131,26,0.2)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <svg
              className="w-16 h-16 text-[#e8631a]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </motion.div>
        </motion.div>

        {/* Orbiting Particles */}
        {[...Array(8)].map((_, i) => {
          const angle = (i * 360) / 8;
          return (
            <motion.div
              key={i}
              className="absolute w-4 h-4 bg-[#e8631a] rounded-full"
              style={{
                left: "50%",
                top: "50%",
              }}
              animate={{
                x: [
                  Math.cos((angle * Math.PI) / 180) * 120,
                  Math.cos(((angle + 180) * Math.PI) / 180) * 120,
                  Math.cos((angle * Math.PI) / 180) * 120,
                ],
                y: [
                  Math.sin((angle * Math.PI) / 180) * 120,
                  Math.sin(((angle + 180) * Math.PI) / 180) * 120,
                  Math.sin((angle * Math.PI) / 180) * 120,
                ],
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 4,
                delay: i * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          );
        })}

        {/* Data Stream Lines */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`line-${i}`}
            className="absolute w-1 bg-gradient-to-b from-transparent via-[#e8631a] to-transparent"
            style={{
              left: `${25 + i * 20}%`,
              height: "100%",
            }}
            animate={{
              opacity: [0, 0.3, 0],
              scaleY: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              delay: i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}
