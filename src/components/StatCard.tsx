import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  index: number;
}

const StatCard = ({ icon: Icon, label, value, trend, trendUp, index }: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileHover={{ y: -4 }}
      className="relative group"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-xl border border-white/10 p-4">
        {/* Animated gradient overlay */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: "radial-gradient(circle at center, rgba(139, 92, 246, 0.1) 0%, transparent 70%)",
          }}
        />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-white/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-purple-300" />
            </div>
            {trend && (
              <span className={`text-xs font-medium ${trendUp ? "text-emerald-400" : "text-rose-400"}`}>
                {trendUp ? "↑" : "↓"} {trend}
              </span>
            )}
          </div>
          
          <div>
            <p className="text-2xl font-bold text-white mb-1">{value}</p>
            <p className="text-sm text-gray-400">{label}</p>
          </div>
        </div>
      </div>
      
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-purple-500/0 group-hover:bg-purple-500/5 transition-all duration-500 -z-10 blur-xl" />
    </motion.div>
  );
};

export default StatCard;
