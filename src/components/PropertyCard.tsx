import { User, Calendar, DollarSign, MapPin, Phone, Building2 } from "lucide-react";
import { motion } from "framer-motion";

interface PropertyCardProps {
  name: string;
  address: string;
  type: string;
  status: "free" | "rented" | "repair";
  tenant?: string;
  rent?: number;
  index: number;
}

const statusColors = {
  free: "from-amber-500/20 to-amber-600/10",
  rented: "from-emerald-500/20 to-emerald-600/10",
  repair: "from-rose-500/20 to-rose-600/10",
};

const statusTextMap = {
  free: "Вільна",
  rented: "Здана",
  repair: "Ремонт",
};

const PropertyCard = ({ name, address, type, status, tenant, rent, index }: PropertyCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      className="relative group"
    >
      {/* Liquid glass card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-5">
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
          initial={{ x: "-100%" }}
          whileHover={{ x: "100%" }}
          transition={{ duration: 0.6 }}
        />
        
        {/* Status indicator */}
        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${statusColors[status]} rounded-bl-full opacity-60 blur-2xl`} />
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold">{name}</h3>
                <p className="text-gray-400 text-sm">{type}</p>
              </div>
            </div>
            
            <div className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm border ${
              status === 'rented' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : status === 'free'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {statusTextMap[status]}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <MapPin className="w-4 h-4" />
                <span>{address}</span>
              </div>
            </div>
            
            {tenant && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <User className="w-4 h-4" />
                  <span>{tenant}</span>
                </div>
              </div>
            )}
            
            {rent && (
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <DollarSign className="w-4 h-4" />
                  <span>Оренда</span>
                </div>
                <span className="text-white font-semibold">{rent.toLocaleString('uk-UA')} ₴</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/10 group-hover:to-pink-500/10 transition-all duration-500 -z-10 blur-xl" />
    </motion.div>
  );
};

export default PropertyCard;
