"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValue,
  useDragControls,
} from "framer-motion";
import {
  ShoppingCart,
  Menu,
  X,
  Plus,
  Minus,
  Trash2,
  MapPin,
  Flame,
  Leaf,
  Droplets,
  Truck,
  CreditCard,
  MessageCircle,
  Check,
  ChevronUp,
  Package,
  Sparkles,
  Loader2,
  BadgeCheck,
  PartyPopper,
  ArrowDown,
  CircleDot,
  CircleCheck,
  Circle,
  Zap,
  Crown,
  TrendingUp,
  Sun,
  Moon,
  CheckCircle2,
} from "lucide-react";
import {
  useCartStore,
  type DeliveryMode,
  type ShippingRate,
} from "@/lib/store";
import { useSettingsStore } from "@/lib/settings-store";
import {
  PRODUCTS,
  FLAVORS,
  STANGER_ADDRESSES,
  SA_CITIES,
  IKHOKHA_PAYMENT_URL,
  WHATSAPP_NUMBER,
  generateOrderId,
  buildWhatsAppMessage,
  type OrderData,
} from "@/lib/supabase";
import { toast } from "sonner";

// ============================================
// ANIMATION VARIANTS
// ============================================
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cartItemVariants = {
  enter: { opacity: 0, x: 60, scale: 0.95 },
  center: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -80, scale: 0.9, transition: { duration: 0.25 } },
};

// ============================================
// SECTION DIVIDER
// ============================================
function SectionDivider() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8 }}
      className="relative w-full h-12 md:h-16 flex items-center justify-center z-20 -my-2"
    >
      <svg
        viewBox="0 0 1200 60"
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M0,30 Q150,0 300,30 T600,30 T900,30 T1200,30"
          fill="none"
          stroke="#E5B83C"
          strokeWidth="1.5"
          strokeOpacity="0.2"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
        <motion.path
          d="M0,35 Q150,55 300,35 T600,35 T900,35 T1200,35"
          fill="none"
          stroke="#E5B83C"
          strokeWidth="1"
          strokeOpacity="0.1"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: "easeInOut", delay: 0.2 }}
        />
      </svg>
    </motion.div>
  );
}

// ============================================
// STICKY ORDER BAR (Mobile only)
// ============================================
function StickyOrderBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > window.innerHeight * 0.7);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.a
          href="#products"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="md:hidden fixed bottom-[72px] left-0 right-0 z-[50] bg-[#0A0301]/95 backdrop-blur-md border-t border-[#E5B83C]/30 py-2.5 px-4 flex items-center justify-center gap-2 no-underline"
        >
          <Zap className="w-3.5 h-3.5 text-[#E5B83C]" />
          <span className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-[#E5B83C]">
            VIEW MENU · ORDER NOW
          </span>
        </motion.a>
      )}
    </AnimatePresence>
  );
}

// ============================================
// FLY-TO-CART ANIMATION
// ============================================
function FlyToCart({ from, to, onComplete }: { from: DOMRect; to: DOMRect; onComplete: () => void }) {
  const startX = from.left + from.width / 2;
  const startY = from.top + from.height / 2;
  const endX = to.left + to.width / 2;
  const endY = to.top + to.height / 2;

  return (
    <motion.div
      initial={{ x: startX - 14, y: startY - 14, scale: 1, opacity: 1 }}
      animate={{ x: endX - 14, y: endY - 14, scale: 0.4, opacity: 0.6 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      onAnimationComplete={onComplete}
      className="fixed z-[9998] w-7 h-7 rounded-full bg-[#E5B83C] flex items-center justify-center text-xs pointer-events-none"
    >
      🥩
    </motion.div>
  );
}

// ============================================
// CONFETTI PARTICLE SYSTEM
// ============================================
function Confetti({ confettiKey }: { confettiKey: number }) {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; color: string; size: number; rotation: number }[]
  >([]);

  useEffect(() => {
    if (confettiKey === 0) return;
    const colors = ["#E5B83C", "#E07A2C", "#25D366", "#B23A1A", "#F8E5B0", "#2E7D32"];
    const newParticles = Array.from({ length: 25 }, (_, i) => ({
      id: Date.now() + i,
      x: 30 + Math.random() * 40,
      y: 50 + Math.random() * 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
    }));
    setParticles(newParticles);
    const timer = setTimeout(() => setParticles([]), 1500);
    return () => clearTimeout(timer);
  }, [confettiKey]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ x: `${p.x}vw`, y: `${p.y}vh`, rotate: p.rotation, opacity: 1 }}
            animate={{ y: "110vh", rotate: p.rotation + 720, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 + Math.random() * 0.5, ease: "easeIn" }}
            className="absolute rounded-sm"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// SMOKE CANVAS
// ============================================
function SmokeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    let animationId: number;

    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 40 + Math.random() * 80,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -(Math.random() * 0.4 + 0.08),
    }));

    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -120) p.y = h + 60;
        if (p.x < -120) p.x = w + 60;
        if (p.x > w + 120) p.x = -120;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        grad.addColorStop(0, "rgba(210,90,30,0.035)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      animationId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1] opacity-60" />;
}

