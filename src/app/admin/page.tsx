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
  ArrowRight,
  LogOut,
  TrendingUp,
  ShoppingBag,
  CircleDollarSign,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// ============================================
// TYPES
// ============================================
interface OrderItem {
  name: string;
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
// ADMIN PASSWORD
// ============================================
const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "Yumna@786";

// ============================================
// LOGIN SCREEN
// ============================================
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASS) {
      sessionStorage.setItem("bb_admin_auth", "true");
      onLogin();
    } else {
      setError("Wrong password. Try again.");
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
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
            className="w-full bg-[#E5B83C] text-[#0A0301] py-3.5 font-bold tracking-[0.1em] uppercase cursor-pointer rounded-xl text-sm hover:bg-[#E5B83C]/90 transition-all"
          >
            LOGIN
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
                    {order.delivery_mode === "deliver" ? (
                      <Truck className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <MapPin className="w-3.5 h-3.5 text-green-400" />
                    )}
                    <span className="text-sm text-[#FEF3DF] capitalize">{order.delivery_mode}</span>
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
                    <span className="text-[#FEF3DF]/80">{item.qty}x {item.name}</span>
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
// DASHBOARD
// ============================================
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ADMIN_PASS}`,
  };

  const fetchOrders = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        headers: authHeaders,
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
        headers: authHeaders,
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
        headers: authHeaders,
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
              onClick={() => { sessionStorage.removeItem("bb_admin_auth"); onLogout(); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs cursor-pointer hover:bg-red-500/20 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">
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
      </main>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================
export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("bb_admin_auth") === "true";
    }
    return false;
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
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
