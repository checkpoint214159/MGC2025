import { ArrowRight, LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface DashboardCardProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColorClass: string;   // e.g., "text-orange-600 bg-orange-100"
  accentColorClass: string; // e.g., "border-l-orange-500"
  onClick: () => void;
  children: ReactNode;      // This is where the specific "Slider" or "Macros" go
  footer?: ReactNode;
}

export function DashboardCard({
  title,
  subtitle,
  icon: Icon,
  iconColorClass,
  accentColorClass,
  onClick,
  children,
  headerBadge, // Extra slot for a "Status" pill
  footer,
}: any) {
  return (
    <div 
      onClick={onClick}
      className={`
        bg-white border border-slate-200 p-5 rounded-xl cursor-pointer group 
        border-l-4 ${accentColorClass}
        -translate-y-2 shadow-xl
        hover:-translate-y-3 hover:shadow-2xl 
        transition-all duration-300 ease-out
        cursor-pointer group border-l-4 ${accentColorClass} inline-flex flex-col h-fit w-full max-w-md
        overflow-hidden relative`}
    >

      <Icon className="absolute -right-4 -top-4 text-slate-50 opacity-0 group-hover:opacity-100 transition-opacity" size={100} />

      <div className="flex items-start justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl shadow-inner ${iconColorClass}`}>
            <Icon size={22} />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 tracking-tight text-lg">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
          </div>
        </div>
        {headerBadge || <ArrowRight className="text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" size={20} />}
      </div>

      <div className="space-y-4 relative z-10 flex-grow">
        {children}
      </div>

      {footer && (
        <div className="mt-4 pt-2 border-t border-slate-50">
           {footer}
        </div>
      )}
    </div>
  );
}


export function CardSlider({ 
  label, 
  current, 
  target, 
  colorClass = "bg-blue-600",
  size = "md" // "sm" | "md" | "lg"
}: { label?: string, current: number, target: number, colorClass?: string, size?: "sm" | "md" | "lg" }) {
  const percent = Math.min((current / target) * 100, 100);
  const height = size === "sm" ? "h-1" : size === "lg" ? "h-4" : "h-2";
  
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
          <span>{label}</span>
          <span>{current}/{target}</span>
        </div>
      )}
      <div className={`w-full bg-slate-100 ${height} rounded-full overflow-hidden`}>
        <div 
          className={`${colorClass} h-full transition-all duration-1000 ease-out`} 
          style={{ width: `${percent}%` }} 
        />
      </div>
    </div>
  );
}

// 2. A flexible Stat Badge
export function CardStat({ label, value, icon: Icon }: { label: string, value: string | number, icon?: any }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
      <div className="flex items-center gap-1 font-black text-slate-900">
        {Icon && <Icon size={12} className="text-slate-400" />}
        {value}
      </div>
    </div>
  );
}