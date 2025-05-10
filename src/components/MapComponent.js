// src/components/WorldMap/MapComponent.js
import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// 创建一个组件来响应地图更新
const MapUpdater = ({ selectedNetworkNode }) => {
  const map = useMap();
  
  useEffect(() => {
    if (selectedNetworkNode) {
      // 当有选中的网络节点时，将地图中心移动到该地震位置
      map.setView(
        [selectedNetworkNode.geometry.coordinates[1], selectedNetworkNode.geometry.coordinates[0]],
        map.getZoom()
      );
    }
  }, [selectedNetworkNode, map]);
  
  return null;
};

const MapComponent = ({ 
  earthquakeData, 
  selectedMagnitude, 
  selectedDateRange, 
  onEarthquakeHover,
  onEarthquakeClick,
  selectedNetworkNode // 改名: 从关系网络中选中的地震
}) => {
  const [filteredData, setFilteredData] = useState([]);
  const [activeEarthquake, setActiveEarthquake] = useState(null);
  const markersRef = useRef({}); // 用于存储地震点的引用

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
    
    // 重置活动地震点
    setActiveEarthquake(null);
    
    // 重置标记引用
    markersRef.current = {};
  }, [earthquakeData, selectedMagnitude, selectedDateRange]);

  // 根据震级获取颜色
  const getColor = (magnitude) => {
    if (magnitude >= 7.0) return '#ff0000'; // 巨大 - 红色
    if (magnitude >= 6.0) return '#fc8d59'; // 重大 - 橙色
    if (magnitude >= 5.0) return '#fee08b'; // 强烈 - 黄色
    return '#c7e9c0';                       // 中等 - 绿色
  };

  // 根据震级和是否是活动点获取半径
  const getRadius = (earthquake) => {
    const isActive = activeEarthquake && 
                    activeEarthquake.properties.id === earthquake.properties.id;
    const isSelected = selectedNetworkNode && 
                    selectedNetworkNode.properties.id === earthquake.properties.id;
    
    // 基础半径
    const baseRadius = 5;
    
    // 如果是当前活动的或被关系网络选中的地震点，增大半径
    if (isActive || isSelected) {
      return baseRadius * 1.5;
    }
    
    return baseRadius;
  };

  // 处理标记点击事件
  const handleMarkerClick = (earthquake) => {
    setActiveEarthquake(earthquake); // 设置当前活动的地震点
    
    // 从地点获取国家（逗号后的最后部分）
    const place = earthquake.properties.place;
    const country = place.includes(', ') ? place.split(', ').pop() : "Unknown";
    
    // 同时更新国家和调用点击回调
    if (onEarthquakeHover) {
      onEarthquakeHover(country, earthquake);
    }
    
    if (onEarthquakeClick) {
      onEarthquakeClick(earthquake);
    }
  };

  // 存储或获取地震点的引用
  const storeMarkerRef = (earthquake, ref) => {
    if (ref) {
      const id = earthquake.properties.id || earthquake.id;
      markersRef.current[id] = ref;
    }
  };

  // 检查地震点是否被关系网络选中
  const isEarthquakeSelected = (earthquake) => {
    if (!selectedNetworkNode) return false;
    
    const earthquakeId = earthquake.properties.id || earthquake.id;
    const selectedId = selectedNetworkNode.properties.id || selectedNetworkNode.id;
    
    return earthquakeId === selectedId;
  };

  // 当选中的网络节点改变时，更新相应的标记样式
  useEffect(() => {
    // 遍历所有标记，重置样式
    Object.values(markersRef.current).forEach(marker => {
      if (marker && marker.options) {
        marker.setStyle({
          weight: 0.5,
          color: '#333',
          fillOpacity: 0.8
        });
      }
    });
    
    // 如果有被选中的网络节点对应的地震点，更新其样式
    if (selectedNetworkNode) {
      const selectedId = selectedNetworkNode.properties.id || selectedNetworkNode.id;
      const marker = markersRef.current[selectedId];
      
      if (marker) {
        marker.setStyle({
          weight: 2,
          color: '#ff0000',
          fillOpacity: 1
        });
      }
    }
  }, [selectedNetworkNode]);

  return (
    <div className="world-map-container" style={{ height: '100%', width: '100%' }}>
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
        
        {/* 添加响应地图更新的组件 */}
        <MapUpdater selectedNetworkNode={selectedNetworkNode} />
        
        {filteredData.map((earthquake) => {
          const isActive = activeEarthquake && 
                          activeEarthquake.properties.id === earthquake.properties.id;
          const isSelected = isEarthquakeSelected(earthquake);
          
          return (
            <CircleMarker
              ref={(ref) => storeMarkerRef(earthquake, ref)}
              key={earthquake.properties.id || earthquake.id}
              center={[
                earthquake.geometry.coordinates[1], 
                earthquake.geometry.coordinates[0]
              ]}
              radius={getRadius(earthquake)}
              fillColor={getColor(earthquake.properties.mag)}
              weight={isActive || isSelected ? 2 : 0.5}
              color={isSelected ? '#ff0000' : (isActive ? '#000' : '#333')}
              opacity={1}
              fillOpacity={isActive || isSelected ? 1 : 0.8}
              eventHandlers={{
                click: () => handleMarkerClick(earthquake)
              }}
            >
              <Tooltip>
                <div>
                  <strong>Magnitude {earthquake.properties.mag}</strong>
                  <p>{earthquake.properties.place}</p>
                  <p>Depth: {earthquake.properties.depth || earthquake.geometry.coordinates[2]} km</p>
                  <p>Time: {new Date(earthquake.properties.time).toLocaleString()}</p>
                  {earthquake.properties.magnitude_level && (
                    <p>Category: {earthquake.properties.magnitude_level}</p>
                  )}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
export default MapComponent;