// ============================================
// NAVBAR
// ============================================
function Navbar({ onCartOpen, cartRef }: { onCartOpen: () => void; cartRef: React.RefObject<HTMLButtonElement | null> }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const totalItems = useCartStore((s) => s.totalItems());
  const [isLight, setIsLight] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("bb-theme") === "light";
    }
    return false;
  });

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (isLight) {
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  const toggleTheme = () => {
    const next = !isLight;
    setIsLight(next);
    document.documentElement.setAttribute("data-theme", next ? "light" : "dark");
    localStorage.setItem("bb-theme", next ? "light" : "dark");
  };

  const navLinks = [
    { href: "#products", label: "MENU", icon: Package },
    { href: "#story", label: "STORY", icon: Flame },
    { href: "#how-to-order", label: "ORDER", icon: CreditCard },
    { href: "#contact", label: "CONTACT", icon: MessageCircle },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-[500] flex justify-between items-center transition-all duration-400 ${
          scrolled
            ? "py-3 px-4 bg-[#0A0301]/95 backdrop-blur-xl border-b border-[#E5B83C]/20 shadow-lg shadow-black/30"
            : "py-4 px-4 md:px-[6%]"
        }`}
      >
        <a href="#" className="font-['Bebas_Neue'] text-xl md:text-[1.8rem] tracking-[0.2em] text-[#E5B83C] no-underline flex items-center gap-2">
          <span className="text-lg">🥩</span>
          BILTONG<span className="text-[#E07A2C]">&amp;</span>BYTES
        </a>

        <ul className="hidden md:flex gap-10 list-none">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-[0.7rem] font-semibold tracking-[0.25em] uppercase text-[#FEF3DF]/60 no-underline transition-colors hover:text-[#E5B83C]">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="border border-[#E5B83C]/30 text-[#E5B83C] p-2 cursor-pointer rounded-xl transition-all hover:bg-[#E5B83C]/10 hover:border-[#E5B83C]/60"
            aria-label="Toggle theme"
          >
            <AnimatePresence mode="wait">
              {isLight ? (
                <motion.div key="moon" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Moon className="w-4 h-4" />
                </motion.div>
              ) : (
                <motion.div key="sun" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Sun className="w-4 h-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            ref={cartRef}
            onClick={onCartOpen}
            id="cart-button"
            className="relative border border-[#E5B83C]/40 text-[#E5B83C] px-3 py-2 md:px-4 font-bold text-[0.7rem] tracking-[0.15em] cursor-pointer transition-all hover:bg-[#E5B83C]/10 hover:border-[#E5B83C] rounded-xl flex items-center gap-1.5"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden md:inline">CART</span>
            <AnimatePresence mode="wait">
              {totalItems > 0 && (
                <motion.span
                  key={totalItems}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-2 -right-2 bg-[#B23A1A] text-white w-5 h-5 rounded-full text-[0.6rem] flex items-center justify-center font-bold"
                >
                  {totalItems}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMobileOpen(true)}
            className="md:hidden border border-[#E5B83C]/40 text-[#E5B83C] p-2 cursor-pointer rounded-xl"
          >
            <Menu className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.nav>

      {/* Mobile Nav Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-[599] backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <motion.div
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 left-0 w-[80%] max-w-[300px] h-full bg-[#0A0301]/98 backdrop-blur-xl z-[600] p-8 pt-20"
            >
              <button onClick={() => setMobileOpen(false)} className="absolute top-5 right-5 text-[#E5B83C] cursor-pointer">
                <X className="w-7 h-7" />
              </button>
              <ul className="flex flex-col gap-6 list-none">
                {navLinks.map((link, i) => (
                  <motion.li key={link.href} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}>
                    <a href={link.href} onClick={() => setMobileOpen(false)}
                      className="text-[#FEF3DF] no-underline text-lg tracking-[0.1em] font-semibold flex items-center gap-3">
                      <link.icon className="w-5 h-5 text-[#E5B83C]" />
                      {link.label}
                    </a>
                  </motion.li>
                ))}
              </ul>
              <div className="mt-10 space-y-3">
                <div className="p-3 bg-[#2E7D32]/15 rounded-xl border border-[#2E7D32]/30">
                  <p className="text-[#2E7D32] text-xs font-semibold flex items-center gap-2">
                    <Leaf className="w-3.5 h-3.5" /> 100% Halaal Certified
                  </p>
                </div>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
                  className="bg-[#25D366] text-white px-4 py-3 text-xs font-bold tracking-[0.1em] uppercase no-underline inline-flex items-center gap-2 rounded-xl w-full justify-center">
                  <MessageCircle className="w-4 h-4" /> WhatsApp Us
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================
// HERO SECTION
// ============================================
function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.3]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.5], [0.2, 0.05]);
  const contentY = useTransform(scrollYProgress, [0, 0.5], [0, -60]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <motion.div style={{ scale: bgScale, opacity: bgOpacity }} className="absolute inset-0 z-[-2]">
        <div className="w-full h-full bg-cover bg-center" style={{
          backgroundImage: "url('/images/hero-bg.jpeg')",
          filter: "saturate(0.8)",
        }} />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0301]/60 via-transparent to-[#0A0301] z-[-1]" />

      <motion.div style={{ y: contentY }} className="z-20 max-w-[900px] px-5 text-center">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}
          className="text-[0.55rem] md:text-[0.65rem] tracking-[0.5em] uppercase text-[#F8E5B0] border border-[#E5B83C]/40 inline-block px-4 py-2.5 rounded-full mb-6 backdrop-blur-md">
          ✦ HALAAL · HAND-CURED · STANGER ✦
        </motion.div>

        <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={0.2}
          className="font-['Cormorant_Garamond'] text-[3.2rem] md:text-[7rem] lg:text-[10rem] font-light leading-[0.85]">
          Biltong <span className="bg-gradient-to-br from-[#F8E5B0] to-[#E5B83C] bg-clip-text text-transparent">&amp; Bytes</span>
        </motion.h1>

        <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={0.4}
          className="text-[0.7rem] md:text-[0.9rem] tracking-[0.15em] uppercase mt-4 md:mt-6 text-[#FEF3DF]/80">
          Premium Wet Biltong · Remote Tech Support · KZN
        </motion.p>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0.6}
          className="mt-6 md:mt-8 flex gap-3 justify-center flex-wrap">
          <motion.a href="#products" whileTap={{ scale: 0.95 }}
            className="bg-[#25D366] text-white px-5 py-3.5 md:px-8 text-[0.7rem] font-bold tracking-[0.2em] uppercase no-underline rounded-xl flex items-center gap-2 shadow-[0_4px_20px_rgba(37,211,102,0.3)]">
            <Zap className="w-4 h-4" /> ORDER NOW
          </motion.a>
          <a href="#story"
            className="border border-[#E5B83C]/60 text-[#E5B83C] px-5 py-3.5 md:px-8 text-[0.7rem] font-bold tracking-[0.2em] uppercase no-underline transition-all hover:bg-[#E5B83C]/10 rounded-xl">
            OUR STORY
          </a>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="mt-12 md:mt-16">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
            className="text-[#E5B83C]/40 text-xs tracking-[0.3em] uppercase flex flex-col items-center">
            <ArrowDown className="w-5 h-5" />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

// ============================================
// PHOTO STRIP (horizontal scroll on mobile)
// ============================================
function PhotoStrip() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const images = [
    { src: "/images/hero-bg.jpeg", alt: "Biltong" },
    { src: "/images/biltong-hanging-2.jpeg", alt: "Hanging" },
    { src: "/images/biltong-sliced-2.jpeg", alt: "Sliced" },
    { src: "/images/snack-pack-150g.jpeg", alt: "Chilli" },
  ];

  return (
    <>
      {/* Desktop grid */}
      <div className="hidden md:grid grid-cols-4 h-[45vh] relative z-10">
        {images.map((img, i) => (
          <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            transition={{ delay: i * 0.1 }} className="overflow-hidden">
            <motion.img whileHover={{ scale: 1.08 }} transition={{ duration: 0.6 }}
              src={img.src} alt={img.alt}
              className="w-full h-full object-cover brightness-[0.55] hover:brightness-[0.75] transition-all" />
          </motion.div>
        ))}
      </div>
      {/* Mobile horizontal scroll */}
      <div ref={scrollRef} className="md:hidden flex overflow-x-auto snap-x snap-mandatory gap-2 px-4 py-3 relative z-10 scrollbar-hide"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
        {images.map((img, i) => (
          <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            className="flex-shrink-0 w-[75vw] snap-center overflow-hidden rounded-2xl">
            <img src={img.src} alt={img.alt} className="w-full h-48 object-cover brightness-[0.65] rounded-2xl" />
          </motion.div>
        ))}
      </div>
    </>
  );
}

// ============================================
// FLAVOR ICON HELPER
// ============================================
function FlavorIcon({ flavor }: { flavor: string }) {
  switch (flavor) {
    case "Chilli": return <Flame className="w-3.5 h-3.5" />;
    case "Hot Honey Glazed": return <Droplets className="w-3.5 h-3.5" />;
    default: return <Leaf className="w-3.5 h-3.5" />;
  }
}

// ============================================
// PRODUCT CARD — Exciting mobile version
// ============================================
function ProductCard({ product, index, onAdd, cardRef }: { product: (typeof PRODUCTS)[0]; index: number; onAdd?: () => void; cardRef?: React.RefObject<HTMLDivElement | null> }) {
  const [selectedFlavor, setSelectedFlavor] = useState(FLAVORS[0]);
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const getPrice = useSettingsStore((s) => s.getPrice);

  const currentPrice = getPrice(product.id, product.price);

  const isPopular = product.id === 2; // Family Batch is the most popular
  const isBestValue = product.id === 3; // 1kg is best value per gram
  const pricePerGram = (currentPrice / product.grams).toFixed(2);

  const handleAdd = () => {
    addItem({
      name: `${product.name} ${product.weight}`,
      weight: product.weight,
      flavor: selectedFlavor,
      price: currentPrice,
      qty,
      img: product.img,
    });
    setJustAdded(true);
    toast.success(`${qty}x ${product.name} (${selectedFlavor}) added!`, { icon: "🥩", duration: 2000 });
    onAdd?.();
    setTimeout(() => setJustAdded(false), 1200);
    setQty(1);
  };

  return (
    <motion.div
      ref={cardRef}
      variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }}
      custom={index * 0.1}
      className="bg-gradient-to-br from-[#140A04]/90 to-[#0C0502]/95 backdrop-blur-sm p-4 md:p-6 text-center rounded-2xl border border-[#E5B83C]/15 hover:border-[#E5B83C]/60 transition-all relative overflow-hidden group hover:shadow-[0_0_30px_rgba(229,184,60,0.15),0_0_60px_rgba(229,184,60,0.05)]"
    >
      {/* Badges */}
      {/* Inner radial gradient glow on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: "radial-gradient(circle at 50% 50%, rgba(229,184,60,0.08) 0%, transparent 70%)" }} />
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        {isPopular && (
          <span className="bg-[#E07A2C] text-white text-[0.55rem] px-2.5 py-1 rounded-full font-bold tracking-wider uppercase flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> POPULAR
          </span>
        )}
        {isBestValue && (
          <span className="bg-[#2E7D32] text-white text-[0.55rem] px-2.5 py-1 rounded-full font-bold tracking-wider uppercase flex items-center gap-1">
            <Crown className="w-3 h-3" /> BEST VALUE
          </span>
        )}
      </div>

      {/* Image */}
      <div className="relative overflow-hidden rounded-xl mb-3">
        <motion.img whileHover={{ scale: 1.05 }} transition={{ duration: 0.4 }}
          src={product.img} alt={product.name}
          className="w-full h-40 md:h-52 object-cover brightness-[0.75] rounded-xl" />
        <div className="absolute top-3 right-3 bg-[#0A0301]/80 backdrop-blur-md text-[#E5B83C] px-3 py-1 rounded-full text-xs font-bold tracking-wider">
          {product.weight}
        </div>
        <div className="absolute bottom-3 left-3 bg-[#0A0301]/70 backdrop-blur-md text-[#FEF3DF]/60 px-2 py-0.5 rounded-full text-[0.6rem]">
          R{pricePerGram}/g
        </div>
      </div>

      <h3 className="font-['Cormorant_Garamond'] text-lg md:text-2xl font-bold text-[#FEF3DF]">
        {product.name}
      </h3>
      <p className="text-[0.65rem] md:text-xs text-[#FEF3DF]/50 mt-0.5">{product.description}</p>

      <div className="font-['Bebas_Neue'] text-3xl md:text-4xl text-[#F8E5B0] mt-1.5">R{currentPrice}</div>

      {/* Flavor Selector */}
      <div className="flex justify-center gap-1.5 mt-3 flex-wrap">
        {FLAVORS.map((f) => (
          <motion.button key={f} whileTap={{ scale: 0.9 }}
            onClick={() => setSelectedFlavor(f)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-[0.65rem] rounded-full cursor-pointer transition-all ${
              selectedFlavor === f
                ? "bg-[#E5B83C] text-[#0A0301] border border-[#E5B83C] font-bold"
                : "bg-white/5 border border-white/10 text-[#FEF3DF]/70 hover:border-[#E5B83C]/40"
            }`}>
            <FlavorIcon flavor={f} /> {f}
          </motion.button>
        ))}
      </div>

      {/* Quantity */}
      <div className="flex items-center justify-center gap-4 mt-3">
        <motion.button whileTap={{ scale: 0.8 }}
          onClick={() => setQty(Math.max(1, qty - 1))}
          className="bg-white/8 w-9 h-9 rounded-full flex items-center justify-center text-[#FEF3DF] cursor-pointer hover:bg-[#E5B83C] hover:text-black transition-colors">
          <Minus className="w-4 h-4" />
        </motion.button>
        <motion.span key={qty} initial={{ scale: 1.3 }} animate={{ scale: 1 }}
          className="font-['Bebas_Neue'] text-2xl min-w-[40px] text-center">{qty}</motion.span>
        <motion.button whileTap={{ scale: 0.8 }}
          onClick={() => setQty(qty + 1)}
          className="bg-white/8 w-9 h-9 rounded-full flex items-center justify-center text-[#FEF3DF] cursor-pointer hover:bg-[#E5B83C] hover:text-black transition-colors">
          <Plus className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Add to Cart */}
      <motion.button whileTap={{ scale: 0.95 }} onClick={handleAdd}
        className={`w-full mt-3 py-3 font-bold tracking-[0.1em] uppercase cursor-pointer transition-all rounded-full text-sm ${
          justAdded
            ? "bg-[#2E7D32] text-white border border-[#2E7D32]"
            : "bg-transparent border border-[#E5B83C]/50 text-[#E5B83C] hover:bg-[#E5B83C] hover:text-[#0A0301]"
        }`}>
        {justAdded ? (
          <span className="flex items-center justify-center gap-2"><Check className="w-4 h-4" /> ADDED!</span>
        ) : (
          <span className="flex items-center justify-center gap-2"><ShoppingCart className="w-4 h-4" /> ADD TO CART</span>
        )}
      </motion.button>
    </motion.div>
  );
}

