"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Lock,
  Eye,
  EyeOff,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  Banknote,
  Truck,
  MapPin,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Trash2,
  LogOut,
  ShoppingBag,
  CircleDollarSign,
  Loader2,
  Settings,
  ClipboardList,
  Save,
  DollarSign,
  Plus,
  Pencil,
  X,
  Image as ImageIcon,
  Tag,
  Star,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PRODUCTS, type Product, type Deal, type DealItem } from "@/lib/supabase";

// ============================================
// TYPES
// ============================================
interface OrderItem {
  name: string;
  flavor?: string;
  price: number;
  qty: number;
}

interface Order {
  order_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  items: OrderItem[];
  items_summary: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_mode: string;
  delivery_address: string | null;
  payment_method: string;
  payment_status: string;
  order_status: string;
  paylink_id: string | null;
  created_at: string;
}

type StatusFilter = "all" | "new" | "payment_initiated" | "confirmed" | "fulfilled" | "payment_failed";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  new: { label: "New", color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30", icon: Clock },
  payment_initiated: { label: "Awaiting Payment", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30", icon: CreditCard },
  confirmed: { label: "Confirmed", color: "text-green-400", bg: "bg-green-500/15 border-green-500/30", icon: CheckCircle2 },
  fulfilled: { label: "Fulfilled", color: "text-[#E5B83C]", bg: "bg-[#E5B83C]/15 border-[#E5B83C]/30", icon: Package },
  payment_failed: { label: "Payment Failed", color: "text-red-400", bg: "bg-red-500/15 border-red-500/30", icon: XCircle },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-amber-400" },
  paid: { label: "Paid", color: "text-green-400" },
  failed: { label: "Failed", color: "text-red-400" },
  cash_on_delivery: { label: "Cash/Card", color: "text-blue-400" },
};

// ============================================
// AUTH HELPERS (cookie-based, no token storage)
// ============================================
// The session token is stored in an httpOnly cookie set by the server.
// JavaScript can NEVER read it — defeats XSS token theft.
// All API calls include credentials: "include" so the cookie is sent.

async function checkAuth(): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/auth", { method: "GET", credentials: "include" });
    if (!res.ok) return false;
    const data = await res.json();
    return data.valid === true;
  } catch {
    return false;
  }
}

async function logout(): Promise<void> {
  await fetch("/api/admin/auth", { method: "DELETE", credentials: "include" });
}

