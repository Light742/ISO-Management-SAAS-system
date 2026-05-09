import { TrendingUp } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: string;
    trendColor?: string;
    trendIcon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon,
    trend,
    trendColor = 'text-green-500',
    trendIcon = <TrendingUp size={12} />
}) => (
    <div className="card-modern group">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-muted text-sm font-medium mb-1">{title}</p>
                <h3 className="text-3xl font-bold tracking-tight text-gray-900 group-hover:text-primary transition-colors">{value}</h3>
                {trend && (
                    <p className={`text-xs mt-2 flex items-center gap-1 font-semibold ${trendColor}`}>
                        {trendIcon} {trend}
                    </p>
                )}
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-primary/10 group-hover:text-primary transition-colors duration-300">
                {icon}
            </div>
        </div>
    </div>
);
