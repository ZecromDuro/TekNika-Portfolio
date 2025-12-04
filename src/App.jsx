import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Terminal, Database, Smartphone, Server, Cpu, Activity, Lock, Power } from 'lucide-react';

// IMPORTS 3D
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// --- GESTION AUDIO & HAPTIC ---
let audioCtx = null;

const initAudio = () => {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

const playSound = (type = 'click') => {
  const ctx = initAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;

  if (type === 'click') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  } else if (type === 'scan') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.1);
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
  }

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
};

const triggerHaptic = (duration = 10) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(duration); } catch (e) { }
  }
};

// --- OUTIL DE LOG GLOBAL ---
const dispatchLog = (msg) => {
  window.dispatchEvent(new CustomEvent('sys-log', { detail: msg }));
};

// --- COMPOSANTS UI TACTIQUES ---

// 1. SCANLINES
const Scanlines = () => (
  <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden mix-blend-overlay">
    <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#ffffff_3px)] opacity-[0.08]"></div>
    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-10 animate-pulse"></div>
  </div>
);

// 2. SYSTEM LOGS (UNIQUE LIGNE)
const SystemLogs = () => {
  const [log, setLog] = useState("> SYSTÈME TEKNIKA: ARMÉ.");
  const idleTimer = useRef(null);
  const scrollTimeout = useRef(null);

  const updateLog = (msg) => {
    setLog(`> ${msg}`);
  };

  const resetIdleTimer = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      updateLog("Ahiiiiii tu te promène plus ?");
    }, 8000);
  };

  useEffect(() => {
    const handleCustomLog = (e) => {
      updateLog(e.detail);
      resetIdleTimer();
    };

    const handleScroll = () => {
      resetIdleTimer();
      if (!scrollTimeout.current) {
        updateLog("L'utilisateur se promène...");
        scrollTimeout.current = setTimeout(() => {
          scrollTimeout.current = null;
        }, 3000);
      }
    };

    window.addEventListener('sys-log', handleCustomLog);
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('click', resetIdleTimer);

    resetIdleTimer();

    return () => {
      window.removeEventListener('sys-log', handleCustomLog);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('click', resetIdleTimer);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-[45] font-mono text-[10px] md:text-[11px] text-green-400 text-shadow-sm flex items-center p-2 bg-black/80 backdrop-blur-md rounded border border-green-500/50 shadow-[0_0_10px_rgba(0,255,0,0.2)]">
      <span className="mr-2 animate-pulse">●</span>
      <AnimatePresence mode='wait'>
        <motion.span
          key={log}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="whitespace-nowrap tracking-wide"
        >
          {log}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

// 3. SONAR
const ClickRipple = () => {
  const [ripples, setRipples] = useState([]);

  useEffect(() => {
    const handleClick = (e) => {
      const newRipple = { x: e.clientX, y: e.clientY, id: Date.now() };
      setRipples(prev => [...prev, newRipple]);
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 1000);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {ripples.map(r => (
        <motion.div
          key={r.id}
          initial={{ width: 0, height: 0, opacity: 0.8, borderWidth: '2px' }}
          animate={{ width: 150, height: 150, opacity: 0, borderWidth: '0px' }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ left: r.x, top: r.y, translateX: '-50%', translateY: '-50%' }}
          className="absolute rounded-full border border-[#ff5e00] bg-[#ff5e00]/10 shadow-[0_0_20px_#ff5e00]"
        />
      ))}
    </div>
  );
};

// --- COMPOSANTS DE CONTENU ---

const DecryptText = ({ text, className = "", start = true, speed = 30 }) => {
  const [display, setDisplay] = useState("");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!start) return;
    let iteration = 0;
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDisplay(
        text.split("").map((letter, index) => {
          if (index < iteration) return text[index];
          return chars[Math.floor(Math.random() * chars.length)];
        }).join("")
      );
      if (iteration >= text.length) clearInterval(intervalRef.current);
      iteration += 1 / 2;
    }, speed);
    return () => clearInterval(intervalRef.current);
  }, [text, start, speed]);

  return <span className={className}>{display}</span>;
};