// ============================================
// LOGIN SCREEN
// ============================================
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setError("");

    try {
      // Send password to server — server sets httpOnly cookie on success
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Cookie is set by the server — no token to store in JS
        onLogin();
      } else if (res.status === 429) {
        setError(data.error || "Too many attempts. Please wait.");
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
      } else {
        setError(data.error || "Wrong password. Try again.");
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0301] via-[#1A0A04] to-[#0A0301] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: shaking ? [0, -10, 10, -5, 5, 0] : 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#E5B83C]/15 border-2 border-[#E5B83C] rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-[#E5B83C]" />
          </div>
          <h1 className="font-['Cormorant_Garamond'] text-3xl text-[#FEF3DF]">Admin Dashboard</h1>
          <p className="text-sm text-[#FEF3DF]/50 mt-1">Biltong & Bytes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="Enter admin password"
              className="w-full bg-white/8 border border-[#E5B83C]/30 rounded-xl px-4 py-3.5 text-[#FEF3DF] text-sm placeholder:text-[#FEF3DF]/25 focus:outline-none focus:border-[#E5B83C] focus:bg-white/12 transition-all pr-12"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#FEF3DF]/40 hover:text-[#E5B83C] cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs text-center">
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loggingIn}
            className={`w-full py-3.5 font-bold tracking-[0.1em] uppercase cursor-pointer rounded-xl text-sm transition-all flex items-center justify-center gap-2 ${
              loggingIn ? "bg-[#E5B83C]/50 text-[#0A0301]/70 cursor-not-allowed" : "bg-[#E5B83C] text-[#0A0301] hover:bg-[#E5B83C]/90"
            }`}
          >
            {loggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loggingIn ? "VERIFYING..." : "LOGIN"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ============================================
// STATS CARDS
// ============================================
function StatsCards({ orders }: { orders: Order[] }) {
  const totalRevenue = orders
    .filter((o) => o.payment_status === "paid" || o.order_status === "confirmed" || o.order_status === "fulfilled")
    .reduce((sum, o) => sum + o.total, 0);

  const pendingCount = orders.filter((o) => o.order_status === "new" || o.order_status === "payment_initiated").length;
  const fulfilledCount = orders.filter((o) => o.order_status === "fulfilled").length;
  const totalOrders = orders.length;

  const stats = [
    { label: "Total Orders", value: totalOrders, icon: ShoppingBag, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Revenue", value: `R${totalRevenue}`, icon: CircleDollarSign, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Pending", value: pendingCount, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Fulfilled", value: fulfilledCount, icon: Package, color: "text-[#E5B83C]", bg: "bg-[#E5B83C]/10" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className={`${stat.bg} border border-white/10 rounded-xl p-4`}>
          <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
          <p className="font-['Bebas_Neue'] text-2xl text-[#FEF3DF]">{stat.value}</p>
          <p className="text-[0.6rem] text-[#FEF3DF]/50 tracking-wider uppercase">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

// ============================================
// ORDER ROW
// ============================================
function OrderRow({
  order,
  onUpdateStatus,
  onDelete,
}: {
  order: Order;
  onUpdateStatus: (orderId: string, orderStatus: string, paymentStatus?: string) => void;
  onDelete: (orderId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusConf = STATUS_CONFIG[order.order_status] || STATUS_CONFIG.new;
  const payConf = PAYMENT_STATUS_CONFIG[order.payment_status] || { label: order.payment_status, color: "text-white/50" };
  const StatusIcon = statusConf.icon;

  const date = new Date(order.created_at);
  const timeStr = date.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString("en-ZA", { day: "2-digit", month: "short" });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/4 border border-white/8 rounded-xl overflow-hidden"
    >
      {/* Header Row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/4 transition-colors text-left"
      >
        <div className={`w-8 h-8 rounded-lg ${statusConf.bg} border flex items-center justify-center flex-shrink-0`}>
          <StatusIcon className={`w-4 h-4 ${statusConf.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-['Bebas_Neue'] text-sm tracking-wider text-[#E5B83C]">
              {order.order_id}
            </span>
            <span className={`text-[0.55rem] px-2 py-0.5 rounded-full border ${statusConf.bg} ${statusConf.color} font-semibold`}>
              {statusConf.label}
            </span>
          </div>
          <p className="text-xs text-[#FEF3DF]/60 truncate mt-0.5">
            {order.customer_name} · {order.items_summary}
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="font-['Bebas_Neue'] text-lg text-[#E5B83C]">R{order.total}</p>
          <p className="text-[0.55rem] text-[#FEF3DF]/40">{dateStr} {timeStr}</p>
        </div>

        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[#FEF3DF]/40 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#FEF3DF]/40 flex-shrink-0" />
        )}
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/8 pt-3 space-y-3">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[0.55rem] text-[#FEF3DF]/40 uppercase tracking-wider mb-1">Customer</p>
                  <p className="text-sm text-[#FEF3DF]">{order.customer_name}</p>
                  <p className="text-xs text-[#FEF3DF]/60">{order.customer_phone}</p>
                  {order.customer_email && (
                    <p className="text-xs text-[#FEF3DF]/40">{order.customer_email}</p>
                  )}
                </div>
                <div>
                  <p className="text-[0.55rem] text-[#FEF3DF]/40 uppercase tracking-wider mb-1">Delivery</p>
                  <div className="flex items-center gap-1.5">
                    {order.delivery_mode === "collect" ? (
                      <MapPin className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Truck className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span className="text-sm text-[#FEF3DF]">
                      {order.delivery_mode === "collect"
                        ? "Collection"
                        : order.delivery_mode === "stanger"
                          ? "Stanger Delivery"
                          : order.delivery_mode === "nationwide"
                            ? "Nationwide Delivery"
                            : order.delivery_mode === "deliver"
                              ? "Delivery"
                              : order.delivery_mode}
                    </span>
                  </div>
                  {order.delivery_address && (
                    <p className="text-xs text-[#FEF3DF]/60 mt-0.5">{order.delivery_address}</p>
                  )}
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-[0.55rem] text-[#FEF3DF]/40 uppercase tracking-wider mb-1">Items</p>
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs py-0.5">
                    <span className="text-[#FEF3DF]/80">{item.qty}x {item.name} <span className="text-[#E5B83C]/80">[{item.flavor || "Traditional"}]</span></span>
                    <span className="text-[#F8E5B0]">R{item.price * item.qty}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs pt-1 mt-1 border-t border-white/10">
                  <span className="text-[#FEF3DF]/50">Subtotal</span><span>R{order.subtotal}</span>
                </div>
                {order.delivery_fee > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[#FEF3DF]/50">Delivery</span><span>R{order.delivery_fee}</span>
                  </div>
                )}
                <div className="flex justify-between font-['Bebas_Neue'] text-sm pt-1">
                  <span>Total</span><span className="text-[#E5B83C]">R{order.total}</span>
                </div>
              </div>

              {/* Payment Info */}
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[0.55rem] text-[#FEF3DF]/40 uppercase tracking-wider mb-1">Payment</p>
                  <div className="flex items-center gap-1.5">
                    {order.payment_method === "ikhokha" ? (
                      <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Banknote className="w-3.5 h-3.5 text-green-400" />
                    )}
                    <span className="text-xs text-[#FEF3DF] capitalize">{order.payment_method === "ikhokha" ? "iKhokha" : "Cash/Card"}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[0.55rem] text-[#FEF3DF]/40 uppercase tracking-wider mb-1">Payment Status</p>
                  <span className={`text-xs font-semibold ${payConf.color}`}>{payConf.label}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                {order.order_status === "new" && (
                  <button
                    onClick={() => onUpdateStatus(order.order_id, "confirmed", order.payment_method === "ikhokha" ? "paid" : undefined)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-500/15 border border-green-500/30 text-green-400 rounded-lg text-xs font-semibold cursor-pointer hover:bg-green-500/25 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Order
                  </button>
                )}
                {order.order_status === "payment_initiated" && (
                  <button
                    onClick={() => onUpdateStatus(order.order_id, "confirmed", "paid")}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-500/15 border border-green-500/30 text-green-400 rounded-lg text-xs font-semibold cursor-pointer hover:bg-green-500/25 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid & Confirm
                  </button>
                )}
                {order.order_status === "confirmed" && (
                  <button
                    onClick={() => onUpdateStatus(order.order_id, "fulfilled")}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#E5B83C]/15 border border-[#E5B83C]/30 text-[#E5B83C] rounded-lg text-xs font-semibold cursor-pointer hover:bg-[#E5B83C]/25 transition-colors"
                  >
                    <Package className="w-3.5 h-3.5" /> Mark Fulfilled
                  </button>
                )}
                {order.order_status === "payment_failed" && (
                  <>
                    <button
                      onClick={() => onUpdateStatus(order.order_id, "new")}
                      className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-semibold cursor-pointer hover:bg-blue-500/25 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retry
                    </button>
                    <button
                      onClick={() => onUpdateStatus(order.order_id, "confirmed", "paid")}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-500/15 border border-green-500/30 text-green-400 rounded-lg text-xs font-semibold cursor-pointer hover:bg-green-500/25 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid Manually
                    </button>
                  </>
                )}
                {order.order_status === "fulfilled" && (
                  <span className="flex items-center gap-1.5 px-3 py-2 bg-[#E5B83C]/10 border border-[#E5B83C]/20 text-[#E5B83C]/60 rounded-lg text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                  </span>
                )}
                <button
                  onClick={() => {
                    if (confirm(`Delete order ${order.order_id}? This cannot be undone.`)) {
                      onDelete(order.order_id);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400/60 rounded-lg text-xs cursor-pointer hover:bg-red-500/20 hover:text-red-400 transition-colors ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================
// SETTINGS PANEL
// ============================================
// SETTINGS PANEL — delivery fees only (product prices now in Products tab)
// ============================================
function SettingsPanel() {
  const [deliveryFeeInput, setDeliveryFeeInput] = useState("40");
  const [nationwideFeeInput, setNationwideFeeInput] = useState("150");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDeliveryFeeInput(String(data.deliveryFee ?? 40));
        setNationwideFeeInput(String(data.nationwideDeliveryFee ?? 150));
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const deliveryFee = parseInt(deliveryFeeInput, 10) || 0;
      const nationwideDeliveryFee = parseInt(nationwideFeeInput, 10) || 0;

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          deliveryFee,
          nationwideDeliveryFee,
          // Keep product_prices in sync with the products table — read current products
          // and send their prices so the legacy field stays consistent.
          productPrices: {},
        }),
      });

      if (res.ok) {
        toast.success("Delivery fees saved!", { icon: "✅" });
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <Loader2 className="w-8 h-8 text-[#E5B83C] animate-spin mx-auto mb-3" />
        <p className="text-sm text-[#FEF3DF]/50">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delivery Fee Card */}
      <div className="bg-white/4 border border-white/8 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#E5B83C]/10 border border-[#E5B83C]/30 rounded-lg flex items-center justify-center">
            <Truck className="w-5 h-5 text-[#E5B83C]" />
          </div>
          <div>
            <h3 className="font-['Cormorant_Garamond'] text-lg text-[#FEF3DF]">Delivery Fees</h3>
            <p className="text-[0.6rem] text-[#FEF3DF]/40 tracking-wider uppercase">Set delivery rates</p>
          </div>
        </div>
        <div className="space-y-3">
          {/* Stanger Fee */}
          <div className="flex items-center gap-3">
            <span className="text-[#FEF3DF]/60 text-xs font-bold min-w-[80px]">Stanger</span>
            <span className="text-[#FEF3DF]/60 text-sm font-bold">R</span>
            <input
              type="text"
              inputMode="numeric"
              value={deliveryFeeInput}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d+$/.test(val)) setDeliveryFeeInput(val);
              }}
              className="flex-1 bg-white/8 border border-[#E5B83C]/30 rounded-xl px-4 py-3 text-[#FEF3DF] text-lg font-['Bebas_Neue'] tracking-wider focus:outline-none focus:border-[#E5B83C] transition-all"
            />
          </div>
          {/* Nationwide Fee */}
          <div className="flex items-center gap-3">
            <span className="text-[#FEF3DF]/60 text-xs font-bold min-w-[80px]">Nationwide</span>
            <span className="text-[#FEF3DF]/60 text-sm font-bold">R</span>
            <input
              type="text"
              inputMode="numeric"
              value={nationwideFeeInput}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d+$/.test(val)) setNationwideFeeInput(val);
              }}
              className="flex-1 bg-white/8 border border-[#E5B83C]/30 rounded-xl px-4 py-3 text-[#FEF3DF] text-lg font-['Bebas_Neue'] tracking-wider focus:outline-none focus:border-[#E5B83C] transition-all"
            />
          </div>
        </div>
      </div>

      {/* Note about product prices */}
      <div className="bg-[#E5B83C]/8 border border-[#E5B83C]/25 rounded-xl p-4 flex items-start gap-3">
        <Tag className="w-4 h-4 text-[#E5B83C] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#FEF3DF]/70 leading-relaxed">
          Product prices, names, images, and badges are now managed in the
          <strong className="text-[#E5B83C]"> Products</strong> tab. Add new products, edit pricing,
          or hide out-of-stock items from there.
        </p>
      </div>

      {/* Save Button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-3.5 font-bold tracking-[0.1em] uppercase cursor-pointer transition-all rounded-xl text-sm flex items-center justify-center gap-2 ${
          saving
            ? "bg-[#E5B83C]/50 text-[#0A0301]/70 cursor-not-allowed"
            : "bg-[#E5B83C] text-[#0A0301] hover:bg-[#E5B83C]/90"
        }`}
      >
        {saving ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> SAVING...</>
        ) : (
          <><Save className="w-4 h-4" /> SAVE DELIVERY FEES</>
        )}
      </motion.button>
    </div>
  );
}

// ============================================
// PRODUCTS PANEL — full CRUD for the product catalog
// ============================================
interface AdminProduct extends Product {
  is_active: boolean;
  sort_order: number;
}

function ProductsPanel() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      // Fetch ALL products (active + inactive) — admin needs to see hidden ones too.
      // The /api/products endpoint accepts ?include_inactive=1 to return hidden rows.
      // (RLS allows public SELECT; admin auth is enforced on POST/PATCH/DELETE only.)
      const res = await fetch("/api/products?include_inactive=1");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      } else {
        // Fallback: just use what the public endpoint returns (active only)
        const fallbackRes = await fetch("/api/products");
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          setProducts(data.products || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSaveProduct = async (product: AdminProduct) => {
    try {
      const url = isCreating ? "/api/products" : `/api/products/${product.id}`;
      const method = isCreating ? "POST" : "PATCH";
      const body = isCreating
        ? {
            name: product.name,
            weight: product.weight,
            grams: product.grams,
            price: product.price,
            description: product.description,
            img: product.img,
            badge: product.badge || null,
            is_active: product.is_active,
            sort_order: product.sort_order,
          }
        : {
            name: product.name,
            weight: product.weight,
            grams: product.grams,
            price: product.price,
            description: product.description,
            img: product.img,
            badge: product.badge || null,
            is_active: product.is_active,
            sort_order: product.sort_order,
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(isCreating ? "Product created!" : "Product updated!", { icon: "✅" });
        setEditingProduct(null);
        setIsCreating(false);
        fetchProducts();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to save product");
      }
    } catch {
      toast.error("Failed to save product");
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Delete this product? This cannot be undone. Consider hiding it instead (toggle Active off).")) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Product deleted", { icon: "🗑️" });
        fetchProducts();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete product");
      }
    } catch {
      toast.error("Failed to delete product");
    }
  };

  const handleToggleActive = async (product: AdminProduct) => {
    // Quick toggle without opening the editor
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_active: !product.is_active }),
      });
      if (res.ok) {
        toast.success(product.is_active ? "Product hidden" : "Product visible", { icon: "✅" });
        fetchProducts();
      } else {
        toast.error("Failed to toggle product");
      }
    } catch {
      toast.error("Failed to toggle product");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <Loader2 className="w-8 h-8 text-[#E5B83C] animate-spin mx-auto mb-3" />
        <p className="text-sm text-[#FEF3DF]/50">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#E5B83C]/10 border border-[#E5B83C]/30 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-[#E5B83C]" />
          </div>
          <div>
            <h3 className="font-['Cormorant_Garamond'] text-lg text-[#FEF3DF]">Product Catalog</h3>
            <p className="text-[0.6rem] text-[#FEF3DF]/40 tracking-wider uppercase">Add, edit, hide, or delete products</p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            setEditingProduct({
              id: 0,
              name: "",
              weight: "",
              grams: 0,
              price: 0,
              description: "",
              img: "",
              badge: null,
              is_active: true,
              sort_order: products.length,
            });
            setIsCreating(true);
          }}
          className="bg-[#1DB954] text-white px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase cursor-pointer hover:bg-[#1DB954]/90 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" /> ADD PRODUCT
        </motion.button>
      </div>

      {/* Product list */}
      {products.length === 0 ? (
        <div className="text-center py-16 bg-white/4 border border-white/8 rounded-xl">
          <Package className="w-12 h-12 text-[#FEF3DF]/15 mx-auto mb-3" />
          <p className="text-[#FEF3DF]/40 text-sm">No products yet</p>
          <p className="text-[#FEF3DF]/25 text-xs mt-1">Click ADD PRODUCT to create your first one</p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <div
              key={product.id}
              className={`bg-white/4 border rounded-xl p-4 flex items-center gap-4 ${
                product.is_active ? "border-white/8" : "border-[#B23A1A]/30 opacity-60"
              }`}
            >
              {/* Image */}
              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center">
                {product.img ? (
                  <img src={product.img} alt={product.name} className="w-full h-full object-cover brightness-[0.85]" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-[#FEF3DF]/30" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-['Cormorant_Garamond'] text-base font-bold text-[#FEF3DF] truncate">
                    {product.name}
                  </p>
                  {product.badge && (
                    <span className="bg-[#E5B83C]/15 text-[#E5B83C] text-[0.55rem] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase flex items-center gap-1">
                      <Star className="w-2.5 h-2.5" /> {product.badge}
                    </span>
                  )}
                  {!product.is_active && (
                    <span className="bg-[#B23A1A]/15 text-[#B23A1A] text-[0.55rem] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase">
                      HIDDEN
                    </span>
                  )}
                </div>
                <p className="text-[0.65rem] text-[#FEF3DF]/40 mt-0.5">
                  {product.weight} · {product.grams}g · R{(product.grams > 0 ? product.price / product.grams : 0).toFixed(2)}/g
                </p>
                {product.description && (
                  <p className="text-[0.65rem] text-[#FEF3DF]/30 mt-0.5 truncate">{product.description}</p>
                )}
              </div>

              {/* Price */}
              <div className="flex-shrink-0 text-right">
                <p className="font-['Bebas_Neue'] text-2xl text-[#E5B83C]">R{product.price}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggleActive(product)}
                  title={product.is_active ? "Hide from storefront" : "Show on storefront"}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-[#FEF3DF]/60 hover:text-[#E5B83C] flex items-center justify-center cursor-pointer transition-all"
                >
                  {product.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    setEditingProduct(product);
                    setIsCreating(false);
                  }}
                  title="Edit"
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-[#FEF3DF]/60 hover:text-[#E5B83C] flex items-center justify-center cursor-pointer transition-all"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  title="Delete"
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-[#B23A1A]/20 text-[#FEF3DF]/60 hover:text-[#B23A1A] flex items-center justify-center cursor-pointer transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      <AnimatePresence>
        {editingProduct && (
          <ProductEditor
            product={editingProduct}
            isCreating={isCreating}
            onSave={handleSaveProduct}
            onCancel={() => {
              setEditingProduct(null);
              setIsCreating(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// PRODUCT EDITOR MODAL
// ============================================
function ProductEditor({
  product,
  isCreating,
  onSave,
  onCancel,
}: {
  product: AdminProduct;
  isCreating: boolean;
  onSave: (p: AdminProduct) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<AdminProduct>(product);
  const [saving, setSaving] = useState(false);

  const update = (field: keyof AdminProduct, value: string | number | boolean | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.weight.trim()) { toast.error("Weight is required (e.g. '150g')"); return; }
    if (form.price < 0) { toast.error("Price cannot be negative"); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0C0502] border border-[#E5B83C]/30 rounded-2xl p-6 w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-['Cormorant_Garamond'] text-2xl text-[#E5B83C] font-bold">
            {isCreating ? "Add Product" : "Edit Product"}
          </h3>
          <button onClick={onCancel} className="text-[#FEF3DF]/60 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[0.6rem] text-[#FEF3DF]/40 tracking-wider uppercase mb-1.5">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Snack Pack"
              className="w-full bg-white/8 border border-[#E5B83C]/30 rounded-xl px-4 py-2.5 text-[#FEF3DF] text-sm focus:outline-none focus:border-[#E5B83C] transition-all"
            />
          </div>

          {/* Weight + Grams */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.6rem] text-[#FEF3DF]/40 tracking-wider uppercase mb-1.5">Weight (display) *</label>
              <input
                type="text"
                value={form.weight}
                onChange={(e) => update("weight", e.target.value)}
                placeholder="e.g. 150g"
                className="w-full bg-white/8 border border-[#E5B83C]/30 rounded-xl px-4 py-2.5 text-[#FEF3DF] text-sm focus:outline-none focus:border-[#E5B83C] transition-all"
              />
            </div>
            <div>
              <label className="block text-[0.6rem] text-[#FEF3DF]/40 tracking-wider uppercase mb-1.5">Grams (for price/g)</label>
              <input
                type="number"
                inputMode="numeric"
                value={form.grams}
                onChange={(e) => update("grams", parseInt(e.target.value, 10) || 0)}
                placeholder="150"
                className="w-full bg-white/8 border border-[#E5B83C]/30 rounded-xl px-4 py-2.5 text-[#FEF3DF] text-sm focus:outline-none focus:border-[#E5B83C] transition-all"
              />
            </div>
          </div>

          {/* Price + Sort order */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.6rem] text-[#FEF3DF]/40 tracking-wider uppercase mb-1.5">Price (R) *</label>
              <div className="flex items-center gap-2 bg-white/8 border border-[#E5B83C]/30 rounded-xl px-4 py-2.5 focus-within:border-[#E5B83C] transition-all">
                <span className="text-[#FEF3DF]/60 text-sm font-bold">R</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.price}
                  onChange={(e) => update("price", parseInt(e.target.value, 10) || 0)}
                  placeholder="100"
                  className="flex-1 bg-transparent text-[#FEF3DF] text-sm focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[0.6rem] text-[#FEF3DF]/40 tracking-wider uppercase mb-1.5">Sort Order</label>
              <input
                type="number"
                inputMode="numeric"
                value={form.sort_order}
                onChange={(e) => update("sort_order", parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full bg-white/8 border border-[#E5B83C]/30 rounded-xl px-4 py-2.5 text-[#FEF3DF] text-sm focus:outline-none focus:border-[#E5B83C] transition-all"
              />
              <p className="text-[0.55rem] text-[#FEF3DF]/30 mt-1">Lower = shows first</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[0.6rem] text-[#FEF3DF]/40 tracking-wider uppercase mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Short, appetizing description"
              rows={2}
              className="w-full bg-white/8 border border-[#E5B83C]/30 rounded-xl px-4 py-2.5 text-[#FEF3DF] text-sm focus:outline-none focus:border-[#E5B83C] transition-all resize-none"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-[0.6rem] text-[#FEF3DF]/40 tracking-wider uppercase mb-1.5">Image URL</label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center border border-white/10">
                {form.img ? (
                  <img src={form.img} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-[#FEF3DF]/30" />
                )}
              </div>
              <input
                type="text"
                value={form.img}
                onChange={(e) => update("img", e.target.value)}
                placeholder="/images/your-pic.jpg or https://..."
                className="flex-1 bg-white/8 border border-[#E5B83C]/30 rounded-xl px-4 py-2.5 text-[#FEF3DF] text-sm focus:outline-none focus:border-[#E5B83C] transition-all"
              />
            </div>
            <p className="text-[0.55rem] text-[#FEF3DF]/30 mt-1">
              Use a local path (e.g. /images/foo.jpg) or any image URL. Leave blank for placeholder.
            </p>
          </div>

          {/* Badge */}
          <div>
            <label className="block text-[0.6rem] text-[#FEF3DF]/40 tracking-wider uppercase mb-1.5">Badge</label>
            <div className="flex gap-2 flex-wrap">
              {[null, "Popular", "Best Value"].map((b) => (
                <button
                  key={b ?? "none"}
                  type="button"
                  onClick={() => update("badge", b)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase cursor-pointer transition-all ${
                    form.badge === b
                      ? "bg-[#E5B83C] text-[#0A0301]"
                      : "bg-white/5 text-[#FEF3DF]/60 hover:bg-white/10"
                  }`}
                >
                  {b ?? "None"}
                </button>
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between bg-white/4 border border-white/8 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm text-[#FEF3DF] font-bold">Visible on storefront</p>
              <p className="text-[0.6rem] text-[#FEF3DF]/40">Hide out-of-stock items without deleting</p>
            </div>
            <button
              type="button"
              onClick={() => update("is_active", !form.is_active)}
              className={`w-12 h-6 rounded-full p-0.5 cursor-pointer transition-all ${
                form.is_active ? "bg-[#2E7D32]" : "bg-white/10"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  form.is_active ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-xs font-bold tracking-wider uppercase bg-white/5 text-[#FEF3DF]/60 hover:bg-white/10 cursor-pointer transition-all"
          >
            CANCEL
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={saving}
            className={`flex-1 py-3 rounded-xl text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all ${
              saving
                ? "bg-[#E5B83C]/50 text-[#0A0301]/70 cursor-not-allowed"
                : "bg-[#E5B83C] text-[#0A0301] hover:bg-[#E5B83C]/90 cursor-pointer"
            }`}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> SAVING...</>
            ) : (
              <><Save className="w-4 h-4" /> {isCreating ? "CREATE" : "SAVE CHANGES"}</>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// DASHBOARD
// ============================================
type DashboardTab = "orders" | "products" | "deals" | "settings";

// ============================================
// DEALS PANEL
// ============================================
interface AdminDeal extends Deal {
  is_active: boolean;
  sort_order: number;
}

function DealsPanel() {
  const [deals, setDeals] = useState<AdminDeal[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDeal, setEditingDeal] = useState<AdminDeal | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch("/api/deals?include_inactive=1");
      if (res.ok) {
        const data = await res.json();
        setDeals(data.deals || []);
      }
    } catch (err) {
      console.error("Failed to fetch deals:", err);
      toast.error("Failed to load deals");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch products so the deal editor can offer a product picker
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products?include_inactive=1");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch {
      // non-critical — editor falls back to free-text entry
    }
  }, []);

  useEffect(() => {
    fetchDeals();
    fetchProducts();
  }, [fetchDeals, fetchProducts]);

  const handleSaveDeal = async (deal: AdminDeal) => {
    try {
      const url = isCreating ? "/api/deals" : `/api/deals/${deal.id}`;
      const method = isCreating ? "POST" : "PATCH";
      const body = {
        name: deal.name,
        description: deal.description,
        items: deal.items,
        price: deal.price,
        original_price: deal.original_price,
        savings: deal.savings,
        img: deal.img,
        badge: deal.badge || null,
        is_active: deal.is_active,
        sort_order: deal.sort_order,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(isCreating ? "Deal created!" : "Deal updated!", { icon: "✅" });
        setEditingDeal(null);
        setIsCreating(false);
        fetchDeals();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to save deal");
      }
    } catch {
      toast.error("Failed to save deal");
    }
  };

  const handleDeleteDeal = async (id: number) => {
    if (!confirm("Delete this deal? This cannot be undone. Consider hiding it instead (toggle Active off).")) return;
    try {
      const res = await fetch(`/api/deals/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Deal deleted", { icon: "🗑️" });
        fetchDeals();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete deal");
      }
    } catch {
      toast.error("Failed to delete deal");
    }
  };

  const handleToggleActive = async (deal: AdminDeal) => {
    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_active: !deal.is_active }),
      });
      if (res.ok) {
        toast.success(deal.is_active ? "Deal hidden" : "Deal visible", { icon: "✅" });
        fetchDeals();
      } else {
        toast.error("Failed to toggle deal");
      }
    } catch {
      toast.error("Failed to toggle deal");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <Loader2 className="w-8 h-8 text-[#E5B83C] animate-spin mx-auto mb-3" />
        <p className="text-sm text-[#FEF3DF]/50">Loading deals...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#E07A2C]/10 border border-[#E07A2C]/30 rounded-lg flex items-center justify-center">
            <Tag className="w-5 h-5 text-[#E07A2C]" />
          </div>
          <div>
            <h3 className="font-['Cormorant_Garamond'] text-lg text-[#FEF3DF]">Bundle Deals</h3>
            <p className="text-[0.6rem] text-[#FEF3DF]/40 tracking-wider uppercase">Mix &amp; match products into savings bundles</p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            setEditingDeal({
              id: 0,
              name: "",
              description: "",
              items: [],
              price: 0,
              original_price: 0,
              savings: 0,
              img: "",
              badge: null,
              is_active: true,
              sort_order: deals.length,
            });
            setIsCreating(true);
          }}
          className="bg-[#1DB954] text-white px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase cursor-pointer hover:bg-[#1DB954]/90 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" /> ADD DEAL
        </motion.button>
      </div>

      {/* Deal list */}
      {deals.length === 0 ? (
        <div className="text-center py-16 bg-white/4 border border-white/8 rounded-xl">
          <Tag className="w-12 h-12 text-[#FEF3DF]/15 mx-auto mb-3" />
          <p className="text-[#FEF3DF]/40 text-sm">No deals yet</p>
          <p className="text-[#FEF3DF]/25 text-xs mt-1">Click ADD DEAL to create your first bundle</p>
        </div>
      ) : (
        <div className="space-y-2">
          {deals.map((deal) => (
            <div
              key={deal.id}
              className={`bg-white/4 border rounded-xl p-4 flex items-center gap-4 ${
                deal.is_active ? "border-white/8" : "border-[#B23A1A]/30 opacity-60"
              }`}
            >
              {/* Image */}
              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center">
                {deal.img ? (
                  <img src={deal.img} alt={deal.name} className="w-full h-full object-cover brightness-[0.85]" />
                ) : (
                  <Tag className="w-5 h-5 text-[#FEF3DF]/30" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-['Cormorant_Garamond'] text-base font-bold text-[#FEF3DF] truncate">
                    {deal.name}
                  </p>
                  {deal.savings > 0 && (
                    <span className="bg-[#E07A2C]/15 text-[#E07A2C] text-[0.55rem] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" /> SAVE R{deal.savings}
                    </span>
                  )}
                  {!deal.is_active && (
                    <span className="bg-[#B23A1A]/15 text-[#B23A1A] text-[0.55rem] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase">
                      HIDDEN
                    </span>
                  )}
                </div>
                <p className="text-[0.65rem] text-[#FEF3DF]/40 mt-0.5 truncate">
                  {deal.items.map((it) => `${it.quantity} × ${it.product_name}`).join(" + ")}
                </p>
                {deal.description && (
                  <p className="text-[0.65rem] text-[#FEF3DF]/30 mt-0.5 truncate">{deal.description}</p>
                )}
              </div>

              {/* Price */}
              <div className="flex-shrink-0 text-right">
                <p className="font-['Bebas_Neue'] text-2xl text-[#E07A2C]">R{deal.price}</p>
                {deal.original_price > deal.price && (
                  <p className="text-[0.6rem] text-[#FEF3DF]/30 line-through">R{deal.original_price}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggleActive(deal)}
                  title={deal.is_active ? "Hide from storefront" : "Show on storefront"}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-[#FEF3DF]/60 hover:text-[#E07A2C] flex items-center justify-center cursor-pointer transition-all"
                >
                  {deal.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    setEditingDeal(deal);
                    setIsCreating(false);
                  }}
                  title="Edit"
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-[#FEF3DF]/60 hover:text-[#E07A2C] flex items-center justify-center cursor-pointer transition-all"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteDeal(deal.id)}
                  title="Delete"
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-[#B23A1A]/20 text-[#FEF3DF]/60 hover:text-[#B23A1A] flex items-center justify-center cursor-pointer transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      <AnimatePresence>
        {editingDeal && (
          <DealEditor
            deal={editingDeal}
            products={products}
            isCreating={isCreating}
            onSave={handleSaveDeal}
            onCancel={() => {
              setEditingDeal(null);
              setIsCreating(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// DEAL EDITOR MODAL
// ============================================
function DealEditor({
  deal,
  products,
  isCreating,
  onSave,
  onCancel,
}: {
  deal: AdminDeal;
  products: Product[];
  isCreating: boolean;
  onSave: (d: AdminDeal) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<AdminDeal>(deal);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof AdminDeal>(field: K, value: AdminDeal[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Add a product to the deal items list — either from the product picker
  // (if products are loaded) or as a blank row the admin fills in manually.
  const addDealItem = () => {
    const firstProduct = products[0];
    const newItem: DealItem = firstProduct
      ? { product_id: firstProduct.id, product_name: firstProduct.name, quantity: 1, weight: firstProduct.weight, img: firstProduct.img }
      : { product_id: 0, product_name: "", quantity: 1, weight: "", img: "" };
    update("items", [...form.items, newItem]);
  };

  const updateDealItem = (index: number, patch: Partial<DealItem>) => {
    const next = form.items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    update("items", next);
  };

  // When the admin picks a product from the dropdown, auto-fill name/weight/img
  // from the product record so the deal stays in sync if product details change.
  const pickProduct = (index: number, productId: number) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      updateDealItem(index, {
        product_id: product.id,
        product_name: product.name,
        weight: product.weight,
        img: product.img,
      });
    } else {
      updateDealItem(index, { product_id: productId });
    }
  };

  const removeDealItem = (index: number) => {
    update("items", form.items.filter((_, i) => i !== index));
  };

  // Recompute original_price from live product prices + current items.
  // Savings is derived as original_price - deal price.
  const recomputeOriginal = () => {
    let sum = 0;
    for (const it of form.items) {
      const product = products.find((p) => p.id === it.product_id || p.name === it.product_name);
      const unit = product?.price ?? 0;
      sum += unit * it.quantity;
    }
    const next = { ...form, original_price: sum, savings: Math.max(0, sum - form.price) };
    setForm(next);
    toast.success(`Recomputed: original R${sum}, save R${next.savings}`, { icon: "🧮" });
  };

  // When the admin edits the deal price, auto-update savings (if original_price is set)
  const handlePriceChange = (price: number) => {
    const savings = Math.max(0, form.original_price - price);
    setForm((prev) => ({ ...prev, price, savings }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (form.items.length === 0) { toast.error("Add at least one item to the bundle"); return; }
    for (const it of form.items) {
      if (!it.product_name.trim()) { toast.error("Every item needs a product name"); return; }
      if (it.quantity < 1) { toast.error("Every item needs quantity ≥ 1"); return; }
    }
    if (form.price < 0) { toast.error("Price cannot be negative"); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0C0502] border border-[#E07A2C]/30 rounded-2xl p-6 w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-['Cormorant_Garamond'] text-2xl text-[#E07A2C] font-bold">
            {isCreating ? "Add Deal" : "Edit Deal"}
          </h3>
          <button onClick={onCancel} className="text-[#FEF3DF]/60 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[0.6rem] text-[#FEF3DF]/40 tracking-wider uppercase mb-1.5">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Triple Taster Saver"
              className="w-full bg-white/8 border border-[#E07A2C]/30 rounded-xl px-4 py-2.5 text-[#FEF3DF] text-sm focus:outline-none focus:border-[#E07A2C] transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[0.6rem] text-[#FEF3DF]/40 tracking-wider uppercase mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Short, appetizing description shown on the deal card"
              rows={2}
              className="w-full bg-white/8 border border-[#E07A2C]/30 rounded-xl px-4 py-2.5 text-[#FEF3DF] text-sm focus:outline-none focus:border-[#E07A2C] transition-all resize-none"
            />
          </div>

          {/* Items builder */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[0.6rem] text-[#FEF3DF]/40 tracking-wider uppercase">Bundle Items *</label>
              <button
                type="button"
                onClick={recomputeOriginal}
                className="text-[0.55rem] text-[#E07A2C] hover:text-[#F8E5B0] cursor-pointer tracking-wider uppercase flex items-center gap-1"
              >
                <DollarSign className="w-3 h-3" /> Recompute prices
              </button>
            </div>
            <div className="space-y-2">
              {form.items.length === 0 && (
                <p className="text-[0.65rem] text-[#FEF3DF]/30 text-center py-3 bg-white/4 rounded-xl border border-dashed border-white/10">
                  No items yet. Click ADD ITEM below.
                </p>
              )}
              {form.items.map((item, i) => (
                <div key={i} className="bg-white/4 border border-white/8 rounded-xl p-2.5 flex items-center gap-2">
                  {/* Product picker */}
                  <div className="flex-1 min-w-0">
                    {products.length > 0 ? (
                      <select
                        value={item.product_id || 0}
                        onChange={(e) => pickProduct(i, parseInt(e.target.value, 10))}
                        className="w-full bg-white/8 border border-white/10 rounded-lg px-2 py-1.5 text-[#FEF3DF] text-xs focus:outline-none focus:border-[#E07A2C] transition-all"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id} className="bg-[#0C0502]">
                            {p.name} ({p.weight}) — R{p.price}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={item.product_name}
                        onChange={(e) => updateDealItem(i, { product_name: e.target.value, product_id: 0 })}
                        placeholder="Product name"
                        className="w-full bg-white/8 border border-white/10 rounded-lg px-2 py-1.5 text-[#FEF3DF] text-xs focus:outline-none focus:border-[#E07A2C] transition-all"
                      />
                    )}
                  </div>
                  {/* Quantity */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[0.6rem] text-[#FEF3DF]/40">×</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateDealItem(i, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className="w-12 bg-white/8 border border-white/10 rounded-lg px-2 py-1.5 text-[#FEF3DF] text-xs text-center focus:outline-none focus:border-[#E07A2C] transition-all"
                    />
                  </div>
                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeDealItem(i)}
                    title="Remove item"
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-[#B23A1A]/20 text-[#FEF3DF]/50 hover:text-[#B23A1A] flex items-center justify-center cursor-pointer transition-all flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addDealItem}
              className="mt-2 w-full py-2 rounded-xl text-[0.65rem] font-bold tracking-wider uppercase bg-white/5 text-[#FEF3DF]/70 hover:bg-white/10 cursor-pointer transition-all flex items-center justify-center gap-1.5 border border-dashed border-white/10"
            >
              <Plus className="w-3.5 h-3.5" /> ADD ITEM
            </button>
          </div>

          {/* Price + Original price + Savings */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[0.6rem] text-[#FEF3DF]/40 tracking-wider uppercase mb-1.5">Deal Price (R) *</label>
              <div className="flex items-center gap-1 bg-white/8 border border-[#E07A2C]/30 rounded-xl px-3 py-2.5 focus-within:border-[#E07A2C] transition-all">
                <span className="text-[#FEF3DF]/60 text-xs font-bold">R</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.price}
                  onChange={(e) => handlePriceChange(parseInt(e.target.value, 10) || 0)}
                  placeholder="139"
                  className="flex-1 bg-transparent text-[#FEF3DF] text-sm focus:outline-none min-w-0"
                />
              </div>
            </div>
            <div>
              <label className="block text-[0.6rem] text-[#FEF3DF]/40 tracking-wider uppercase mb-1.5">Original (R)</label>
              <div className="flex items-center gap-1 bg-white/8 border border-white/10 rounded-xl px-3 py-2.5">
                <span className="text-[#FEF3DF]/60 text-xs font-bold">R</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.original_price}
                  onChange={(e) => {
                    const original = parseInt(e.target.value, 10) || 0;
                    setForm((prev) => ({ ...prev, original_price: original, savings: Math.max(0, original - prev.price) }));
                  }}
                  placeholder="147"
                  className="flex-1 bg-transparent text-[#FEF3DF] text-sm focus:outline-none min-w-0"
                />
              </div>
            </div>
            <div>
              <label className="block text-[0.6rem] text-[#FEF3DF]/40 tracking-wider uppercase mb-1.5">Save (R)</label>
              <div className="flex items-center gap-1 bg-[#E07A2C]/10 border border-[#E07A2C]/30 rounded-xl px-3 py-2.5">
                <span className="text-[#E07A2C] text-xs font-bold">R</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.savings}
                  readOnly
                  className="flex-1 bg-transparent text-[#E07A2C] text-sm focus:outline-none min-w-0 font-bold"
                />
              </div>
            </div>
          </div>
          <p className="text-[0.55rem] text-[#FEF3DF]/30 -mt-2">
            "Original" = sum of individual product prices. "Save" = Original − Deal Price. Click "Recompute prices" to auto-fill from live product prices.
          </p>

          {/* Image URL */}
          <div>
            <label className="block text-[0.6rem] text-[#FEF3DF]/40 tracking-wider uppercase mb-1.5">Image URL</label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center border border-white/10">
                {form.img ? (
                  <img src={form.img} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-[#FEF3DF]/30" />
                )}
              </div>
              <input
                type="text"
                value={form.img}
                onChange={(e) => update("img", e.target.value)}
                placeholder="/images/your-pic.jpg or https://..."
                className="flex-1 bg-white/8 border border-[#E07A2C]/30 rounded-xl px-4 py-2.5 text-[#FEF3DF] text-sm focus:outline-none focus:border-[#E07A2C] transition-all"
              />
            </div>
          </div>

          {/* Badge */}
          <div>
            <label className="block text-[0.6rem] text-[#FEF3DF]/40 tracking-wider uppercase mb-1.5">Badge (optional)</label>
            <input
              type="text"
              value={form.badge ?? ""}
              onChange={(e) => update("badge", e.target.value || null)}
              placeholder='e.g. "Save R8" or "Best Deal" — shows on the card'
              className="w-full bg-white/8 border border-[#E07A2C]/30 rounded-xl px-4 py-2.5 text-[#FEF3DF] text-sm focus:outline-none focus:border-[#E07A2C] transition-all"
            />
          </div>

          {/* Sort order + Active toggle */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.6rem] text-[#FEF3DF]/40 tracking-wider uppercase mb-1.5">Sort Order</label>
              <input
                type="number"
                inputMode="numeric"
                value={form.sort_order}
                onChange={(e) => update("sort_order", parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full bg-white/8 border border-[#E07A2C]/30 rounded-xl px-4 py-2.5 text-[#FEF3DF] text-sm focus:outline-none focus:border-[#E07A2C] transition-all"
              />
              <p className="text-[0.55rem] text-[#FEF3DF]/30 mt-1">Lower = shows first</p>
            </div>
            <div>
              <label className="block text-[0.6rem] text-[#FEF3DF]/40 tracking-wider uppercase mb-1.5">Visible</label>
              <button
                type="button"
                onClick={() => update("is_active", !form.is_active)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase cursor-pointer transition-all flex items-center justify-center gap-2 ${
                  form.is_active ? "bg-[#2E7D32]/20 text-[#5EBA62] border border-[#2E7D32]/40" : "bg-white/5 text-[#FEF3DF]/40 border border-white/10"
                }`}
              >
                {form.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {form.is_active ? "VISIBLE" : "HIDDEN"}
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-xs font-bold tracking-wider uppercase bg-white/5 text-[#FEF3DF]/60 hover:bg-white/10 cursor-pointer transition-all"
          >
            CANCEL
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={saving}
            className={`flex-1 py-3 rounded-xl text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all ${
              saving
                ? "bg-[#E07A2C]/50 text-[#0A0301]/70 cursor-not-allowed"
                : "bg-[#E07A2C] text-white hover:bg-[#E07A2C]/90 cursor-pointer"
            }`}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> SAVING...</>
            ) : (
              <><Save className="w-4 h-4" /> {isCreating ? "CREATE" : "SAVE CHANGES"}</>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("orders");

  const fetchOrders = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        credentials: "include",
      });

      if (res.status === 401) {
        onLogout();
        return;
      }

      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, searchQuery, onLogout]);

  useEffect(() => {
    fetchOrders();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchOrders(), 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId: string, orderStatus: string, paymentStatus?: string) => {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId, orderStatus, paymentStatus }),
      });

      if (res.ok) {
        toast.success(`Order ${orderId} updated!`, { icon: "✅" });
        fetchOrders();
      } else {
        toast.error("Failed to update order");
      }
    } catch {
      toast.error("Failed to update order");
    }
  };

  const handleDelete = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/orders?orderId=${orderId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast.success(`Order ${orderId} deleted`, { icon: "🗑️" });
        fetchOrders();
      } else {
        toast.error("Failed to delete order");
      }
    } catch {
      toast.error("Failed to delete order");
    }
  };

  const filterCounts = {
    all: orders.length,
    new: orders.filter((o) => o.order_status === "new").length,
    payment_initiated: orders.filter((o) => o.order_status === "payment_initiated").length,
    confirmed: orders.filter((o) => o.order_status === "confirmed").length,
    fulfilled: orders.filter((o) => o.order_status === "fulfilled").length,
    payment_failed: orders.filter((o) => o.order_status === "payment_failed").length,
  };

  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0301] via-[#1A0A04] to-[#0A0301]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A0301]/90 backdrop-blur-xl border-b border-[#E5B83C]/20 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-['Cormorant_Garamond'] text-xl text-[#E5B83C]">Biltong & Bytes</h1>
            <p className="text-[0.55rem] text-[#FEF3DF]/40 tracking-wider uppercase">Admin Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchOrders(true)}
              className="p-2 bg-white/5 rounded-lg text-[#FEF3DF]/60 hover:text-[#E5B83C] cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs cursor-pointer hover:bg-red-500/20 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase cursor-pointer transition-all ${
              activeTab === "orders"
                ? "bg-[#E5B83C] text-[#0A0301]"
                : "text-[#FEF3DF]/60 hover:text-[#FEF3DF] hover:bg-white/5"
            }`}
          >
            <ClipboardList className="w-4 h-4" /> Orders
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase cursor-pointer transition-all ${
              activeTab === "products"
                ? "bg-[#E5B83C] text-[#0A0301]"
                : "text-[#FEF3DF]/60 hover:text-[#FEF3DF] hover:bg-white/5"
            }`}
          >
            <Package className="w-4 h-4" /> Products
          </button>
          <button
            onClick={() => setActiveTab("deals")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase cursor-pointer transition-all ${
              activeTab === "deals"
                ? "bg-[#E5B83C] text-[#0A0301]"
                : "text-[#FEF3DF]/60 hover:text-[#FEF3DF] hover:bg-white/5"
            }`}
          >
            <Tag className="w-4 h-4" /> Deals
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase cursor-pointer transition-all ${
              activeTab === "settings"
                ? "bg-[#E5B83C] text-[#0A0301]"
                : "text-[#FEF3DF]/60 hover:text-[#FEF3DF] hover:bg-white/5"
            }`}
          >
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        <AnimatePresence mode="wait">
          {activeTab === "settings" ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <SettingsPanel />
            </motion.div>
          ) : activeTab === "products" ? (
            <motion.div
              key="products"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ProductsPanel />
            </motion.div>
          ) : activeTab === "deals" ? (
            <motion.div
              key="deals"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <DealsPanel />
            </motion.div>
          ) : (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Stats */}
              <StatsCards orders={orders} />

              {/* Filters */}
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-[#FEF3DF]/30 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search orders by ID, name, or phone..."
                    className="w-full bg-white/6 border border-[#E5B83C]/20 rounded-xl pl-10 pr-4 py-2.5 text-[#FEF3DF] text-sm placeholder:text-[#FEF3DF]/25 focus:outline-none focus:border-[#E5B83C] transition-all"
                  />
                </div>

                {/* Status Tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                  {(["all", "new", "payment_initiated", "confirmed", "fulfilled", "payment_failed"] as StatusFilter[]).map(
                    (status) => {
                      const conf = STATUS_CONFIG[status];
                      const count = filterCounts[status] || 0;
                      const isActive = statusFilter === status;
                      return (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                            isActive
                              ? status === "all"
                                ? "bg-[#E5B83C] text-[#0A0301]"
                                : `${conf.bg} ${conf.color} border`
                              : "bg-white/5 text-[#FEF3DF]/50 hover:bg-white/10"
                          }`}
                        >
                          {conf && <conf.icon className="w-3 h-3" />}
                          {status === "all" ? "All" : conf?.label}
                          <span className={`text-[0.6rem] ${isActive ? "opacity-80" : "opacity-50"}`}>({count})</span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Orders List */}
              {loading ? (
                <div className="text-center py-20">
                  <Loader2 className="w-8 h-8 text-[#E5B83C] animate-spin mx-auto mb-3" />
                  <p className="text-sm text-[#FEF3DF]/50">Loading orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-20">
                  <Package className="w-12 h-12 text-[#FEF3DF]/15 mx-auto mb-3" />
                  <p className="text-[#FEF3DF]/40 text-sm">No orders found</p>
                  <p className="text-[#FEF3DF]/25 text-xs mt-1">
                    {statusFilter !== "all" || searchQuery
                      ? "Try changing your filters"
                      : "Orders will appear here when customers place them"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[0.6rem] text-[#FEF3DF]/30 tracking-wider uppercase">
                    {orders.length} order{orders.length !== 1 ? "s" : ""} · Auto-refreshes every 30s
                  </p>
                  <AnimatePresence mode="popLayout">
                    {orders.map((order) => (
                      <OrderRow
                        key={order.order_id}
                        order={order}
                        onUpdateStatus={handleUpdateStatus}
                        onDelete={handleDelete}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================
export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // On mount, check if we have a valid session cookie
  useEffect(() => {
    if (!mounted) return;
    checkAuth().then((valid) => {
      setIsAuthenticated(valid);
      setChecking(false);
    });
  }, [mounted]);

  if (!mounted || checking) {
    return (
      <div className="min-h-screen bg-[#0A0301] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#E5B83C] animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return <Dashboard onLogout={() => setIsAuthenticated(false)} />;
}