// ============================================
// PRODUCTS SECTION
// ============================================
function ProductsSection({ onItemAdd, productRefs }: { onItemAdd?: () => void; productRefs?: React.RefObject<(HTMLDivElement | null)[]> }) {
  return (
    <section id="products" className="py-16 md:py-24 px-4 md:px-[6%] relative z-20">
      <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center">
        <p className="text-[0.6rem] tracking-[0.4em] uppercase text-[#E07A2C] mb-3">THE MENU</p>
        <h2 className="font-['Cormorant_Garamond'] text-[2.5rem] md:text-[4.5rem] font-light leading-tight mb-6">
          Choose your <em className="italic text-[#E5B83C] font-semibold">Biltong</em>
        </h2>
      </motion.div>

      <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 max-w-[1400px] mx-auto">
        {PRODUCTS.map((prod, i) => (
          <ProductCard key={prod.id} product={prod} index={i} onAdd={onItemAdd} cardRef={productRefs ? { current: productRefs.current?.[i] ?? null } as React.RefObject<HTMLDivElement | null> : undefined} />
        ))}
      </motion.div>
    </section>
  );
}

// ============================================
// STORY SECTION
// ============================================
function StorySection() {
  return (
    <section id="story" className="py-16 md:py-24 px-4 md:px-[6%] relative z-20">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <p className="text-[0.6rem] tracking-[0.4em] uppercase text-[#E07A2C] mb-3">OUR ROOTS</p>
          <h2 className="font-['Cormorant_Garamond'] text-[2.5rem] md:text-[4.5rem] font-light leading-tight mb-6">
            Handmade <em className="italic text-[#E5B83C] font-semibold">Halaal</em> with soul
          </h2>
          <p className="leading-relaxed text-[#FEF3DF]/85 text-sm md:text-base">
            We are a Muslim family in Stanger, hand-cutting premium beef from Halaal certified butcheries.
            Our wet biltong is famous — spiced traditionally, always fresh, made with love. Every strip is
            carefully prepared, hung, and cured to perfection using time-honoured recipes passed down through
            generations. From our family to yours.
          </p>
          <div className="bg-[#2E7D32]/15 border-l-4 border-[#2E7D32] p-4 mt-6 rounded-r-lg">
            <p className="text-[#2E7D32] font-semibold flex items-center gap-2 text-sm">
              <BadgeCheck className="w-4 h-4 flex-shrink-0" /> 100% Halaal Certified · Every single batch
            </p>
          </div>
          <div className="mt-4 flex gap-3 flex-wrap">
            {FLAVORS.map((f) => (
              <span key={f} className="bg-[#E5B83C]/10 border border-[#E5B83C]/25 text-[#E5B83C] px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
                <FlavorIcon flavor={f} /> {f}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="bg-gradient-to-br from-[#160A03]/90 to-[#080301]/95 p-5 md:p-8 rounded-2xl border border-[#E5B83C]/25">
          <img src="/images/our-story.png"
            alt="Fresh Biltong" className="w-full rounded-xl" />
          <h3 className="text-[#E5B83C] mt-4 font-['Cormorant_Garamond'] text-2xl font-bold">Wet, Tender &amp; Aromatic</h3>
          <p className="text-sm text-[#FEF3DF]/60 mt-1">Traditional · Chilli · Hot Honey Glazed</p>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================
// HOW TO ORDER SECTION
// ============================================
function HowToOrderSection() {
  const deliveryFee = useSettingsStore((s) => s.deliveryFee);
  const steps = [
    { icon: Package, title: "Pick your Biltong", desc: "Choose size & flavor", num: "1" },
    { icon: ShoppingCart, title: "Add to Cart", desc: "Adjust quantity & mix", num: "2" },
    { icon: CreditCard, title: "Pay with iKhokha", desc: "Secure online payment", num: "3" },
    { icon: Truck, title: "Collect or Delivery", desc: `R${deliveryFee} Stanger · Nationwide courier`, num: "4" },
  ];

  return (
    <section id="how-to-order" className="py-16 md:py-24 px-4 md:px-[6%] relative z-20">
      <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10">
        <p className="text-[0.6rem] tracking-[0.4em] uppercase text-[#E07A2C] mb-3">HOW IT WORKS</p>
        <h2 className="font-['Cormorant_Garamond'] text-[2.5rem] md:text-[4.5rem] font-light leading-tight">
          Simple <em className="italic text-[#E5B83C] font-semibold">4-Step</em> Ordering
        </h2>
      </motion.div>

      {/* Mobile: horizontal scroll, Desktop: grid */}
      <div className="flex md:grid md:grid-cols-4 gap-3 md:gap-6 max-w-[1100px] mx-auto overflow-x-auto snap-x snap-mandatory pb-2 md:overflow-visible"
        style={{ scrollbarWidth: "none" }}>
        {steps.map((step, i) => (
          <motion.div key={step.num} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            custom={i} whileHover={{ y: -5 }}
            className="text-center p-5 rounded-2xl bg-[#0E0500]/50 border border-[#E5B83C]/10 hover:border-[#E5B83C]/30 transition-all flex-shrink-0 w-[70vw] md:w-auto snap-center">
            <motion.div whileHover={{ scale: 1.1 }}
              className="w-14 h-14 md:w-[70px] md:h-[70px] bg-[#E5B83C]/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-[#E5B83C]/30">
              <step.icon className="w-6 h-6 text-[#E5B83C]" />
            </motion.div>
            <div className="text-[#E5B83C]/40 font-['Bebas_Neue'] text-3xl -mt-1 mb-1">{step.num}</div>
            <h4 className="text-sm md:text-base font-bold text-[#FEF3DF]">{step.title}</h4>
            <p className="text-xs text-[#FEF3DF]/50 mt-1">{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ============================================
// CONTACT SECTION
// ============================================
function ContactSection() {
  return (
    <section id="contact" className="py-16 md:py-24 px-4 md:px-[6%] relative z-20">
      <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
        className="text-center max-w-[550px] mx-auto">
        <p className="text-[0.6rem] tracking-[0.4em] uppercase text-[#E07A2C] mb-3">GET IN TOUCH</p>
        <h2 className="font-['Cormorant_Garamond'] text-[2.5rem] md:text-[4.5rem] font-light leading-tight mb-8">
          Contact <em className="italic text-[#E5B83C] font-semibold">Us</em>
        </h2>
        <motion.div whileHover={{ y: -3 }}
          className="bg-gradient-to-br from-[#160A03] to-[#0C0502] border border-[#E5B83C] p-8 rounded-2xl">
          <div className="text-5xl mb-4">👩🏽‍🍳</div>
          <h3 className="text-2xl font-bold font-['Cormorant_Garamond']">Biltong &amp; Bytes</h3>
          <p className="text-sm text-[#FEF3DF]/60 mb-6">Stanger, KZN &bull; Halaal Biltong</p>
          <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
            className="bg-[#25D366] text-white px-6 py-3 text-sm font-bold tracking-[0.1em] uppercase no-underline inline-flex items-center gap-2 rounded-xl transition-all hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(37,211,102,0.4)]">
            <MessageCircle className="w-4 h-4" /> ORDER ON WHATSAPP
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}

// ============================================
// CART DRAWER — Drag to close
// ============================================
function CartDrawer({ open, onClose, onCheckout }: { open: boolean; onClose: () => void; onCheckout: () => void }) {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const incrementQty = useCartStore((s) => s.incrementQty);
  const decrementQty = useCartStore((s) => s.decrementQty);
  const deliveryMode = useCartStore((s) => s.deliveryMode);
  const setDeliveryMode = useCartStore((s) => s.setDeliveryMode);
  const subtotal = useCartStore((s) => s.subtotal());
  const deliveryFee = useCartStore((s) => s.deliveryFee());
  const total = useCartStore((s) => s.total());
  const settingsDeliveryFee = useSettingsStore((s) => s.deliveryFee);
  const selectedRate = useCartStore((s) => s.selectedRate);
  const dragY = useMotionValue(0);
  const dragControls = useDragControls();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000]" onClick={onClose} />
          <motion.div
            drag="y" dragControls={dragControls} dragConstraints={{ top: 0 }} dragElastic={0.2}
            onDragEnd={(_, info) => { if (info.offset.y > 150) onClose(); }}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[2001] bg-[#0E0500] border-t border-[#E5B83C] rounded-t-3xl max-h-[92vh] flex flex-col touch-none"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 cursor-grab" onPointerDown={(e) => dragControls.start(e)}>
              <div className="w-10 h-1.5 bg-[#E5B83C]/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex justify-between items-center px-5 py-3 border-b border-white/10">
              <h3 className="font-['Cormorant_Garamond'] text-xl text-[#E5B83C]">
                Your Order <span className="text-sm text-[#FEF3DF]/40 ml-2">({items.reduce((s, i) => s + i.qty, 0)} items)</span>
              </h3>
              <button onClick={onClose} className="text-white/60 hover:text-white cursor-pointer p-1"><X className="w-6 h-6" /></button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-5 py-3 min-h-[100px]">
              {items.length === 0 ? (
                <div className="text-center py-10 text-white/40">
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                    <ShoppingCart className="w-14 h-14 mx-auto mb-3 opacity-20" />
                  </motion.div>
                  <p className="font-semibold">Your cart is empty</p>
                  <p className="text-xs mt-1 text-[#FEF3DF]/30">Tap a product to add some delicious biltong!</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {items.map((item) => (
                    <motion.div key={item.id} variants={cartItemVariants} initial="enter" animate="center" exit="exit" layout
                      className="flex justify-between items-start py-3 border-b border-white/8">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-[#FEF3DF]">{item.name}</p>
                        <p className="text-xs text-[#E5B83C]/70 mt-0.5 flex items-center gap-1">
                          <FlavorIcon flavor={item.flavor} /> {item.flavor}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <motion.button whileTap={{ scale: 0.75 }} onClick={() => decrementQty(item.id)}
                            className="bg-white/8 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:bg-[#E5B83C] hover:text-black transition-colors">
                            <Minus className="w-3 h-3" />
                          </motion.button>
                          <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
                          <motion.button whileTap={{ scale: 0.75 }} onClick={() => incrementQty(item.id)}
                            className="bg-white/8 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:bg-[#E5B83C] hover:text-black transition-colors">
                            <Plus className="w-3 h-3" />
                          </motion.button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-['Bebas_Neue'] text-lg text-[#F8E5B0]">R{item.price * item.qty}</span>
                        <motion.button whileTap={{ scale: 0.75 }} onClick={() => { removeItem(item.id); toast("Item removed", { icon: "🗑️" }); }}
                          className="text-[#B23A1A]/70 cursor-pointer p-1 hover:text-[#B23A1A] hover:bg-[#B23A1A]/10 rounded-full transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Delivery Mode Toggle */}
            <div className="px-5 py-3 border-t border-white/10">
              <div className="flex gap-2">
                {[{ mode: "collect" as DeliveryMode, icon: MapPin, label: "COLLECT", sub: "Free · Stanger" },
                  { mode: "deliver" as DeliveryMode, icon: Truck, label: "DELIVER", sub: `R${settingsDeliveryFee} Stanger · Courier Nationwide` }].map(({ mode, icon: Icon, label, sub }) => (
                  <motion.button key={mode} whileTap={{ scale: 0.97 }}
                    onClick={() => setDeliveryMode(mode)}
                    className={`flex-1 py-2.5 text-center cursor-pointer rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      deliveryMode === mode ? "bg-[#E5B83C] text-[#0A0301]" : "bg-white/5 text-[#FEF3DF]/70"
                    }`}>
                    <Icon className="w-3.5 h-3.5" /> {label} <span className="opacity-70">({sub})</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/10 bg-[#0A0301]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-[#FEF3DF]/60">Subtotal:</span><span className="text-xs">R{subtotal}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-[#FEF3DF]/60">
                    {selectedRate ? selectedRate.service_name : "Delivery"}:
                  </span>
                  <span className="text-xs">R{deliveryFee}</span>
                </div>
              )}
              <div className="flex justify-between items-center font-['Bebas_Neue'] text-2xl">
                <span>TOTAL:</span>
                <motion.span key={total} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="text-[#E5B83C]">R{total}</motion.span>
              </div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={onCheckout} disabled={items.length === 0}
                className={`w-full mt-3 py-3.5 font-bold tracking-[0.1em] uppercase cursor-pointer transition-all rounded-xl text-sm flex items-center justify-center gap-2 ${
                  items.length === 0 ? "bg-white/5 text-white/30 cursor-not-allowed" : "bg-[#25D366] text-white hover:shadow-[0_8px_25px_rgba(37,211,102,0.4)]"
                }`}>
                <CreditCard className="w-4 h-4" /> CHECKOUT
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================
// ORDER SUCCESS SCREEN
// ============================================
function OrderSuccess({ orderId, paymentMethod, trackingReference, onClose }: { orderId: string; paymentMethod: string; trackingReference?: string | null; onClose: () => void }) {
  const steps = [
    { icon: Package, label: "Order Placed", active: true },
    { icon: CheckCircle2, label: "Confirmed", active: false },
    { icon: Flame, label: "Preparing", active: false },
    { icon: Package, label: "Ready", active: false },
  ];

  return (
    <div className="text-center py-8 px-4">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.2 }}>
        <PartyPopper className="w-16 h-16 text-[#E5B83C] mx-auto" />
      </motion.div>
      <motion.h3 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="font-['Cormorant_Garamond'] text-3xl text-[#E5B83C] mt-4">Order Placed!</motion.h3>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="text-[#FEF3DF]/70 mt-2 text-sm">
        {paymentMethod === "ikhokha"
          ? "Please complete payment in the iKhokha tab, then confirm on WhatsApp."
          : "We will confirm your order on WhatsApp shortly!"}
      </motion.p>

      {/* Order Tracker */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        className="mt-6 px-2">
        <div className="flex items-center justify-between max-w-[320px] mx-auto">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center">
              <div className="flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.15, type: "spring" }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    step.active
                      ? "bg-[#E5B83C] border-[#E5B83C] text-[#0A0301]"
                      : "bg-transparent border-[#E5B83C]/25 text-[#E5B83C]/30"
                  }`}
                >
                  <step.icon className="w-4.5 h-4.5" />
                </motion.div>
                <span className={`text-[0.55rem] mt-1.5 tracking-wider uppercase font-semibold ${
                  step.active ? "text-[#E5B83C]" : "text-[#FEF3DF]/30"
                }`}>{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-6 md:w-10 h-0.5 mx-0.5 -mt-5 ${
                  i < 0 ? "bg-[#E5B83C]" : "bg-[#E5B83C]/20"
                }`} />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2 }}
        className="bg-[#2E7D32]/15 border border-[#2E7D32] rounded-xl p-4 mt-5 inline-block">
        <p className="text-[0.6rem] tracking-[0.15em] uppercase text-[#FEF3DF]/70">Order Reference</p>
        <p className="font-['Bebas_Neue'] text-2xl text-[#2E7D32] tracking-[0.1em]">{orderId}</p>
      </motion.div>

      {/* Tracking Reference for Courier Guy shipments */}
      {trackingReference && trackingReference !== "PENDING" && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.4 }}
          className="bg-[#E5B83C]/10 border border-[#E5B83C]/30 rounded-xl p-3 mt-3 inline-block">
          <p className="text-[0.6rem] tracking-[0.15em] uppercase text-[#FEF3DF]/70">Tracking Number</p>
          <p className="font-['Bebas_Neue'] text-lg text-[#E5B83C] tracking-[0.1em]">{trackingReference}</p>
          <p className="text-[0.55rem] text-[#FEF3DF]/40 mt-0.5">The Courier Guy · Track at thecourierguy.co.za</p>
        </motion.div>
      )}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
        <button onClick={onClose}
          className="mt-6 px-6 py-3 bg-[#E5B83C] text-[#0A0301] font-bold tracking-[0.1em] uppercase rounded-xl cursor-pointer text-sm">
          DONE
        </button>
      </motion.div>
    </div>
  );
}

// ============================================
// CHECKOUT MODAL — 3-Step: Shipping → Payment → Done
// ============================================
function CheckoutModal({ open, onClose, resetKey }: { open: boolean; onClose: () => void; resetKey: number }) {
  const items = useCartStore((s) => s.items);
  const deliveryMode = useCartStore((s) => s.deliveryMode);
  const deliveryAddress = useCartStore((s) => s.deliveryAddress);
  const setDeliveryAddress = useCartStore((s) => s.setDeliveryAddress);
  const customerName = useCartStore((s) => s.customerName);
  const customerPhone = useCartStore((s) => s.customerPhone);
  const customerEmail = useCartStore((s) => s.customerEmail);
  const setCustomerInfo = useCartStore((s) => s.setCustomerInfo);
  const setCurrentOrderId = useCartStore((s) => s.setCurrentOrderId);
  const setPendingIkhokhaOrder = useCartStore((s) => s.setPendingIkhokhaOrder);
  const total = useCartStore((s) => s.total());
  const subtotal = useCartStore((s) => s.subtotal());
  const deliveryFee = useCartStore((s) => s.deliveryFee());
  const clearCart = useCartStore((s) => s.clearCart);
  const isStangerDelivery = useCartStore((s) => s.isStangerDelivery);
  const setIsStangerDelivery = useCartStore((s) => s.setIsStangerDelivery);
  const availableRates = useCartStore((s) => s.availableRates);
  const setAvailableRates = useCartStore((s) => s.setAvailableRates);
  const selectedRate = useCartStore((s) => s.selectedRate);
  const setSelectedRate = useCartStore((s) => s.setSelectedRate);
  const ratesLoading = useCartStore((s) => s.ratesLoading);
  const setRatesLoading = useCartStore((s) => s.setRatesLoading);
  const settingsDeliveryFee = useSettingsStore((s) => s.deliveryFee);

  const [name, setName] = useState(customerName);
  const [phone, setPhone] = useState(customerPhone);
  const [email, setEmail] = useState(customerEmail);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [ikhokhaStep, setIkhokhaStep] = useState(false);
  const [ikhokhaLoading, setIkhokhaLoading] = useState(false);
  const [paylinkUrl, setPaylinkUrl] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastPaymentMethod, setLastPaymentMethod] = useState("cash");
  const [trackingRef, setTrackingRef] = useState<string | null>(null);

  // Address & shipping state (moved from CartDrawer)
  const [addressQuery, setAddressQuery] = useState(deliveryAddress);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [ratesFetched, setRatesFetched] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(0); // 0=shipping, 1=payment, 2=done

  // Address autocomplete with Stanger addresses shown first
  const filteredAddresses = useMemo(
    () => {
      if (addressQuery.length < 2) return [];
      const q = addressQuery.toLowerCase();
      const stanger = STANGER_ADDRESSES.filter((a) => a.toLowerCase().includes(q));
      const cities = SA_CITIES.filter((a) => a.toLowerCase().includes(q) && !a.toLowerCase().includes("stanger"));
      return [...stanger, ...cities];
    },
    [addressQuery]
  );

  useEffect(() => { setAddressQuery(deliveryAddress); }, [deliveryAddress]);

  // Fetch shipping rates when delivery address changes
  const fetchRates = useCallback(async (address: string) => {
    if (!address || address.trim().length < 3) return;
    if (items.length === 0) return;

    setRatesLoading(true);
    setRatesFetched(false);

    try {
      const res = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          items: items.map((i) => ({ name: i.name, qty: i.qty })),
        }),
      });

      if (res.ok) {
        const data = await res.json();

        if (data.isStanger) {
          setIsStangerDelivery(true);
          setAvailableRates(data.rates);
          setSelectedRate(data.rates[0] || null);
        } else {
          setIsStangerDelivery(false);
          setAvailableRates(data.rates);
          const sorted = [...data.rates].sort((a: ShippingRate, b: ShippingRate) => a.total_price - b.total_price);
          setSelectedRate(sorted[0] || null);
        }
        setRatesFetched(true);
      } else {
        console.warn("[Shipping] Rate fetch failed:", res.status);
        setAvailableRates([]);
      }
    } catch (err) {
      console.error("Failed to fetch shipping rates:", err);
      setAvailableRates([]);
    } finally {
      setRatesLoading(false);
    }
  }, [items, setIsStangerDelivery, setAvailableRates, setSelectedRate, setRatesLoading]);

  // Debounced rate fetching
  useEffect(() => {
    if (deliveryMode !== "deliver" || !addressQuery.trim()) return;

    const timer = setTimeout(() => {
      const isStanger = addressQuery.toLowerCase().includes("stanger") ||
        addressQuery.toLowerCase().includes("kwadukuza") ||
        addressQuery.toLowerCase().includes("kwa dukuza");

      if (isStanger) {
        setIsStangerDelivery(true);
        setSelectedRate({
          service_name: "Local Delivery (Stanger)",
          service_code: "STANGER_LOCAL",
          total_price: settingsDeliveryFee * 100,
          estimated_delivery_days: 1,
          courier_name: "Biltong & Bytes",
          courier_code: "local",
        });
        setAvailableRates([{
          service_name: "Local Delivery (Stanger)",
          service_code: "STANGER_LOCAL",
          total_price: settingsDeliveryFee * 100,
          estimated_delivery_days: 1,
          courier_name: "Biltong & Bytes",
          courier_code: "local",
        }]);
        setRatesFetched(true);
      } else if (addressQuery.trim().length >= 5) {
        setDeliveryAddress(addressQuery);
        fetchRates(addressQuery);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [addressQuery, deliveryMode, settingsDeliveryFee, fetchRates, setIsStangerDelivery, setSelectedRate, setAvailableRates, setDeliveryAddress]);

  // Save order to Supabase via API
  const saveOrder = useCallback(
    async (paymentMethod: string) => {
      const newOrderId = generateOrderId();
      setOrderId(newOrderId);
      setCurrentOrderId(newOrderId);
      setSavingStatus("saving");

      const shippingCarrier = deliveryMode === "deliver" && !isStangerDelivery && selectedRate
        ? selectedRate.courier_name
        : null;
      const trackingReference = deliveryMode === "deliver" && !isStangerDelivery
        ? "PENDING"
        : null;

      const orderData: OrderData = {
        order_id: newOrderId,
        customer_name: name,
        customer_phone: phone,
        customer_email: email || null,
        items: items.map((i) => ({ name: i.name, price: i.price, qty: i.qty })),
        items_summary: items.map((i) => `${i.qty}x ${i.name}`).join(", "),
        subtotal, delivery_fee: deliveryFee, total,
        delivery_mode: deliveryMode,
        delivery_address: deliveryMode === "deliver" ? deliveryAddress : null,
        payment_method: paymentMethod,
        payment_status: paymentMethod === "ikhokha" ? "pending" : "cash_on_delivery",
        order_status: "new",
        shipping_carrier: shippingCarrier,
        tracking_reference: trackingReference,
      };

      setCustomerInfo(name, phone, email);

      const localOrders = JSON.parse(localStorage.getItem("biltong_orders") || "[]");
      localOrders.push({ ...orderData, created_at: new Date().toISOString() });
      localStorage.setItem("biltong_orders", JSON.stringify(localOrders));

      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        });
        setSavingStatus(res.ok ? "saved" : "error");
      } catch {
        setSavingStatus("error");
      }
      return orderData;
    },
    [name, phone, email, items, subtotal, deliveryFee, total, deliveryMode, deliveryAddress, isStangerDelivery, selectedRate, setCustomerInfo, setCurrentOrderId]
  );

  // Create Courier Guy shipment for non-Stanger deliveries
  const createShipment = useCallback(async (orderId: string) => {
    if (isStangerDelivery || deliveryMode !== "deliver" || !selectedRate) return;

    try {
      const res = await fetch("/api/shipping/create-shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          deliveryAddress,
          customerName: name,
          customerPhone,
          customerEmail: email,
          items: items.map((i) => ({ name: i.name, qty: i.qty })),
          serviceLevelCode: selectedRate.service_code,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.trackingReference) {
          setTrackingRef(data.trackingReference);

          try {
            await fetch("/api/orders", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                order_id: orderId,
                tracking_reference: data.trackingReference,
                shipping_carrier: "The Courier Guy",
              }),
            });
          } catch { /* non-critical */ }

          const pending = useCartStore.getState().pendingIkhokhaOrder;
          if (pending) {
            (pending as Record<string, unknown>).tracking_reference = data.trackingReference;
            (pending as Record<string, unknown>).shipping_carrier = "The Courier Guy";
          }
        }
      }
    } catch (err) {
      console.error("[Checkout] Shipment creation failed (non-blocking):", err);
    }
  }, [isStangerDelivery, deliveryMode, selectedRate, deliveryAddress, name, customerPhone, email, items]);

  const validate = useCallback((): boolean => {
    if (!name.trim()) { toast.error("Please enter your name"); return false; }
    if (!phone.trim()) { toast.error("Please enter your phone number"); return false; }
    if (deliveryMode === "deliver" && !deliveryAddress.trim()) { toast.error("Please enter your delivery address"); return false; }
    if (deliveryMode === "deliver" && !isStangerDelivery && !selectedRate) { toast.error("Please select a shipping method"); return false; }
    return true;
  }, [name, phone, deliveryMode, deliveryAddress, isStangerDelivery, selectedRate]);

  const handleContinueToPayment = () => {
    if (!validate()) return;
    setCheckoutStep(1);
  };

  const handleWhatsAppCash = async () => {
    if (!validate()) return;
    const orderData = await saveOrder("cash");
    setLastPaymentMethod("cash");

    if (!isStangerDelivery && deliveryMode === "deliver") {
      createShipment(orderData.order_id);
    }

    const msg = buildWhatsAppMessage(orderData);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    toast.success(`Order ${orderData.order_id} sent!`, { icon: "🥩" });
    setOrderSuccess(true);
    setCheckoutStep(2);
  };

  const handleIkhokha = async () => {
    if (!validate()) return;
    setIkhokhaLoading(true);
    try {
      const orderData = await saveOrder("ikhokha");
      setLastPaymentMethod("ikhokha");
      setPendingIkhokhaOrder(orderData as unknown as Record<string, unknown>);

      const res = await fetch("/api/ikhokha/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total,
          orderId: orderData.order_id,
          description: `Biltong & Bytes - ${orderData.items_summary}`,
        }),
      });

      const paymentData = await res.json();

      if (res.ok && paymentData.success && paymentData.paylinkUrl) {
        setPaylinkUrl(paymentData.paylinkUrl);
        window.open(paymentData.paylinkUrl, "_blank");
        toast.info("iKhokha payment page opened! Complete payment, then confirm below.", { icon: "💳", duration: 5000 });

        try {
          await fetch("/api/orders", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_id: orderData.order_id, order_status: "payment_initiated" }),
          });
        } catch { /* non-critical */ }
      } else {
        console.warn("iKhokha API failed or not configured, using static URL with amount");
        const amountUrl = `${IKHOKHA_PAYMENT_URL}?amount=${total.toFixed(2)}`;
        setPaylinkUrl(amountUrl);
        window.open(amountUrl, "_blank");
        toast.info(`iKhokha opened with R${total.toFixed(2)}. Complete payment, then confirm below.`, { icon: "💳", duration: 5000 });
      }

      setIkhokhaStep(true);
    } catch {
      const orderData = await saveOrder("ikhokha");
      setLastPaymentMethod("ikhokha");
      setPendingIkhokhaOrder(orderData as unknown as Record<string, unknown>);
      const amountUrl = `${IKHOKHA_PAYMENT_URL}?amount=${total.toFixed(2)}`;
      setPaylinkUrl(amountUrl);
      window.open(amountUrl, "_blank");
      toast.info(`iKhokha opened with R${total.toFixed(2)}. Complete payment, then confirm below.`, { icon: "💳", duration: 5000 });
      setIkhokhaStep(true);
    } finally {
      setIkhokhaLoading(false);
    }
  };

  const handleConfirmWhatsApp = () => {
    const pendingOrder = useCartStore.getState().pendingIkhokhaOrder;
    if (!pendingOrder) { toast.error("No pending order found"); return; }
    const orderData = pendingOrder as unknown as OrderData;

    if (!isStangerDelivery && deliveryMode === "deliver" && orderData.order_id) {
      createShipment(orderData.order_id);
    }

    const msg = buildWhatsAppMessage(orderData) + "\n\n✅ Payment completed via iKhokha!";
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    toast.success("Confirmation sent!", { icon: "✅" });
    setOrderSuccess(true);
    setCheckoutStep(2);
  };

  const handleClose = () => {
    if (orderSuccess) clearCart();
    setOrderSuccess(false);
    setIkhokhaStep(false);
    setCheckoutStep(0);
    onClose();
  };

  // Step progress indicator
  const checkoutSteps = ["Shipping", "Payment", "Done"];

  // Can proceed from step 0 to step 1?
  const canContinueToPayment = name.trim() && phone.trim() &&
    (deliveryMode === "collect" ||
      (deliveryMode === "deliver" && deliveryAddress.trim() && (isStangerDelivery || selectedRate)));

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[3000]" />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[3001] overflow-y-auto"
          >
            <div key={resetKey} className="min-h-full flex items-start justify-center">
              <div className="w-full max-w-[540px] min-h-screen bg-gradient-to-br from-[#1A0A04] to-[#0E0500] border-x border-[#E5B83C]/20 px-5 py-6 md:px-8 md:py-8">

                {/* Close button */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-['Cormorant_Garamond'] text-2xl text-[#E5B83C]">Checkout</h3>
                  <button onClick={handleClose} className="text-white/60 hover:text-white cursor-pointer p-1"><X className="w-6 h-6" /></button>
                </div>

                {/* Step Progress Indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  {checkoutSteps.map((step, i) => (
                    <div key={step} className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        i <= checkoutStep ? "bg-[#E5B83C] text-[#0A0301]" : "bg-white/10 text-white/40"
                      }`}>
                        {i < checkoutStep ? <Check className="w-4 h-4" /> : i + 1}
                      </div>
                      <span className={`text-[0.65rem] tracking-wider uppercase ${
                        i <= checkoutStep ? "text-[#E5B83C] font-semibold" : "text-white/30"
                      }`}>{step}</span>
                      {i < checkoutSteps.length - 1 && (
                        <div className={`w-6 h-0.5 ${i < checkoutStep ? "bg-[#E5B83C]" : "bg-white/10"}`} />
                      )}
                    </div>
                  ))}
                </div>

                {/* ============================== */}
                {/* STEP 0: Shipping & Details     */}
                {/* ============================== */}
                {checkoutStep === 0 && (
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                    {/* Customer Info */}
                    <div className="space-y-3 mb-5">
                      <p className="text-[0.65rem] tracking-[0.2em] uppercase text-[#E07A2C] font-semibold">Your Details</p>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Full Name *"
                        className="w-full bg-white/8 border border-[#E5B83C]/30 rounded-xl px-4 py-3 text-[#FEF3DF] text-sm placeholder:text-[#FEF3DF]/25 focus:outline-none focus:border-[#E5B83C] focus:bg-white/12 transition-all" />
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your Phone Number *"
                        className="w-full bg-white/8 border border-[#E5B83C]/30 rounded-xl px-4 py-3 text-[#FEF3DF] text-sm placeholder:text-[#FEF3DF]/25 focus:outline-none focus:border-[#E5B83C] focus:bg-white/12 transition-all" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your Email (for receipt)"
                        className="w-full bg-white/8 border border-[#E5B83C]/30 rounded-xl px-4 py-3 text-[#FEF3DF] text-sm placeholder:text-[#FEF3DF]/25 focus:outline-none focus:border-[#E5B83C] focus:bg-white/12 transition-all" />
                    </div>

                    {/* Shipping Section */}
                    <div className="mb-5">
                      <p className="text-[0.65rem] tracking-[0.2em] uppercase text-[#E07A2C] font-semibold mb-3">Shipping</p>

                      {deliveryMode === "collect" ? (
                        <div className="bg-[#2E7D32]/15 border border-[#2E7D32]/30 rounded-xl p-4">
                          <p className="text-[#2E7D32] text-sm font-semibold flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> Collection from Stanger — Free
                          </p>
                          <p className="text-[#FEF3DF]/40 text-xs mt-1">Pick up your order in Stanger town</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Delivery Address Input */}
                          <div>
                            <label className="text-xs text-[#FEF3DF]/70 font-semibold mb-1.5 block">Delivery Address</label>
                            <div className="relative">
                              <input type="text" value={addressQuery}
                                onChange={(e) => { setAddressQuery(e.target.value); setShowSuggestions(true); setRatesFetched(false); }}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                placeholder="Start typing your address (e.g. 12 Main Rd, Durban, KwaZulu-Natal)"
                                className="w-full bg-white/8 border border-[#E5B83C]/30 rounded-xl px-4 py-3 text-[#FEF3DF] text-sm placeholder:text-[#FEF3DF]/25 focus:outline-none focus:border-[#E5B83C] focus:bg-white/12 transition-all" />
                              {showSuggestions && filteredAddresses.length > 0 && (
                                <div className="absolute top-full left-0 right-0 bg-[#2A1508] rounded-xl mt-1 max-h-[180px] overflow-y-auto z-10 shadow-xl border border-[#E5B83C]/20">
                                  {filteredAddresses.map((addr) => (
                                    <button key={addr} onClick={() => { setDeliveryAddress(addr); setAddressQuery(addr); setShowSuggestions(false); }}
                                      className="w-full text-left px-4 py-2.5 text-sm text-[#FEF3DF] cursor-pointer border-b border-[#E5B83C]/10 hover:bg-[#E5B83C] hover:text-[#0A0301] transition-colors first:rounded-t-xl last:rounded-b-xl last:border-b-0">
                                      {addr}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <p className="text-[0.6rem] text-[#FEF3DF]/35 mt-1.5">Format: Street, Suburb, City, Province, Postal Code</p>
                          </div>

                          {/* Loading indicator */}
                          {ratesLoading && (
                            <div className="flex items-center gap-2 text-[#E5B83C]/70 text-xs">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Getting shipping rates...</span>
                            </div>
                          )}

                          {/* Stanger delivery detected */}
                          {isStangerDelivery && ratesFetched && !ratesLoading && (
                            <div className="bg-[#2E7D32]/15 border border-[#2E7D32]/30 rounded-xl p-3">
                              <p className="text-[#2E7D32] text-sm font-semibold flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Stanger Local Delivery — R{settingsDeliveryFee}
                              </p>
                              <p className="text-[#FEF3DF]/40 text-xs mt-0.5">Delivery within Stanger town, next day</p>
                            </div>
                          )}

                          {/* Courier rates for non-Stanger */}
                          {!isStangerDelivery && availableRates.length > 0 && ratesFetched && !ratesLoading && (
                            <div className="space-y-2">
                              <p className="text-[0.65rem] text-[#FEF3DF]/50 font-semibold tracking-wider uppercase">Select shipping method:</p>
                              {availableRates.sort((a, b) => a.total_price - b.total_price).map((rate) => {
                                const price = Math.round(rate.total_price / 100);
                                const isSelected = selectedRate?.service_code === rate.service_code;
                                return (
                                  <motion.button key={rate.service_code} whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedRate(rate)}
                                    className={`w-full text-left p-3 rounded-xl cursor-pointer transition-all text-xs border ${
                                      isSelected
                                        ? "bg-[#E5B83C]/15 border-[#E5B83C] text-[#FEF3DF]"
                                        : "bg-white/3 border-white/10 text-[#FEF3DF]/70 hover:border-[#E5B83C]/40"
                                    }`}>
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-2.5">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                          isSelected ? "border-[#E5B83C]" : "border-white/20"
                                        }`}>
                                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#E5B83C]" />}
                                        </div>
                                        <div>
                                          <p className="font-semibold">{rate.service_name}</p>
                                          <p className="text-[0.6rem] text-[#FEF3DF]/40">{rate.courier_name} · {rate.estimated_delivery_days} business day{rate.estimated_delivery_days !== 1 ? "s" : ""}</p>
                                        </div>
                                      </div>
                                      <span className="font-['Bebas_Neue'] text-xl text-[#F8E5B0]">R{price}</span>
                                    </div>
                                  </motion.button>
                                );
                              })}
                            </div>
                          )}

                          {/* No rates found */}
                          {!isStangerDelivery && ratesFetched && availableRates.length === 0 && !ratesLoading && (
                            <div className="bg-[#B23A1A]/15 border border-[#B23A1A]/30 rounded-xl p-3">
                              <p className="text-[#B23A1A] text-xs">No shipping rates found. Please check your address or contact us on WhatsApp.</p>
                            </div>
                          )}

                          {/* Address hint */}
                          {deliveryMode === "deliver" && addressQuery.trim().length > 0 && !ratesLoading && (
                            <p className="text-[0.6rem] text-[#FEF3DF]/35">
                              {isStangerDelivery
                                ? "Stanger delivery · R" + settingsDeliveryFee + " fee"
                                : "Nationwide courier via The Courier Guy"
                              }
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Order ID & saving status */}
                    <AnimatePresence>
                      {orderId && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                          className="bg-[#2E7D32]/15 border border-[#2E7D32] rounded-xl p-3 text-center mb-3">
                          <p className="text-[0.6rem] tracking-[0.15em] uppercase text-[#FEF3DF]/70">Order Reference</p>
                          <p className="font-['Bebas_Neue'] text-xl text-[#2E7D32] tracking-[0.1em]">{orderId}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {savingStatus !== "idle" && (
                      <div className={`text-center text-xs mb-3 ${
                        savingStatus === "saving" ? "text-[#E5B83C]/70" : savingStatus === "saved" ? "text-[#2E7D32]" : "text-[#B23A1A]"
                      }`}>
                        {savingStatus === "saving" && <span className="flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>}
                        {savingStatus === "saved" && "✓ Order saved!"}
                        {savingStatus === "error" && "Saved locally (database unavailable)"}
                      </div>
                    )}

                    {/* Continue to Payment */}
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleContinueToPayment}
                      disabled={!canContinueToPayment}
                      className={`w-full py-3.5 font-bold tracking-[0.1em] uppercase cursor-pointer transition-all rounded-xl text-sm flex items-center justify-center gap-2 ${
                        canContinueToPayment
                          ? "bg-[#E5B83C] text-[#0A0301] hover:shadow-[0_8px_25px_rgba(229,184,60,0.4)]"
                          : "bg-white/5 text-white/30 cursor-not-allowed"
                      }`}>
                      CONTINUE TO PAYMENT <ChevronUp className="w-4 h-4 rotate-90" />
                    </motion.button>

                    <button onClick={handleClose}
                      className="w-full text-white/40 py-3 cursor-pointer text-sm hover:text-white transition-colors bg-transparent border-none mt-1">Cancel</button>
                  </motion.div>
                )}

                {/* ============================== */}
                {/* STEP 1: Payment                */}
                {/* ============================== */}
                {checkoutStep === 1 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                    {/* Order Summary */}
                    <div className="bg-white/4 rounded-xl p-4 mb-4 border border-white/5">
                      <p className="text-[0.65rem] font-semibold text-[#FEF3DF]/60 mb-2 tracking-wider uppercase">Order Summary</p>
                      {items.map((item) => (
                        <div key={item.id} className="flex justify-between text-xs py-1">
                          <span className="text-[#FEF3DF]/80">{item.qty}x {item.name}</span>
                          <span className="text-[#F8E5B0]">R{item.price * item.qty}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs py-1 border-t border-white/10 mt-1">
                        <span className="text-[#FEF3DF]/60">Subtotal</span><span>R{subtotal}</span>
                      </div>
                      {deliveryFee > 0 && (
                        <div className="flex justify-between text-xs py-1">
                          <span className="text-[#FEF3DF]/60">{selectedRate?.service_name || "Delivery"}</span><span>R{deliveryFee}</span>
                        </div>
                      )}
                    </div>

                    {/* Total */}
                    <div className="bg-[#E5B83C]/12 border-2 border-[#E5B83C] rounded-xl p-4 text-center mb-5">
                      <p className="text-[0.65rem] tracking-[0.2em] uppercase text-[#FEF3DF]/70">AMOUNT TO PAY</p>
                      <motion.p key={total} initial={{ scale: 1.1 }} animate={{ scale: 1 }}
                        className="font-['Bebas_Neue'] text-4xl text-[#E5B83C]">R{total}</motion.p>
                    </div>

                    {/* Order ID & saving */}
                    <AnimatePresence>
                      {orderId && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                          className="bg-[#2E7D32]/15 border border-[#2E7D32] rounded-xl p-3 text-center mb-3">
                          <p className="text-[0.6rem] tracking-[0.15em] uppercase text-[#FEF3DF]/70">Order Reference</p>
                          <p className="font-['Bebas_Neue'] text-xl text-[#2E7D32] tracking-[0.1em]">{orderId}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {savingStatus !== "idle" && (
                      <div className={`text-center text-xs mb-3 ${
                        savingStatus === "saving" ? "text-[#E5B83C]/70" : savingStatus === "saved" ? "text-[#2E7D32]" : "text-[#B23A1A]"
                      }`}>
                        {savingStatus === "saving" && <span className="flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>}
                        {savingStatus === "saved" && "✓ Order saved!"}
                        {savingStatus === "error" && "Saved locally (database unavailable)"}
                      </div>
                    )}

                    {/* Payment Buttons */}
                    {!ikhokhaStep ? (
                      <>
                        <motion.button whileTap={{ scale: 0.97 }} onClick={handleIkhokha} disabled={ikhokhaLoading}
                          className={`w-full bg-[#1DB954] text-white py-3.5 font-bold tracking-[0.1em] uppercase cursor-pointer transition-all rounded-xl text-sm mb-3 hover:shadow-[0_8px_25px_rgba(29,185,84,0.4)] flex items-center justify-center gap-2 ${ikhokhaLoading ? 'opacity-60 cursor-not-allowed' : ''}`}>
                          {ikhokhaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />} {ikhokhaLoading ? 'CREATING PAYMENT...' : 'PAY WITH IKHOKHA'}
                        </motion.button>
                        <div className="flex items-center gap-3 my-1">
                          <div className="flex-1 h-px bg-white/15" />
                          <span className="text-[0.55rem] text-white/40 uppercase tracking-[0.1em]">or</span>
                          <div className="flex-1 h-px bg-white/15" />
                        </div>
                        <motion.button whileTap={{ scale: 0.97 }} onClick={handleWhatsAppCash}
                          className="w-full bg-[#25D366] text-white py-3 font-bold tracking-[0.1em] uppercase cursor-pointer transition-all rounded-xl text-xs mb-3 hover:shadow-[0_8px_25px_rgba(37,211,102,0.4)] flex items-center justify-center gap-2">
                          <MessageCircle className="w-3.5 h-3.5" /> WHATSAPP (Cash/Card)
                        </motion.button>
                      </>
                    ) : (
                      <>
                        <motion.button whileTap={{ scale: 0.97 }} onClick={handleConfirmWhatsApp}
                          className="w-full bg-[#25D366] text-white py-3.5 font-bold tracking-[0.1em] uppercase cursor-pointer transition-all rounded-xl text-sm mb-3 hover:shadow-[0_8px_25px_rgba(37,211,102,0.4)] flex items-center justify-center gap-2">
                          <MessageCircle className="w-4 h-4" /> CONFIRM ON WHATSAPP
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.97 }} onClick={() => window.open(paylinkUrl || IKHOKHA_PAYMENT_URL, "_blank")}
                          className="w-full border border-[#E5B83C]/40 text-[#E5B83C] py-2.5 font-bold tracking-[0.1em] uppercase cursor-pointer rounded-xl text-xs mb-3 hover:bg-[#E5B83C]/10 flex items-center justify-center gap-2">
                          <CreditCard className="w-3.5 h-3.5" /> RE-OPEN PAYMENT
                        </motion.button>
                      </>
                    )}

                    {/* Back button */}
                    <button onClick={() => setCheckoutStep(0)}
                      className="w-full text-white/40 py-3 cursor-pointer text-sm hover:text-white transition-colors bg-transparent border-none">
                      ← Back to Shipping
                    </button>

                    <p className="text-[0.6rem] text-white/35 text-center mt-2 leading-relaxed">
                      iKhokha: Secure card payment in a new tab.
                      <br />WhatsApp: For cash or card on collection/delivery.
                      {deliveryMode === "deliver" && !isStangerDelivery && (
                        <><br />📦 Nationwide delivery via The Courier Guy</>
                      )}
                    </p>
                  </motion.div>
                )}

                {/* ============================== */}
                {/* STEP 2: Done (Order Success)   */}
                {/* ============================== */}
                {checkoutStep === 2 && orderSuccess && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                    <OrderSuccess orderId={orderId || ""} paymentMethod={lastPaymentMethod} trackingReference={trackingRef} onClose={handleClose} />
                  </motion.div>
                )}

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================
// FLOATING CART BUTTON
// ============================================
function FloatingCartButton({ onClick, pulse }: { onClick: () => void; pulse?: boolean }) {
  const totalItems = useCartStore((s) => s.totalItems());
  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={onClick}
          className={`fixed bottom-6 right-5 w-14 h-14 rounded-full flex items-center justify-center cursor-pointer z-[300] transition-all ${
            pulse
              ? "bg-[#E5B83C] shadow-[0_0_25px_rgba(229,184,60,0.5)]"
              : "bg-[#25D366] shadow-[0_4px_20px_rgba(37,211,102,0.4)]"
          }`}
        >
          <ShoppingCart className="w-6 h-6 text-white" />
          <motion.span key={totalItems} initial={{ scale: 1.5 }} animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-[#B23A1A] text-white w-5 h-5 rounded-full text-[0.6rem] flex items-center justify-center font-bold">
            {totalItems}
          </motion.span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// ============================================
// FOOTER
// ============================================
function Footer() {
  const deliveryFee = useSettingsStore((s) => s.deliveryFee);
  return (
    <footer className="py-10 md:py-14 px-4 md:px-[6%] relative z-20 border-t border-[#E5B83C]/10">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* Brand Column */}
          <div className="text-center md:text-left">
            <p className="font-['Bebas_Neue'] text-xl tracking-[0.2em] text-[#E5B83C] mb-2">
              🥩 BILTONG<span className="text-[#E07A2C]">&amp;</span>BYTES
            </p>
            <p className="text-[0.65rem] tracking-[0.15em] uppercase text-[#FEF3DF]/40">Premium Halaal Biltong · Est. 2024</p>
            <div className="mt-4 flex items-center justify-center md:justify-start gap-2">
              <Leaf className="w-4 h-4 text-[#2E7D32]" />
              <span className="text-[#2E7D32] text-xs font-semibold">100% Halaal Certified</span>
            </div>
          </div>

          {/* Contact Column */}
          <div className="text-center md:text-left">
            <p className="text-[0.6rem] tracking-[0.25em] uppercase text-[#E5B83C]/60 mb-3">Get In Touch</p>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase no-underline transition-all hover:bg-[#25D366]/25"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp Us
            </a>
            <div className="mt-3 flex items-center justify-center md:justify-start gap-1.5 text-[#FEF3DF]/40 text-xs">
              <MapPin className="w-3.5 h-3.5" />
              <span>Stanger, KwaZulu-Natal</span>
            </div>
            <div className="mt-1.5 flex items-center justify-center md:justify-start gap-1.5 text-[#FEF3DF]/40 text-xs">
              <Truck className="w-3.5 h-3.5" />
              <span>R{deliveryFee} Stanger · Nationwide courier available</span>
            </div>
          </div>

          {/* Info Column */}
          <div className="text-center md:text-left">
            <p className="text-[0.6rem] tracking-[0.25em] uppercase text-[#E5B83C]/60 mb-3">Delivery Options</p>
            <div className="bg-[#0E0500]/60 rounded-xl p-3 border border-[#E5B83C]/10">
              <p className="text-[#FEF3DF]/50 text-xs leading-relaxed">
                <span className="text-[#2E7D32] font-semibold">Stanger:</span> R{deliveryFee} flat fee, next-day delivery
              </p>
              <p className="text-[#FEF3DF]/50 text-xs leading-relaxed mt-1">
                <span className="text-[#E5B83C] font-semibold">Nationwide:</span> Live courier rates via The Courier Guy
              </p>
              <p className="text-[#FEF3DF]/30 text-[0.6rem] mt-2">Free collection in Stanger town</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-5 border-t border-[#E5B83C]/8 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-[#FEF3DF]/25 text-[0.65rem]">
            &copy; 2025 Biltong &amp; Bytes · Made with ❤️ in Stanger
          </p>
          <p className="text-[#FEF3DF]/20 text-[0.55rem] tracking-wider uppercase">
            Premium Halaal Biltong · Hand-Cured with Love
          </p>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// MAIN PAGE
// ============================================
export default function BiltongAndBytes() {
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutResetKey, setCheckoutResetKey] = useState(0);
  const [confettiActive, setConfettiActive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const cartRef = useRef<HTMLButtonElement>(null);
  const productRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [flyAnimation, setFlyAnimation] = useState<{ from: DOMRect; to: DOMRect } | null>(null);
  const [cartPulse, setCartPulse] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Fetch settings from Supabase on mount
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Confetti is triggered via confettiKey increment from add-to-cart actions
  const [confettiKey, setConfettiKey] = useState(0);

  const triggerConfetti = useCallback(() => setConfettiKey((k) => k + 1), []);

  const handleCartOpen = useCallback(() => setCartOpen(true), []);
  const handleCartClose = useCallback(() => setCartOpen(false), []);
  const handleCheckout = useCallback(() => {
    setCartOpen(false);
    setCheckoutResetKey((k) => k + 1);
    setTimeout(() => setCheckoutOpen(true), 200);
  }, []);
  const handleCheckoutClose = useCallback(() => setCheckoutOpen(false), []);

  const handleItemAdd = useCallback(() => {
    triggerConfetti();
    // Fly-to-cart animation
    const cardEl = productRefs.current?.find((el) => el !== null);
    const cartBtn = cartRef.current;
    if (cardEl && cartBtn) {
      const from = cardEl.getBoundingClientRect();
      const to = cartBtn.getBoundingClientRect();
      setFlyAnimation({ from, to });
    }
    // Cart pulse
    setCartPulse(true);
    setTimeout(() => setCartPulse(false), 600);
  }, [triggerConfetti]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0A0301] flex flex-col items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          className="text-6xl md:text-7xl mb-4"
        >
          🥩
        </motion.div>
        <div className="font-['Bebas_Neue'] text-3xl md:text-4xl tracking-[0.2em] relative overflow-hidden">
          <span className="bg-gradient-to-r from-[#E5B83C] via-[#F8E5B0] to-[#E5B83C] bg-clip-text text-transparent bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite]">
            BILTONG<span className="text-[#E07A2C]">&amp;</span>BYTES
          </span>
        </div>
        <div className="w-32 h-1 mt-6 bg-[#E5B83C]/20 rounded-full overflow-hidden">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-full w-1/2 bg-[#E5B83C] rounded-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0301] text-[#FEF3DF] font-['Syne',sans-serif] overflow-x-hidden">
      <SmokeCanvas />
      <Confetti confettiKey={confettiKey} />
      <Navbar onCartOpen={handleCartOpen} cartRef={cartRef} />
      <Hero />
      <PhotoStrip />
      <SectionDivider />
      <ProductsSection onItemAdd={handleItemAdd} productRefs={productRefs} />
      <SectionDivider />
      <StorySection />
      <SectionDivider />
      <HowToOrderSection />
      <SectionDivider />
      <ContactSection />
      <Footer />
      <StickyOrderBar />
      <FloatingCartButton onClick={handleCartOpen} pulse={cartPulse} />
      <AnimatePresence>
        {flyAnimation && (
          <FlyToCart from={flyAnimation.from} to={flyAnimation.to} onComplete={() => setFlyAnimation(null)} />
        )}
      </AnimatePresence>
      <CartDrawer open={cartOpen} onClose={handleCartClose} onCheckout={handleCheckout} />
      <CheckoutModal open={checkoutOpen} onClose={handleCheckoutClose} resetKey={checkoutResetKey} />
    </div>
  );
}