const Reveal = ({ children, delay = 0, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-10%" }}
    transition={{ duration: 0.6, delay, ease: "easeOut" }}
    className={className}
  >
    {children}
  </motion.div>
);

// NOUVEAU COMPOSANT : ACCORDÉON DE PROFIL (TITRE ET CONTENU CORRIGÉS)
const ProfileAccordion = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    triggerHaptic(20);
    playSound('click');
    dispatchLog(isOpen ? "Profil replié." : "Affichage complet du profil.");
  };

  return (
    <div className="max-w-4xl">
      <div
        onClick={handleToggle}
        className={`
          flex justify-between items-center p-4 cursor-pointer rounded-lg transition-all duration-300
          ${isOpen ? 'bg-[#ff5e00]/10 border border-[#ff5e00] shadow-[0_0_10px_rgba(255,94,0,0.3)]' : 'bg-white/5 border border-white/20 hover:bg-white/10'}
        `}
      >
        <div className="flex flex-col text-left">
          <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-wider">
            Jean Aristide Yao
          </h3>
          <p className="text-sm md:text-base text-[#ff5e00] font-mono mt-1">
            Fondateur de Teknika
          </p>
        </div>

        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <ChevronDown size={30} className={isOpen ? "text-[#ff5e00]" : "text-white/70"} />
        </motion.div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="overflow-hidden pt-4"
          >
            <div className='text-gray-400 text-lg leading-relaxed space-y-4 p-4 border-l-2 border-[#0d47ff] ml-2 bg-black/50 rounded-br-lg'>

              <p>
                Je m'appelle <strong className='text-white'>Jean Aristide Yao</strong> et, à 26 ans, j'opère à la convergence de l'ingénierie <strong className='text-white'>Full-Stack</strong>, de l'<strong className='text-white'>Expertise IT stratégique</strong> et de l'<strong className='text-white'>Analyse de Données</strong>.
              </p>

              <p>
                Fort de <strong className='text-white'>6 années d'expérience</strong> dans le développement numérique, mon rôle n'est pas de coder, mais de <span className='text-white font-bold'>traduire la complexité en solutions digitales simples, robustes et immédiates</span> pour tout type de problème d'entreprise.
              </p>

              <p>
                Mon expertise s'est affûtée au sein de structures exigeantes et grâce à une pratique intense en freelance, me conférant une vision à 360 degrés sur l'intégralité du cycle de vie d'un projet.
              </p>

              <p>
                Je suis particulièrement investi dans les secteurs nécessitant une fiabilité maximale : la <strong className='text-white'>Fintech</strong> et la <strong className='text-white'>Cybersécurité</strong>. Mon engagement est de garantir non seulement la performance, mais surtout l'intégrité et la résilience de vos systèmes.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProjectFile = ({ title, type, context, stack, result }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    if (!isOpen) dispatchLog("Tu veux voir clair dedans ?");
    setIsOpen(!isOpen);
    triggerHaptic(20);
    playSound(isOpen ? 'click' : 'scan');
  };

  return (
    <div className="mb-8 relative pl-6 group">
      <div className={`absolute -left-[5px] top-6 w-2.5 h-2.5 rounded-full transition-all duration-500 z-10 ${isOpen ? 'bg-[#ff5e00] shadow-[0_0_15px_#ff5e00] scale-125' : 'bg-white/50 group-hover:bg-white'}`}></div>
      <div className="absolute left-0 top-0 bottom-0 w-px bg-white/20"></div>

      <div
        onClick={handleToggle}
        className={`
          relative overflow-hidden rounded-xl transition-all duration-300 cursor-pointer border-2
          ${isOpen ? 'bg-black/95 border-[#ff5e00] shadow-[0_0_30px_rgba(255,94,0,0.15)]' : 'bg-black/60 border-white/40 hover:border-white/80 hover:bg-black/80'}
        `}
      >
        <div className="p-5 flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide">{title}</h3>
            <p className="text-xs font-mono text-[#0d47ff] mt-1 tracking-widest uppercase">{type}</p>
          </div>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <ChevronDown size={24} className={isOpen ? "text-[#ff5e00]" : "text-white/70"} />
          </motion.div>
        </div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/10 bg-black/50"
            >
              <div className="p-5 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity size={12} className="text-red-500" />
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">/// CONTEXTE</p>
                  </div>
                  <p className="text-sm text-gray-300 font-mono leading-relaxed">
                    <DecryptText text={context} start={isOpen} speed={10} />
                  </p>
                </div>
                <div className="pl-4 border-l-2 border-[#ff5e00]">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu size={12} className="text-[#ff5e00]" />
                    <p className="text-[10px] text-[#ff5e00] font-mono uppercase tracking-widest">/// SOLUTION TEKNIKA</p>
                  </div>
                  <p className="text-sm text-white leading-relaxed font-medium">{result}</p>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {stack.map((tech, i) => (
                    <span key={i} className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 border border-white/10 text-gray-400">{tech}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- BOOT SEQUENCE (VERSION SCAN BIOMÉTRIQUE) ---
const BootSequence = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);
  const pressDuration = 1500;

  const startSystem = async () => {
    initAudio();
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        await DeviceOrientationEvent.requestPermission();
      } catch (e) {
        dispatchLog("Permission Gyroscope refusée.");
      }
    }

    setHasStarted(true);
    playSound('open');
    dispatchLog("ACCÈS AUTORISÉ. Démarrage de la séquence.");
  };

  const handleStartPress = () => {
    if (hasStarted || progress === 100) return;

    if (intervalRef.current) clearInterval(intervalRef.current);

    let startTime = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / pressDuration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        clearInterval(intervalRef.current);
        startSystem();
      }
    }, 50);

    triggerHaptic(20);
    dispatchLog("Vérification biométrique en cours...");
  };

  const handleEndPress = () => {
    if (hasStarted || progress === 100) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (progress < 100) {
      setProgress(0);
      triggerHaptic(5);
      dispatchLog("SCAN ÉCHOUÉ. Maintenir la pression.");
    }
  };

  useEffect(() => {
    if (!hasStarted) return;
    const run = async () => {
      await new Promise(r => setTimeout(r, 600));
      setStep(1); playSound('scan');
      await new Promise(r => setTimeout(r, 1500));
      setStep(2); playSound('scan');
      await new Promise(r => setTimeout(r, 1500));
      setStep(3); triggerHaptic(30);
      await new Promise(r => setTimeout(r, 1200));
      onComplete();
    };
    run();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hasStarted, onComplete]);

  if (!hasStarted) {
    return (
      <div
        className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center select-none"
        onMouseDown={handleStartPress}
        onMouseUp={handleEndPress}
        onTouchStart={handleStartPress}
        onTouchEnd={handleEndPress}
      >
        <Scanlines />
        <div className="absolute inset-0 bg-black/80"></div>
        <div className="relative z-10 flex flex-col items-center gap-4">

          <div className="w-28 h-28 rounded-full flex items-center justify-center relative select-none cursor-pointer">

            <Lock size={36} className={`relative z-20 transition-colors duration-300 ${progress === 100 ? 'text-green-400' : 'text-white/70'}`} />

            <div className={`absolute inset-0 rounded-full transition-all duration-300 ${progress === 100 ? 'border-2 border-green-500 shadow-[0_0_20px_rgba(0,255,0,0.5)] bg-black/50' : 'border-2 border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)] bg-black/60'}`}></div>

            <svg width="112" height="112" viewBox="0 0 112 112" className="absolute -m-1">
              <circle
                r="54" cx="56" cy="56"
                fill="none"
                stroke={progress === 100 ? "#10B981" : "#ff5e00"}
                strokeWidth="4"
                strokeDasharray={2 * Math.PI * 54}
                strokeDashoffset={2 * Math.PI * 54 * (1 - progress / 100)}
                strokeLinecap="round"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                className='transition-all duration-50'
              />
            </svg>
          </div>

          <motion.p
            key={progress === 100 ? 'success' : 'scan'}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`font-mono text-xs tracking-widest font-bold transition-colors`}
            style={{ color: progress === 100 ? '#4ADE80' : '#FF5E00' }}
          >
            {progress === 100 ? "ACCÈS AUTORISÉ" : (progress > 0 ? `SCANNING... ${Math.floor(progress)}%` : "SCANNER L'EMPREINTE")}
          </motion.p>
        </div>
      </div>
    );
  }

  // Loading sequence (text only)
  return (
    <motion.div
      className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center font-mono text-xs"
      exit={{ opacity: 0, transition: { duration: 1 } }}
    >
      <Scanlines />
      <div className="w-80 space-y-3 px-4 relative z-10">
        <DecryptText text={`> CHARGEMENT DU "GBAKA" NUMÉRIQUE...`} className="text-gray-500" />

        {step >= 1 && (
          <div className="text-[#0d47ff]">
            {`> ANALYSE DU PROFIL...`}
          </div>
        )}

        {step >= 2 && (
          <div className="text-[#ff5e00]">
            {`> C'EST CHARGÉ ON DÉCOLLE.`} <span className="animate-pulse">_</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// --- COMPOSANTS 3D GALAXIE TEKNIKA ---

const TECH_GROUPS = [
  { name: 'Front/Mobile', color: '#0d47ff', radius: 4, speed: 0.012, items: ['React', 'Vue.js', 'JavaScript', 'Flutter', 'Kotlin'] },
  { name: 'Back-end/Data', color: '#ff5e00', radius: 7, speed: 0.008, items: ['Node', 'Python', 'PHP', 'SQL', 'Pandas'] },
  { name: 'Infrastructure/Data', color: '#4ADE80', radius: 10, speed: 0.005, items: ['Firebase', 'Supabase', 'VBA'] },
];

const TechnologyObject = ({ position, color, name, setHoveredTech, coreRef }) => { // coreRef reçu ici
  const ref = useRef();
  const [hovered, setHover] = useState(false);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.01;
      ref.current.rotation.x += 0.005;
    }
  });

  const handlePointerOver = (e) => {
    e.stopPropagation();
    setHover(true);
    setHoveredTech(name);
    dispatchLog(`MODULE ${name} DÉTECTÉ`);
  }
  const handlePointerOut = () => {
    setHover(false);
    setHoveredTech(null);
  }

  return (
    <mesh
      ref={ref}
      position={position}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      scale={hovered ? 1.5 : 1}
    >
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshLambertMaterial
        color={color}
        emissive={color}
        emissiveIntensity={hovered ? 1.5 : 0.2}
      />
      {/* LABEL SOUS L'OBJET avec occlusion forcée */}
      <Html distanceFactor={8} occlude={[coreRef]}>
        <div className="text-[10px] text-white font-mono whitespace-nowrap" style={{ transform: 'translateY(15px)' }}>
          {name}
        </div>
      </Html>
    </mesh>
  );
};

