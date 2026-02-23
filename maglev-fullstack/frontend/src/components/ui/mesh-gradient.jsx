export function MeshGradientBackground({
  colors = ["#7c3aed", "#2563eb", "#06b6d4", "#8b5cf6"],
  speed = 1,
  backgroundColor = "#030014"
}) {
  const duration = 60 / speed

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden"
      style={{ backgroundColor }}
    >
      <div className="absolute w-[60vw] h-[60vw] -top-[20vw] -left-[20vw] rounded-full"
        style={{
          background: `radial-gradient(circle, ${colors[0]}40 0%, transparent 70%)`,
          filter: "blur(100px)",
          animation: `meshMove ${duration}s ease-in-out infinite`,
        }}
      />

      <style>{`
        @keyframes meshMove {
          0%,100%{transform:translate(0,0) scale(1);}
          50%{transform:translate(8vw,5vh) scale(1.1);}
        }
      `}</style>
    </div>
  )
}