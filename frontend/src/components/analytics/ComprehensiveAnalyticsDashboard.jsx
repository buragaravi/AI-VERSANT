import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Server, 
  Cpu, 
  HardDrive, 
  Wifi, 
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  TrendingUp,
  Users,
  Zap,
  Eye,
  AlertCircle,
  Timer,
  Network,
  Database,
  Gauge
} from 'lucide-react';

const ComprehensiveAnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('1hour');
  const [selectedMetric, setSelectedMetric] = useState('requests');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAnalytics = async (endpoint, params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `http://localhost:8000/enhanced-analytics/analytics/${endpoint}${queryString ? `?${queryString}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (err) {
      console.error(`Error fetching ${endpoint}:`, err);
      throw err;
    }
  };

  const loadAllAnalytics = async () => {
    setLoading(true);
    try {
      const [
        requestData,
        endpointData,
        errorData,
        performanceData,
        networkData,
        systemData,
        timeBasedData,
        realTimeData,
        topEndpointsData
      ] = await Promise.all([
        fetchAnalytics('requests', { period: selectedTimePeriod }),
        fetchAnalytics('endpoints'),
        fetchAnalytics('errors'),
        fetchAnalytics('performance'),
        fetchAnalytics('network'),
        fetchAnalytics('system'),
        fetchAnalytics('time-based'),
        fetchAnalytics('real-time'),
        fetchAnalytics('top-endpoints', { metric: selectedMetric })
      ]);

      setAnalyticsData({
        requests: requestData.data,
        endpoints: endpointData.data,
        errors: errorData.data,
        performance: performanceData.data,
        network: networkData.data,
        system: systemData.data,
        timeBased: timeBasedData.data,
        realTime: realTimeData.data,
        topEndpoints: topEndpointsData.data
      });
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAnalytics();
    const interval = setInterval(loadAllAnalytics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [selectedTimePeriod, selectedMetric]);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': case 'healthy': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'excellent': case 'healthy': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'good': return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Comprehensive Server Analytics</h1>
            <p className="text-gray-600 mt-1">Real-time server performance, request tracking, and system health</p>
          </div>
          <div className="flex items-center space-x-4">
            {analyticsData?.system && getStatusIcon(analyticsData.system.status)}
            <span className={`font-medium ${getStatusColor(analyticsData?.system?.status)}`}>
              {analyticsData?.system?.status?.toUpperCase() || 'UNKNOWN'}
            </span>
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Last updated: {lastUpdated}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
            <select 
              value={selectedTimePeriod} 
              onChange={(e) => setSelectedTimePeriod(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="1hour">Last 1 Hour</option>
              <option value="5hours">Last 5 Hours</option>
              <option value="1day">Last 1 Day</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Top Endpoints By</label>
            <select 
              value={selectedMetric} 
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="requests">Requests</option>
              <option value="errors">Errors</option>
              <option value="response_time">Response Time</option>
              <option value="network">Network Usage</option>
            </select>
          </div>
        </div>
      </div>

      {/* Real-time Overview */}
      {analyticsData?.realTime && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Requests/sec</p>
                <p className="text-2xl font-bold text-blue-600">
                  {analyticsData.realTime.current_requests_per_second?.toFixed(2) || '0'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Error Rate</p>
                <p className="text-2xl font-bold text-red-600">
                  {analyticsData.realTime.current_error_rate?.toFixed(2) || '0'}%
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <Timer className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold text-green-600">
                  {(analyticsData.realTime.current_avg_response_time * 1000)?.toFixed(0) || '0'}ms
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <Network className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Active Endpoints</p>
                <p className="text-2xl font-bold text-purple-600">
                  {analyticsData.realTime.active_endpoints || '0'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Analytics */}
      {analyticsData?.requests && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Requests</span>
                <span className="font-medium">{formatNumber(analyticsData.requests.total_requests)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Error Count</span>
                <span className="font-medium text-red-600">{formatNumber(analyticsData.requests.error_count)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Error Rate</span>
                <span className="font-medium text-red-600">{analyticsData.requests.error_rate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time Period</span>
                <span className="font-medium">{analyticsData.requests.time_period}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Codes</h3>
            <div className="space-y-2">
              {Object.entries(analyticsData.requests.response_codes || {}).map(([code, count]) => (
                <div key={code} className="flex justify-between">
                  <span className={`font-mono text-sm ${parseInt(code) >= 400 ? 'text-red-600' : 'text-gray-600'}`}>
                    {code}
                  </span>
                  <span className="font-medium">{formatNumber(count)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Endpoints */}
      {analyticsData?.topEndpoints && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top Endpoints by {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}
          </h3>
          <div className="space-y-2">
            {analyticsData.topEndpoints.slice(0, 10).map(([endpoint, value], index) => (
              <div key={endpoint} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                  <span className="font-mono text-sm text-gray-900 ml-2">{endpoint}</span>
                </div>
                <span className="font-medium">
                  {selectedMetric === 'response_time' ? `${(value * 1000).toFixed(0)}ms` : 
                   selectedMetric === 'network' ? formatBytes(value.sent + value.received) :
                   formatNumber(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Analytics */}
      {analyticsData?.performance && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Slowest Endpoints</h3>
            <div className="space-y-2">
              {analyticsData.performance.slowest_endpoints?.slice(0, 10).map(([endpoint, avgTime, count], index) => (
                <div key={endpoint} className="flex items-center justify-between p-2 bg-red-50 rounded">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-red-600 w-6">#{index + 1}</span>
                    <span className="font-mono text-sm text-gray-900 ml-2">{endpoint}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-red-600">{(avgTime * 1000).toFixed(0)}ms</span>
                    <span className="text-xs text-gray-500 ml-2">({count} reqs)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Time Distribution</h3>
            <div className="space-y-2">
              {Object.entries(analyticsData.performance.response_time_distribution || {}).map(([range, count]) => (
                <div key={range} className="flex justify-between">
                  <span className="text-sm text-gray-600">{range.replace('_', ' ')}</span>
                  <span className="font-medium">{formatNumber(count)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* System Health */}
      {analyticsData?.system && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">CPU Usage</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Current</span>
                <span className="font-medium">{analyticsData.system.cpu.percent?.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${analyticsData.system.cpu.percent || 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Memory Usage</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Current</span>
                <span className="font-medium">{analyticsData.system.memory.percent?.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${analyticsData.system.memory.percent || 0}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500">
                {formatBytes(analyticsData.system.memory.used)} / {formatBytes(analyticsData.system.memory.total)}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Health Score</span>
                <span className={`font-medium ${getStatusColor(analyticsData.system.status)}`}>
                  {analyticsData.system.health_score}/100
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Uptime</span>
                <span className="font-medium">
                  {Math.floor(analyticsData.system.uptime_seconds / 3600)}h {Math.floor((analyticsData.system.uptime_seconds % 3600) / 60)}m
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className={`font-medium ${getStatusColor(analyticsData.system.status)}`}>
                  {analyticsData.system.status?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Network Usage */}
      {analyticsData?.network && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Usage</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatBytes(analyticsData.network.total_bytes_sent)}
              </div>
              <div className="text-sm text-gray-600">Bytes Sent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatBytes(analyticsData.network.total_bytes_received)}
              </div>
              <div className="text-sm text-gray-600">Bytes Received</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatBytes(analyticsData.network.total_transfer)}
              </div>
              <div className="text-sm text-gray-600">Total Transfer</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Errors */}
      {analyticsData?.errors?.recent_errors && analyticsData.errors.recent_errors.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Errors</h3>
          <div className="space-y-2">
            {analyticsData.errors.recent_errors.slice(0, 10).map((error, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                  <span className="font-mono text-sm text-gray-900">{error.endpoint}</span>
                  <span className="text-xs text-gray-500 ml-2">({error.method})</span>
                </div>
                <div className="text-right">
                  <span className="font-medium text-red-600">{error.response_code}</span>
                  <span className="text-xs text-gray-500 ml-2">{(error.response_time * 1000).toFixed(0)}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-600">
        <p>Comprehensive analytics powered by Advanced Analytics System</p>
        <p className="mt-1">Auto-refresh every 30 seconds • Last updated: {lastUpdated}</p>
      </div>
    </div>
  );
};

export default ComprehensiveAnalyticsDashboard;