const OrbitLayer = ({ radius, color, speed }) => {
  const points = useMemo(() => {
    const numSegments = 64;
    const pts = [];
    for (let i = 0; i <= numSegments; i++) {
      const angle = (i / numSegments) * Math.PI * 2;
      const x = radius * Math.cos(angle) * 1.2;
      const z = radius * Math.sin(angle) * 0.8;
      pts.push(new THREE.Vector3(x, 0, z));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);

  const ref = useRef();
  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += speed * 2;
    }
  });

  return (
    <line ref={ref} geometry={points}>
      <lineBasicMaterial color={color} linewidth={1} transparent opacity={0.3} />
    </line>
  );
};


const TechOrbits = ({ setHoveredTech }) => {
  const techItems = useMemo(() => {
    let items = [];
    TECH_GROUPS.forEach(group => {
      const count = group.items.length;
      group.items.forEach((name, index) => {
        const angle = (index / count) * Math.PI * 2;
        const x = group.radius * Math.cos(angle) * 1.2;
        const z = group.radius * Math.sin(angle) * 0.8;
        const y = (Math.random() - 0.5) * 1.5;

        items.push({
          key: name,
          position: [x, y, z],
          color: group.color,
          name: name
        });
      });
    });
    return items;
  }, []);

  const groupRef = useRef();
  const coreRef = useRef(); // Référence du Noyau créée ici

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005; // Base rotation pour la galaxie
    }
  });

  return (
    <group ref={groupRef}>
      {/* Le Noyau (CPU/Sun Sphere) - Référence attachée */}
      <mesh ref={coreRef} scale={2.5}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial
          color="#FBBF24"
          transparent={true}
          opacity={0.6}
          depthWrite={true} // Obligatoire pour que le Noyau enregistre sa profondeur
        />
      </mesh>

      {/* Orbit Lines (Cercles Visibles) */}
      {TECH_GROUPS.map(group => (
        <OrbitLayer key={group.name} radius={group.radius} color={group.color} speed={group.speed} />
      ))}

      {/* Orbiting Technologies - Passage de la référence du Noyau */}
      {techItems.map(item => (
        <TechnologyObject
          key={item.key}
          {...item}
          setHoveredTech={setHoveredTech}
          coreRef={coreRef} // Passage de la référence
        />
      ))}
    </group>
  );
};

