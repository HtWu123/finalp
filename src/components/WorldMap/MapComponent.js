// src/components/WorldMap/MapComponent.js
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const MapComponent = ({ 
  earthquakeData, 
  selectedMagnitude, 
  selectedDateRange, 
  onEarthquakeHover,
  onEarthquakeClick
}) => {
  const [filteredData, setFilteredData] = useState([]);

  // 当数据或筛选器更改时应用筛选
  useEffect(() => {
    if (!earthquakeData || !earthquakeData.features) return;
    
    let filtered = earthquakeData.features;
    
    // 按震级筛选（如果选择了）
    if (selectedMagnitude && selectedMagnitude !== 'All') {
      filtered = filtered.filter(eq => eq.properties.magnitude_level === selectedMagnitude);
    }
    
    // 按日期范围筛选（如果选择了）
    if (selectedDateRange && selectedDateRange.start && selectedDateRange.end) {
      filtered = filtered.filter(eq => {
        const eqDate = new Date(eq.properties.time);
        return eqDate >= selectedDateRange.start && eqDate <= selectedDateRange.end;
      });
    }
    
    setFilteredData(filtered);
  }, [earthquakeData, selectedMagnitude, selectedDateRange]);

  // 根据震级获取颜色
  const getColor = (magnitude) => {
    if (magnitude >= 7.0) return '#d73027'; // 巨大 - 红色
    if (magnitude >= 6.0) return '#fc8d59'; // 重大 - 橙色
    if (magnitude >= 5.0) return '#fee08b'; // 强烈 - 黄色
    return '#91bfdb';                       // 中等 - 蓝色
  };

  // 根据震级获取半径
  const getRadius = (magnitude) => {
    return Math.max(magnitude * 1.5, 4);
  };

  // 处理标记悬停
  const handleMarkerHover = (earthquake) => {
    if (onEarthquakeHover) {
      // 从地点获取国家（逗号后的最后部分）
      const place = earthquake.properties.place;
      const country = place.includes(', ') ? place.split(', ').pop() : "Unknown";
      
      onEarthquakeHover(country, earthquake);
    }
  };

  // 处理标记点击
  const handleMarkerClick = (earthquake) => {
    if (onEarthquakeClick) {
      onEarthquakeClick(earthquake);
    }
  };

  return (
    <div className="world-map-container" style={{ height: '500px', width: '100%' }}>
      <MapContainer 
        center={[20, 0]} 
        zoom={2} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {filteredData.map((earthquake) => (
          <CircleMarker
            key={earthquake.properties.id}
            center={[
              earthquake.geometry.coordinates[1], 
              earthquake.geometry.coordinates[0]
            ]}
            radius={getRadius(earthquake.properties.mag)}
            fillColor={getColor(earthquake.properties.mag)}
            color="#000"
            weight={1}
            opacity={1}
            fillOpacity={0.8}
            eventHandlers={{
              mouseover: () => handleMarkerHover(earthquake),
              click: () => handleMarkerClick(earthquake)
            }}
          >
            <Tooltip>
              <div>
                <strong>震级 {earthquake.properties.mag}</strong>
                <p>{earthquake.properties.place}</p>
                <p>深度: {earthquake.properties.depth || earthquake.geometry.coordinates[2]} km</p>
                <p>时间: {new Date(earthquake.properties.time).toLocaleString()}</p>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapComponent;