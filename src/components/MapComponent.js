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
    if (!earthquakeData || !earthquakeData.features) {
      console.log("没有地震数据或数据格式不正确");
      return;
    }
    
    console.log(`总地震数量: ${earthquakeData.features.length}`);
    
    let filtered = earthquakeData.features;
    
    // 检查是否有magnitude_level属性
    const hasMagnitudeLevel = filtered.some(eq => eq.properties.magnitude_level);
    if (!hasMagnitudeLevel) {
      console.warn("警告: 数据中缺少magnitude_level属性，正在动态添加");
      
      // 动态添加magnitude_level
      filtered = filtered.map(eq => {
        const mag = eq.properties.mag;
        let level;
        if (mag < 5.0) level = "Moderate (4.5-4.9)";
        else if (mag < 6.0) level = "Strong (5.0-5.9)";
        else if (mag < 7.0) level = "Major (6.0-6.9)";
        else level = "Great (7.0+)";
        
        return {
          ...eq,
          properties: {
            ...eq.properties,
            magnitude_level: level
          }
        };
      });
    }
    
    // 按震级筛选（如果选择了）
    if (selectedMagnitude && selectedMagnitude !== 'All') {
      console.log(`当前选择的震级: ${selectedMagnitude}`);
      console.log(`过滤前数量: ${filtered.length}`);
      
      // 使用两种方法进行过滤
      // 1. 基于震级分类
      const filteredByLevel = filtered.filter(eq => 
        eq.properties.magnitude_level === selectedMagnitude
      );
      
      // 2. 基于震级数值范围
      let filteredByRange = [];
      if (selectedMagnitude === "Moderate (4.5-4.9)") {
        filteredByRange = filtered.filter(eq => 
          eq.properties.mag >= 4.5 && eq.properties.mag < 5.0
        );
      } else if (selectedMagnitude === "Strong (5.0-5.9)") {
        filteredByRange = filtered.filter(eq => 
          eq.properties.mag >= 5.0 && eq.properties.mag < 6.0
        );
      } else if (selectedMagnitude === "Major (6.0-6.9)") {
        filteredByRange = filtered.filter(eq => 
          eq.properties.mag >= 6.0 && eq.properties.mag < 7.0
        );
      } else if (selectedMagnitude === "Great (7.0+)") {
        filteredByRange = filtered.filter(eq => 
          eq.properties.mag >= 7.0
        );
      }
      
      console.log(`基于分类过滤后数量: ${filteredByLevel.length}`);
      console.log(`基于数值范围过滤后数量: ${filteredByRange.length}`);
      
      // 如果基于分类的过滤返回了零结果，使用基于范围的过滤
      filtered = filteredByLevel.length > 0 ? filteredByLevel : filteredByRange;
      
      console.log(`最终过滤后数量: ${filtered.length}`);
    }
    
    // 按日期范围筛选（如果选择了）
    if (selectedDateRange && selectedDateRange.start && selectedDateRange.end) {
      console.log(`按日期过滤: ${selectedDateRange.start.toISOString()} 到 ${selectedDateRange.end.toISOString()}`);
      console.log(`日期过滤前数量: ${filtered.length}`);
      
      filtered = filtered.filter(eq => {
        const eqTime = eq.properties.time;
        const eqDate = new Date(typeof eqTime === 'number' ? eqTime : Date.parse(eqTime));
        return eqDate >= selectedDateRange.start && eqDate <= selectedDateRange.end;
      });
      
      console.log(`日期过滤后数量: ${filtered.length}`);
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
            key={earthquake.properties.id || earthquake.id}
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
                {earthquake.properties.magnitude_level && (
                  <p>分类: {earthquake.properties.magnitude_level}</p>
                )}
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapComponent;