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
    const formattedData = countryData[country].map(eq => ({
      time: new Date(eq.time),
      depth: eq.depth,
      magnitude: eq.magnitude,
      place: eq.place,
      id: eq.id
    }));
    
    // Sort by time
    formattedData.sort((a, b) => a.time - b.time);
    
    setChartData(formattedData);
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
          <p><strong>Time:</strong> {data.time.toLocaleString()}</p>
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
            tickFormatter={(date) => date.toLocaleDateString()}
            type="number"
            domain={['dataMin', 'dataMax']}
            tickCount={5}
            scale="time"
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
            // Size based on magnitude
            shape={(props) => {
              const { cx, cy, fill } = props;
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