const TechGalaxy = ({ gyro }) => {
  const [hoveredTech, setHoveredTech] = useState(null);

  return (
    <div className="h-[60vh] w-full max-h-[600px] my-10 relative bg-black/50 overflow-hidden">
      <Canvas
        dpr={[1, 2]}
        shadows={false}
        camera={{ position: [0, 0, 18], fov: 50 }}
        className="w-full h-full"
      >
        <Suspense fallback={null}>
          {/* Lighting de la Scène */}
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#ff5e00" />
          <pointLight position={[-10, -10, -10]} intensity={1} color="#0d47ff" />
          <ambientLight intensity={0.5} />

          {/* Main Galaxy Group : Inclinaison fixe, rotation automatique */}
          <group rotation={[THREE.MathUtils.degToRad(20), 0, 0]}>
            <TechOrbits setHoveredTech={setHoveredTech} />
          </group>
        </Suspense>
      </Canvas>
      {/* HTML Overlay for Title & Hover Label */}
      <div className="absolute top-0 left-0 right-0 p-4 font-mono text-sm pointer-events-none">
        <p className="text-[#0d47ff] mb-1">/// ARCHITECTURE TEKNIKA</p>
        <h3 className="text-xl font-bold text-white">LA GALAXIE TECHNIQUE</h3>
        <motion.p
          key={hoveredTech || 'null'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: hoveredTech ? 1 : 0, y: hoveredTech ? 0 : 10 }}
          transition={{ duration: 0.3 }}
          className="absolute top-20 left-4 text-3xl font-bold tracking-widest text-[#ff5e00] drop-shadow-[0_0_10px_rgba(255,94,0,0.5)]"
        >
          {hoveredTech}
        </motion.p>
      </div>
    </div>
  );
};


