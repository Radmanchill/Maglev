export function Hero({ children, className = "" }) {
  return (
    <div className={`relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center overflow-hidden ${className}`}>
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-50">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

Hero.Content = ({ children, className = "" }) => (
  <div className={`text-center max-w-3xl mx-auto px-4 ${className}`}>
    {children}
  </div>
);

Hero.Heading = ({ children, className = "" }) => (
  <h1 className={`text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent ${className}`}>
    {children}
  </h1>
);

Hero.Subtitle = ({ children, className = "" }) => (
  <p className={`text-xl md:text-2xl text-slate-300 mb-12 leading-relaxed ${className}`}>
    {children}
  </p>
);
