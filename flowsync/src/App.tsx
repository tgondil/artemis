import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Zap, Brain, Circle } from 'lucide-react';
import MainView from './components/MainView';

function App() {
  const [view, setView] = useState<'landing' | 'main'>('landing');

  if (view === 'main') {
    return <MainView onBack={() => setView('landing')} />;
  }

  return (
    <div className="w-screen h-screen bg-background flex items-center justify-center overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent-lavender/5" />
      
      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="relative z-10 max-w-4xl mx-auto px-8"
      >
        {/* Glass card container */}
        <div className="backdrop-blur-glass bg-white/[0.08] border border-white/10 rounded-glass-lg p-12 shadow-glass">
          {/* Logo/Icon area */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            className="flex justify-center mb-8"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full" />
              <Eye className="w-16 h-16 text-accent relative" strokeWidth={1.5} />
            </div>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-6xl font-light text-white/90 text-center mb-4 tracking-tight"
          >
            FlowSync
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.7 }}
            className="text-xl font-light text-white/60 text-center mb-12 max-w-2xl mx-auto"
          >
            Attention-aware environment orchestration for deep focus
          </motion.p>

          {/* Feature cards */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.9 }}
            className="grid grid-cols-3 gap-6 mb-12"
          >
            <FeatureCard
              icon={<Eye className="w-6 h-6" strokeWidth={1.5} />}
              title="Gaze Detection"
              description="Real-time attention tracking"
              delay={1.1}
            />
            <FeatureCard
              icon={<Brain className="w-6 h-6" strokeWidth={1.5} />}
              title="Flow Phases"
              description="Adaptive state transitions"
              delay={1.2}
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" strokeWidth={1.5} />}
              title="Environment Sync"
              description="Integrated lighting & audio"
              delay={1.3}
            />
          </motion.div>

          {/* Start button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.4 }}
            className="flex justify-center"
          >
            <button 
              onClick={() => setView('main')}
              className="group relative px-8 py-4 bg-white/10 hover:bg-white/15 border border-white/20 rounded-glass text-white/90 font-light text-lg transition-all duration-500 backdrop-blur-sm"
            >
              <span className="relative z-10">Begin Calibration</span>
              <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 rounded-glass transition-opacity duration-500" />
            </button>
          </motion.div>

          {/* Status indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.6 }}
            className="flex items-center justify-center gap-2 mt-8 text-white/40 text-sm font-light"
          >
            <Circle className="w-2 h-2 fill-accent text-accent animate-pulse" />
            <span>System ready</span>
          </motion.div>
        </div>

        {/* Ambient floating elements */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-10 right-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            y: [0, 20, 0],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
          className="absolute bottom-10 left-10 w-40 h-40 bg-accent-lavender/10 rounded-full blur-3xl"
        />
      </motion.div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

function FeatureCard({ icon, title, description, delay }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: 'easeOut' }}
      className="backdrop-blur-sm bg-white/[0.05] border border-white/10 rounded-glass p-6 hover:bg-white/[0.08] transition-all duration-500"
    >
      <div className="text-accent mb-3">{icon}</div>
      <h3 className="text-white/90 font-light text-lg mb-2">{title}</h3>
      <p className="text-white/50 font-light text-sm">{description}</p>
    </motion.div>
  );
}

export default App;

