import { useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle } from 'lucide-react';
import { accountsService } from '../../services/accountsService';
import { processorService } from '../../services/processorService';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'checking';
  message?: string;
}

export const HealthStatus = () => {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Accounts Service', status: 'checking' },
    { name: 'Processor Service', status: 'checking' },
  ]);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    // Check Accounts Service
    try {
      await accountsService.healthCheck();
      setServices((prev) =>
        prev.map((s) =>
          s.name === 'Accounts Service'
            ? { ...s, status: 'healthy' as const, message: 'Operational' }
            : s
        )
      );
    } catch (error) {
      setServices((prev) =>
        prev.map((s) =>
          s.name === 'Accounts Service'
            ? { ...s, status: 'unhealthy' as const, message: 'Service unavailable' }
            : s
        )
      );
    }

    // Check Processor Service
    try {
      await processorService.healthCheck();
      setServices((prev) =>
        prev.map((s) =>
          s.name === 'Processor Service'
            ? { ...s, status: 'healthy' as const, message: 'Operational' }
            : s
        )
      );
    } catch (error) {
      setServices((prev) =>
        prev.map((s) =>
          s.name === 'Processor Service'
            ? { ...s, status: 'unhealthy' as const, message: 'Service unavailable' }
            : s
        )
      );
    }
  };

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unhealthy':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'checking':
        return <Activity className="h-4 w-4 text-gray-400 animate-pulse" />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        System Status
      </h3>
      <div className="space-y-2">
        {services.map((service) => (
          <div
            key={service.name}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              {getStatusIcon(service.status)}
              <span className="text-gray-600 dark:text-gray-400">
                {service.name}
              </span>
            </div>
            <span
              className={`text-xs ${
                service.status === 'healthy'
                  ? 'text-green-600 dark:text-green-400'
                  : service.status === 'unhealthy'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-400'
              }`}
            >
              {service.message || 'Checking...'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Made with Bob
