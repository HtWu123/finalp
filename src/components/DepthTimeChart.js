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
    if (!countryData) {
      setChartData([]);
      return;
    }

    if (country === "Unknown") {
      let allData = [];

      Object.keys(countryData).forEach(countryKey => {
        if (Array.isArray(countryData[countryKey])) {
          allData = [...allData, ...countryData[countryKey]];
        }
      });

      const formattedData = allData.map(eq => {
        const timeValue = typeof eq.time === 'string' 
          ? new Date(eq.time).getTime() 
          : (typeof eq.time === 'number' ? eq.time : 0);
        
        return {
          time: timeValue,
          timeObj: new Date(timeValue),
          depth: typeof eq.depth === 'number' ? eq.depth : 0,
          magnitude: eq.magnitude,
          place: eq.place,
          id: eq.id
        };
      });

      const validData = formattedData.filter(d => 
        !isNaN(d.time) && !isNaN(d.depth) && d.time > 0
      );

      validData.sort((a, b) => a.time - b.time);

      setChartData(validData);
    } 
    else if (country && countryData[country]) {
      const formattedData = countryData[country].map(eq => {
        const timeValue = typeof eq.time === 'string' 
          ? new Date(eq.time).getTime() 
          : (typeof eq.time === 'number' ? eq.time : 0);
        
        return {
          time: timeValue,
          timeObj: new Date(timeValue),
          depth: typeof eq.depth === 'number' ? eq.depth : 0,
          magnitude: eq.magnitude,
          place: eq.place,
          id: eq.id
        };
      });

      const validData = formattedData.filter(d => 
        !isNaN(d.time) && !isNaN(d.depth) && d.time > 0
      );

      validData.sort((a, b) => a.time - b.time);

      setChartData(validData);
    } else {
      setChartData([]);
    }
  }, [countryData, country]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip" style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 5px', fontWeight: 'bold' }}>{data.place}</p>
          <p style={{ margin: '0 0 5px' }}><strong>Time:</strong> {data.timeObj.toLocaleString()}</p>
          <p style={{ margin: '0 0 5px' }}><strong>Depth:</strong> {data.depth} km</p>
          <p style={{ margin: '0' }}><strong>Magnitude:</strong> {data.magnitude}</p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="depth-time-chart-container" style={{ 
        height: '100%', 
        width: '100%', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: '4px',
        color: '#666'
      }}>
        <p>Click a point on the map to view depth-time data</p>
      </div>
    );
  }

  const timeMin = Math.min(...chartData.map(d => d.time));
  const timeMax = Math.max(...chartData.map(d => d.time));
  const timeRange = Math.max(timeMax - timeMin, 24 * 60 * 60 * 1000);
  const domain = [
    timeMin - timeRange * 0.05, 
    timeMax + timeRange * 0.05
  ];

  const formatXAxis = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const titleText = country === "Unknown" 
    ? "Global Earthquake Depth-Time Distribution" 
    : `Earthquake Depth-Time Distribution in ${country}`;

  return (
    <div className="depth-time-chart-container" style={{ 
      height: '100%', 
      width: '100%', 
      display: 'flex',
      flexDirection: 'column',
      padding: '10px' 
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
        {titleText}
      </h3>
      <div style={{ flex: 1, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 10, right: 10, bottom: 20, left: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              name="Time"
              domain={domain}
              type="number"
              scale="time"
              tickFormatter={formatXAxis}
              tickCount={3}
              orientation="top"
              label={{ value: 'Time', position: 'insideTopRight', offset: -5, fontSize: 12 }}
              // label={{ value: 'Time', position: 'insideBottomRight', offset: -5, fontSize: 12 }}
              fontSize={11}
            />
            <YAxis
              dataKey="depth"
              name="Depth (km)"
              label={{
                value: 'Depth (km)',
                angle: -90,
                position: 'insideLeft',
                fontSize: 12
              }}
              domain={[0, 'dataMax']}
              reversed={true}
              fontSize={11}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Scatter
              name="Earthquake Events"
              data={chartData}
              fill="#8884d8"
              shape={(props) => {
                if (!props.cx || !props.cy || isNaN(props.cx) || isNaN(props.cy)) {
                  return null;
                }
                
                const { cx, cy } = props;
                let size = 1;
                let color = '#91bfdb';
                if (props.payload.magnitude >= 7.0) {
                  color = '#ff0000'; 
                  size = 10;
                } else if (props.payload.magnitude >= 6.0) {
                  color = '#fc8d59';
                  size = 7;
                } else if (props.payload.magnitude >= 5.0) {
                  color = '#fee08b';
                  size = 5;
                } else {
                  color = '#c7e9c0';
                  size = 3;
                }
                
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={size}
                    fill={color}
                    stroke="#000"
                    strokeWidth={0.1}
                  />
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DepthTimeChart;
