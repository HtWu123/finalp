// src/components/DepthTimeChart/DepthTimeChart.js
import { useEffect, useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const DepthTimeChart = ({ countryData, country }) => {
  const [chartData, setChartData] = useState([]);
  
  useEffect(() => {
    if (!countryData || !country || !countryData[country]) {
      setChartData([]);
      return;
    }
    
    // Format data for the chart
    const formattedData = countryData[country].map(eq => {
      // 确保时间是数值，而不是Date对象
      // 使用时间戳（毫秒）作为x轴值
      const timeValue = typeof eq.time === 'string' 
        ? new Date(eq.time).getTime() 
        : (typeof eq.time === 'number' ? eq.time : 0);
      
      return {
        time: timeValue, // 使用时间戳数值
        timeObj: new Date(timeValue), // 保存Date对象用于显示
        depth: typeof eq.depth === 'number' ? eq.depth : 0,
        magnitude: eq.magnitude,
        place: eq.place,
        id: eq.id
      };
    });
    
    // 过滤掉无效数据
    const validData = formattedData.filter(d => 
      !isNaN(d.time) && !isNaN(d.depth) && d.time > 0
    );
    
    // Sort by time
    validData.sort((a, b) => a.time - b.time);
    
    setChartData(validData);
  }, [countryData, country]);

  // Custom tooltip to display information
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip" style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #ccc'
        }}>
          <p><strong>Location:</strong> {data.place}</p>
          <p><strong>Time:</strong> {data.timeObj.toLocaleString()}</p>
          <p><strong>Depth:</strong> {data.depth} km</p>
          <p><strong>Magnitude:</strong> {data.magnitude}</p>
        </div>
      );
    }
    return null;
  };

  // Return an empty div if no data
  if (chartData.length === 0) {
    return (
      <div className="depth-time-chart-container" style={{ height: '400px', width: '100%' }}>
        <p>Select a country by hovering over an earthquake point on the map.</p>
      </div>
    );
  }

  // 计算时间的最小值和最大值，确保有适当的范围
  const timeMin = Math.min(...chartData.map(d => d.time));
  const timeMax = Math.max(...chartData.map(d => d.time));
  // 确保有1天的范围，防止单点的情况
  const timeRange = Math.max(timeMax - timeMin, 24 * 60 * 60 * 1000);
  const domain = [
    timeMin - timeRange * 0.05, 
    timeMax + timeRange * 0.05
  ];

  // 格式化时间标签
  const formatXAxis = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="depth-time-chart-container" style={{ height: '400px', width: '100%' }}>
      <h3>Depth vs. Time of Earthquakes in {country}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{ top: 20, right: 30, bottom: 20, left: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            name="Time"
            domain={domain}
            type="number"
            scale="time"
            tickFormatter={formatXAxis}
            tickCount={5}
            label={{ value: 'Time', position: 'insideBottomRight', offset: -10 }}
          />
          <YAxis
            dataKey="depth"
            name="Depth (km)"
            label={{
              value: 'Depth (km)',
              angle: -90,
              position: 'insideLeft',
            }}
            domain={[0, 'dataMax']}
            reversed={true} // Make the y-axis arrow point downward
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Scatter
            name="Earthquakes"
            data={chartData}
            fill="#8884d8"
            shape={(props) => {
              if (!props.cx || !props.cy || isNaN(props.cx) || isNaN(props.cy)) {
                return null; // 跳过无效坐标的点
              }
              
              const { cx, cy } = props;
              const size = props.payload.magnitude * 3; // Scale the size based on magnitude
              
              // Get color based on magnitude
              let color = '#91bfdb';
              if (props.payload.magnitude >= 7.0) color = '#d73027';
              else if (props.payload.magnitude >= 6.0) color = '#fc8d59';
              else if (props.payload.magnitude >= 5.0) color = '#fee08b';
              
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={size}
                  fill={color}
                  stroke="#000"
                  strokeWidth={1}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DepthTimeChart;