// --- APP PRINCIPALE ---
export default function App() {
  const [booted, setBooted] = useState(false);
  const [gyro, setGyro] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Suppression des écouteurs de souris et gyro pour la stabilité maximale.
  }, []);

  return (
    <div className="min-h-screen bg-black text-gray-200 font-sans selection:bg-[#ff5e00] selection:text-white overflow-x-hidden cursor-crosshair">

      {/* MODULES TACTIQUES (SANS HUD) */}
      <Scanlines />
      {booted && <SystemLogs />}
      {booted && <ClickRipple />}

      <AnimatePresence>
        {!booted && <BootSequence onComplete={() => setBooted(true)} />}
      </AnimatePresence>

      {/* CORRECTION DU BACKGROUND ICI */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <motion.div
          className="absolute inset-[-50px] bg-cover bg-center opacity-60"
          style={{
            backgroundImage: 'url(/bg1.png)',
            filter: 'grayscale(100%) contrast(120%)',
          }}
        />
        <div className="absolute inset-0 bg-black/70 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>
        <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none"></div>
      </div>
      {/* FIN CORRECTION DU BACKGROUND */}

      {booted && (
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="relative z-10"
        >
          <header className="fixed top-0 w-full p-6 flex justify-between items-center z-40 bg-black/80 backdrop-blur-md border-b border-white/5">
            <div className="font-bold tracking-[0.2em] text-sm">
              <span className="text-white">TEK</span><span className="text-[#ff5e00]">NIKA</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#00ff00]"></div>
              <span className="text-[9px] font-mono text-white/50 hidden md:block">SYSTEM_ONLINE</span>
            </div>
          </header>

          <section className="min-h-screen flex flex-col justify-center px-6 pt-20">
            <motion.div className="max-w-2xl">
              <h1 className="text-5xl md:text-8xl font-bold tracking-tighter leading-[0.9] mb-8">
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">SOLUTIONS</span>
                <span className="block text-[#ff5e00] drop-shadow-[0_0_20px_rgba(255,94,0,0.4)]">DIGITALES</span>
                <span className="block text-[#0d47ff]">SUR MESURE.</span>
              </h1>
              <div className="h-px w-24 bg-gradient-to-r from-[#ff5e00] to-transparent mb-8"></div>
              <p className="text-lg md:text-xl text-gray-400 font-light max-w-md border-l-2 border-[#0d47ff] pl-6">
                On ne vend pas du code.
                <br />
                <span className="text-white font-medium mt-2 block">On vend des solutions aux problèmes de vos entreprises.</span>
              </p>
              <p className="text-sm font-mono text-[#ff5e00] mt-6 animate-pulse"># Vos défis, nos solutions. Simplement.</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 2, duration: 1 }}
              className="absolute bottom-12 left-6 text-[10px] font-mono text-gray-500 animate-bounce"
            >
              SCROLL_POUR_VOIR_LE_PROGRAMME ↓
            </motion.div>
          </section>

          {/* ======================================= */}
          {/* NOUVELLE SECTION : PROFIL TECHNIQUE (ABOUT) */}
          {/* ======================================= */}
          <section className='sm:px-16 px-6 sm:py-16 py-10 max-w-7xl mx-auto relative z-0'>
            <Reveal>
              <span className='text-xs text-[#0d47ff] font-mono mb-2'>
                /// PROFIL TEKNIKA
              </span>
            </Reveal>

            {/* Le composant Accordéon gère le titre et le contenu dépliable */}
            <ProfileAccordion />
          </section>

          <hr className="border-t border-white/5 max-w-7xl mx-auto" />

          <section className="py-24 px-6 bg-gradient-to-b from-transparent via-black/90 to-black backdrop-blur-sm">
            <Reveal>
              <h2 className="text-2xl font-bold mb-12 flex items-center gap-3">
                <Terminal className="text-[#ff5e00]" />
                <span className="text-white">NOS SERVICES</span>
              </h2>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  icon: Smartphone, color: "text-[#0d47ff]",
                  title: "Développement Mobile",
                  desc: <span>React & Flutter. Votre business accessible partout. C'est votre meilleur atout pour toucher vos clients.</span>,
                  sub: "WEB • MOBILE • API"
                },
                {
                  icon: Database, color: "text-[#ff5e00]",
                  title: "Gestion & Conformité",
                  desc: <span>Fini le désordre. Oublie les papiers qui se perdent et les <span className="text-[#ff5e00] font-bold">palabres</span>. On facilite vos audits.</span>,
                  sub: "DATA • ANALYTICS • PROCESS"
                },
                {
                  icon: Server, color: "text-green-500",
                  title: "Infra & Maintenance",
                  desc: <span>Ne te mets pas dans <span className="text-[#ff5e00] font-bold">pain</span>. Si ton système plante, on est là pour remettre de l'ordre direct.</span>,
                  sub: "RESEAU • HARDWARE • SUPPORT"
                }
              ].map((s, i) => (
                <Reveal key={i} delay={i * 0.1} className="bg-[#050505] border border-white/5 p-6 rounded-xl hover:border-white/20 transition-colors group">
                  <s.icon size={32} className={`${s.color} mb-4 group-hover:scale-110 transition-transform`} />
                  <h3 className="text-xl font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed mb-4">{s.desc}</p>
                  <p className="text-[10px] font-mono text-gray-600 tracking-widest">{s.sub}</p>
                </Reveal>
              ))}
            </div>
          </section>

          <section className="py-24 px-6 bg-black relative">
            <Reveal className="mb-16">
              <p className="text-xs text-[#0d47ff] font-mono mb-2">/// ACCÈS AUX DOSSIERS</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white">Ce qu'on a déjà géré</h2>
            </Reveal>

            <div className="max-w-3xl">
              <div className="absolute left-[27px] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-800 to-transparent"></div>

              <Reveal delay={0.1}>
                <ProjectFile
                  title="HOREB GESTION"
                  type="OUTIL INTERNE"
                  context="Suivi des clients à la main = Pertes d'argent. On risquait de taper poteau à chaque inventaire."
                  result="Plateforme de gestion complète. On sait où est chaque franc et chaque vis du stock."
                  stack={['Web App', 'Gestion Stock', 'Comptabilité']}
                />
              </Reveal>

              <Reveal delay={0.2}>
                <ProjectFile
                  title="SOCATRA"
                  type="TRANSFORMATION"
                  context="Gestion 100% papier & WhatsApp. Rapports souvent erronés. Difficile d'avoir une vue d'ensemble fiable."
                  result="Application Propre. Suivi GPS. Compta carrée. Données centralisées prêtes pour l'audit."
                  stack={['React', 'Mobile', 'Data', 'Audit']}
                />
              </Reveal>

              <Reveal delay={0.3}>
                <ProjectFile
                  title="ECAM (COOP CA)"
                  type="INFRA & STOCKAGE"
                  context="Problèmes de maintenance Ordinateurs/Serveurs. Besoin de licences valides et d'un serveur de stockage hiérarchisé."
                  result="Maintenance complète effectuée. Déploiement licences Office (30 postes). Serveur de stockage restructuré."
                  stack={['Windows Server', 'Stockage', 'Licences']}
                />
              </Reveal>

              <Reveal delay={0.4}>
                <ProjectFile
                  title="ODA.IO"
                  type="MARKETING"
                  context="Gérer des milliers de 'Likes' sans devenir fou. Il fallait payer les gens rapidement sans faille."
                  result="Machine de guerre web. Tout est automatisé. Les utilisateurs s'enjaillent, le client est content."
                  stack={['PHP', 'Bootstrap', 'Social API']}
                />
              </Reveal>

              <Reveal delay={0.5}>
                <ProjectFile
                  title="APREMAR"
                  type="AGENCE MARITIME"
                  context="Une panne ici et c'est des millions perdus. Pas le droit à l'erreur."
                  result="Surveillance H24. Quand les employés arrivent, tout marche. Zéro Ramba."
                  stack={['Support IT', 'Réseau', 'Maintenance']}
                />
              </Reveal>
            </div>
          </section>

          {/* NOUVELLE SECTION 3D : GALAXIE TEKNIKA */}
          <section className="py-24 px-6 bg-black">
            <Reveal>
              {/* Passe l'état gyro, même s'il est fixe, pour la structure */}
              <TechGalaxy gyro={gyro} />
            </Reveal>
          </section>
          {/* FIN NOUVELLE SECTION 3D */}

          <section className="py-32 px-6 text-center bg-[#050505] border-t border-white/5">
            <Reveal>
              <p className="text-2xl md:text-4xl font-light italic text-gray-300 mb-6">
                "La perfection est dans les détails."
              </p>
              <div className="w-10 h-1 bg-[#ff5e00] mx-auto rounded-full"></div>
            </Reveal>
          </section>

          <section className="py-24 px-6 bg-black pb-40">
            <Reveal className="max-w-xl mx-auto bg-[#0a0a0a] border border-[#25D366]/20 p-8 rounded-2xl relative overflow-hidden text-center">
              <div className="absolute inset-0 bg-[#25D366]/5 animate-pulse"></div>
              <Lock size={24} className="mx-auto text-[#25D366] mb-4" />
              <h2 className="text-3xl font-bold text-white mb-2">On commence quand ?</h2>
              <p className="text-gray-400 mb-8">Ne tournez pas en rond. Ayez un programme.</p>
              <motion.a
                href="https://wa.me/2250747640441?text=Bonjour%20TekNika,%20on%20peut%20parler%20affaire%20?"
                target="_blank"
                rel="noopener noreferrer"
                whileTap={{ scale: 0.95 }}
                onClick={() => dispatchLog("Tu veux voir clair dedans ?")}
                className="w-full py-4 bg-[#25D366] hover:bg-[#1ebc57] text-black font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(37,211,102,0.3)] transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                Écrire sur WhatsApp
              </motion.a>
              <div className="mt-8 text-sm text-gray-500 font-mono space-y-2">
                <p className="whitespace-nowrap">Contact: +225 07 47 64 04 41</p>
                <p>Mail: Yjeanaristide@gmail.com</p>
              </div>
            </Reveal>
          </section>

          <footer className="fixed bottom-0 w-full bg-black/90 backdrop-blur text-center py-4 border-t border-white/5 z-40">
            <p className="text-[10px] text-gray-600 font-mono">TEKNIKA OS v2.5 // ABIDJAN</p>
          </footer>
        </motion.main>
      )}
    </div>
  );
}