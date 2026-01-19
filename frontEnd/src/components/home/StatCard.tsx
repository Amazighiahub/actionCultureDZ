/**
 * StatCard - Carte de statistiques avec animation de compteur
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/UI/card';
import { Skeleton } from '@/components/UI/skeleton';
import { TrendingUp } from 'lucide-react';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useRTL } from '@/hooks/useRTL';

interface StatCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  trend?: string | null;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ 
  icon: Icon, 
  title, 
  value, 
  trend, 
  loading = false 
}) => {
  const { formatNumber } = useLocalizedNumber();
  const { rtlClasses } = useRTL();
  const [displayValue, setDisplayValue] = useState(0);

  // Animation du compteur
  useEffect(() => {
    if (!loading && typeof value === 'number') {
      const duration = 2000;
      const steps = 60;
      const stepValue = value / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += stepValue;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [value, loading]);
  
  return (
    <Card className="hover-lift group overflow-hidden relative">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full">
          <pattern id={`pattern-${title}`} x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1"/>
          </pattern>
          <rect width="100%" height="100%" fill={`url(#pattern-${title})`} />
        </svg>
      </div>

      <CardContent className="p-6 relative">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <Icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
              </div>
              {trend && (
                <div className={`flex items-center text-sm text-green-600 ${rtlClasses.flexRow}`}>
                  <TrendingUp className={`h-4 w-4 ${rtlClasses.marginEnd(1)}`} />
                  {trend}
                </div>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">
                {typeof value === 'number' ? formatNumber(displayValue) : value}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
