// src/components/RelationshipNetwork/RelationshipNetwork.js
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';

const RelationshipNetwork = ({ relationships, selectedEarthquake, earthquakeData, onNodeHover }) => {
  const svgRef = useRef(null);
  const [generatedRelationships, setGeneratedRelationships] = useState(null);
  
  // 优化的关系生成函数
  const generateRelationships = useCallback((selectedQuake, data) => {
    if (!selectedQuake || !data || !data.features) return null;
    
    const quakeId = selectedQuake.id || selectedQuake.properties.id;
    console.log("Generating optimized client-side relationships for earthquake:", quakeId);
    
    const newRelationships = {};
    newRelationships[quakeId] = [];
    
    // 预先筛选显著地震 - 提高性能的优化
    const significantQuakes = data.features
      .filter(eq => eq.properties.mag >= 5.0)
      .filter(eq => (eq.id || eq.properties.id) !== quakeId);
    
    // 预先计算选中地震的数据
    const selectedLocation = selectedQuake.geometry.coordinates;
    const selectedLat = selectedLocation[1] * Math.PI / 180;
    const selectedLon = selectedLocation[0] * Math.PI / 180;
    const selectedTime = selectedQuake.properties.time;
    const selectedDepth = selectedLocation[2];
    const selectedMag = selectedQuake.properties.mag;
    
    // 处理每个地震
    for (const quake2 of significantQuakes) {
      // 计算时间差（天）
      const time2 = quake2.properties.time;
      const timeDiff = Math.abs(selectedTime - time2) / (24 * 60 * 60 * 1000);
      
      // 如果时间差太大则跳过
      if (timeDiff > 7) continue;
      
      // 计算位置差 - 优化计算
      const loc2 = quake2.geometry.coordinates;
      const lat2 = loc2[1] * Math.PI / 180;
      const lon2 = loc2[0] * Math.PI / 180;
      
      // Haversine公式
      const dlon = lon2 - selectedLon;
      const dlat = lat2 - selectedLat;
      const a = Math.sin(dlat/2)**2 + Math.cos(selectedLat) * Math.cos(lat2) * Math.sin(dlon/2)**2;
      const c = 2 * Math.asin(Math.sqrt(a));
      const R = 6371; // 地球半径（公里）
      const distance = c * R;
      
      // 转换为大致度数等价物（1度≈111公里）
      const locationDiff = distance / 111;
      
      // 如果位置差太大则跳过
      if (locationDiff > 5) continue;
      
      // 计算震级差异和深度差异
      const magDiff = Math.abs(selectedMag - quake2.properties.mag);
      const depthDiff = Math.abs(selectedDepth - loc2[2]) / 100; // 除以100km归一化
      
      // 计算相似度
      const similarity = 1 / (1 + 0.25*timeDiff + 0.4*locationDiff + 0.15*magDiff + 0.2*depthDiff);
      
      // 只包含显著关系
      if (similarity > 0.25) {
        const isLargerQuake = quake2.properties.mag > selectedMag;
        
        newRelationships[quakeId].push({
          target_id: quake2.id || quake2.properties.id,
          similarity: similarity,
          target_mag: quake2.properties.mag,
          target_place: quake2.properties.place,
          target_time: quake2.properties.time,
          target_magnitude_level: quake2.properties.magnitude_level || 
            (quake2.properties.mag >= 7.0 ? "Great (7.0+)" :
             quake2.properties.mag >= 6.0 ? "Major (6.0-6.9)" :
             quake2.properties.mag >= 5.0 ? "Strong (5.0-5.9)" :
             "Moderate (4.5-4.9)"),
          isLarger: isLargerQuake
        });
      }
    }
    
    // 按相似度排序并限制为前10个
    newRelationships[quakeId].sort((a, b) => b.similarity - a.similarity);
    
    // 保持原来的10个节点限制
    if (newRelationships[quakeId].length > 10) {
      newRelationships[quakeId] = newRelationships[quakeId].slice(0, 10);
    }
    
    console.log(`Generated ${newRelationships[quakeId].length} relationships (optimized)`);
    return newRelationships;
  }, []);
  
  // 当选中地震变化时生成关系
  useEffect(() => {
    if (!relationships || Object.keys(relationships).length === 0) {
      if (selectedEarthquake && earthquakeData && earthquakeData.features) {
        const newRelationships = generateRelationships(selectedEarthquake, earthquakeData);
        setGeneratedRelationships(newRelationships);
      }
    }
  }, [selectedEarthquake, earthquakeData, relationships, generateRelationships]);
  
  // 记忆有效关系以防止不必要的重新计算
  const effectiveRelationships = useMemo(() => {
    return relationships && Object.keys(relationships).length > 0 
      ? relationships 
      : generatedRelationships;
  }, [relationships, generatedRelationships]);
  
  // 优化的D3渲染
  useEffect(() => {
    // 确保所有必要数据存在
    if (!selectedEarthquake || !earthquakeData || !svgRef.current || typeof window === 'undefined') return;
    
    // 创建清理函数以便内存管理
    const cleanup = () => {
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll("*").remove();
      }
      d3.select("body").selectAll(".earthquake-tooltip").remove();
    };
    
    // 清除先前的可视化
    cleanup();
    
    // 获取地震ID
    const quakeId = selectedEarthquake.id || selectedEarthquake.properties.id;
    
    // 获取此地震的关系
    const quakeRelationships = effectiveRelationships && effectiveRelationships[quakeId] 
      ? effectiveRelationships[quakeId] 
      : [];
    
    // 如果没有关系，显示消息
    if (quakeRelationships.length === 0) {
      const svg = d3.select(svgRef.current);
      svg.append("text")
        .attr("x", 20)
        .attr("y", 50)
        .text("No related earthquakes found for this event")
        .style("font-size", "12px")
        .style("fill", "#666");
      return cleanup;
    }
    
    // 准备网络数据
    const nodes = [
      // 中心节点（选定的地震）
      {
        id: quakeId,
        magnitude: selectedEarthquake.properties.mag,
        place: selectedEarthquake.properties.place,
        isCenter: true,
        time: new Date(selectedEarthquake.properties.time).toLocaleString(),
        originalData: selectedEarthquake
      }
    ];
    
    const links = [];
    
    // 添加相关地震
    quakeRelationships.forEach(rel => {
      // 高效查找原始地震数据
      const originalQuake = earthquakeData.features.find(
        eq => (eq.id || eq.properties.id) === rel.target_id
      );
      
      if (originalQuake) {
        nodes.push({
          id: rel.target_id,
          magnitude: rel.target_mag,
          place: rel.target_place,
          isCenter: false,
          isLarger: rel.isLarger,
          time: new Date(rel.target_time).toLocaleString(),
          originalData: originalQuake
        });
        
        links.push({
          source: quakeId,
          target: rel.target_id,
          similarity: rel.similarity
        });
      }
    });
    
    // 获取容器尺寸
    const containerWidth = svgRef.current.clientWidth || 300;
    const containerHeight = svgRef.current.clientHeight || 200;
    
    // 创建SVG
    const svg = d3.select(svgRef.current)
      .attr("width", containerWidth)
      .attr("height", containerHeight)
      .attr("viewBox", [0, 0, containerWidth, containerHeight])
      .style("will-change", "transform") // 浏览器优化提示
      .style("contain", "content"); // 浏览器性能提示
    
    // 创建网络力模型（优化设置）
    const simulation = d3.forceSimulation(nodes)
      .alpha(0.8) // 更高的alpha值加速稳定
      .alphaDecay(0.05) // 更快衰减以加速稳定
      .velocityDecay(0.4) // 更高的衰减减少震荡
      .force("link", d3.forceLink(links).id(d => d.id).distance(d => 150 - d.similarity * 80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(containerWidth / 2, containerHeight / 2));
    
    // 创建连接线
    const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line") // 比enter().append()更高效
      .attr("stroke-width", d => d.similarity * 3); // 保持原有的线宽
    
    // 创建节点
    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle") // 比enter().append()更高效
      .attr("r", d => Math.max(d.magnitude * 2, 4)) // 保持原有的节点大小
      .attr("fill", d => {
        if (d.magnitude >= 7.0) return '#d73027';
        if (d.magnitude >= 6.0) return '#fc8d59';
        if (d.magnitude >= 5.0) return '#fee08b';
        return '#c7e9c0';
      })
      .attr("stroke", d => d.id === quakeId ? "#38f" : "#fff")
      .attr("stroke-width", d => d.isCenter ? 5 : 0.1) // 保持原有的描边宽度
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
    
    // 创建更高效的工具提示
    const tooltip = d3.select("body").append("div")
      .attr("class", "earthquake-tooltip")
      .style("position", "absolute")
      .style("background", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("box-shadow", "0 0 10px rgba(0,0,0,0.2)")
      .style("pointer-events", "none")
      .style("font-size", "12px")
      .style("z-index", "1000")
      .style("contain", "content") // 性能提示
      .style("opacity", 0);
    
    // 事件处理（优化的事件操作）
    node.on("mouseover", function(event, d) {
        tooltip.transition()
          .duration(150) // 更快的过渡时间但不太短
          .style("opacity", 0.9);
        
        const formattedTime = d.time;
        
        // 工具提示内容
        let tooltipContent = `
          <strong>${d.place}</strong><br/>
          <strong>Magnitude:</strong> ${d.magnitude.toFixed(1)}<br/>
          <strong>Time:</strong> ${formattedTime}<br/>
        `;
        
        // 为非中心节点添加关系信息
        if (!d.isCenter && selectedEarthquake) {
          const relationship = links.find(link => 
            (link.source.id === d.id && link.target.id === selectedEarthquake.id) || 
            (link.target.id === d.id && link.source.id === selectedEarthquake.id)
          );
          
          if (relationship) {
            const similarityPercent = Math.round(relationship.similarity * 100);
            tooltipContent += `<strong>Similarity to selected quake:</strong> ${similarityPercent}%<br/>`;
          }
        }
        
        tooltip.html(tooltipContent)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        tooltip.transition()
          .duration(200) // 保持原来的淡出时间
          .style("opacity", 0);
      })
      .on("click", function(event, d) {
        if (d.isCenter) {
          if (onNodeHover) {
            onNodeHover(null);
          }
          return;
        }
        
        // 高亮当前点击的节点
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke", "#ff0000")
          .attr("stroke-width", 5);
        
        if (onNodeHover && d.originalData) {
          onNodeHover(d.originalData);
        }
      });
    
    // 为中心节点和高震级节点添加标签
    const label = svg.append("g")
      .selectAll("text")
      .data(nodes.filter(d => d.isCenter || d.magnitude >= 6.0 || d.isLarger)) // 保持原有的筛选
      .join("text") // 比enter().append()更高效
      .text(d => {
        if (d.isCenter) return "Selected Event";
        if (d.isLarger) return `M${d.magnitude.toFixed(1)}↑`;
        return `M${d.magnitude.toFixed(1)}`;
      })
      .style("font-size", "10px") // 保持原有的字体大小
      .style("font-weight", d => (d.isCenter || d.isLarger) ? "bold" : "normal")
      .attr("dy", -12)
      .attr("text-anchor", "middle");
    
    // 优化的位置更新
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      
      node
        .attr("cx", d => d.x = Math.max(d.magnitude * 2, Math.min(containerWidth - d.magnitude * 2, d.x || 0)))
        .attr("cy", d => d.y = Math.max(d.magnitude * 2, Math.min(containerHeight - d.magnitude * 2, d.y || 0)));
      
      label
        .attr("x", d => d.x)
        .attr("y", d => d.y);
    });
    
    // 优化模拟通过限制迭代次数并提前停止
    let tickCount = 0;
    const maxTicks = 300; // 增加最大迭代次数以获得更好的布局
    
    // 初始强制执行几个tick以获得更好的起始位置
    for (let i = 0; i < 20; i++) {
      simulation.tick();
    }
    
    // 限制实际动画帧数
    const originalTick = simulation.tick;
    simulation.tick = function() {
      tickCount++;
      if (tickCount > maxTicks) {
        simulation.stop();
        return;
      }
      return originalTick.apply(this, arguments);
    };
    
    // 合理时间后停止模拟以提高性能
    setTimeout(() => {
      simulation.stop();
    }, 2000); // 延长到2秒以获得更平滑的布局
    
    // 拖拽功能
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    // 添加图例
    const legend = svg.append("g")
      .attr("transform", "translate(10,10)");
    
    // 添加标题
    legend.append("text")
      .attr("x", 0)
      .attr("y", 0)
      .text("Earthquake Relationship Network")
      .style("font-size", "11px")
      .style("font-weight", "bold");
    
    // 节点颜色图例项
    const legendItems = [
      { color: "#d73027", label: "7.0+" },
      { color: "#fc8d59", label: "6.0-6.9" },
      { color: "#fee08b", label: "5.0-5.9" },
      { color: "#c7e9c0", label: "4.5-4.9" }
    ];
    
    legendItems.forEach((item, i) => {
      legend.append("circle")
        .attr("cx", 5)
        .attr("cy", 20 + i * 15) // 保持原有的间距
        .attr("r", 4) // 保持原有的圆圈大小
        .attr("fill", item.color);
      
      legend.append("text")
        .attr("x", 15)
        .attr("y", 23 + i * 15)
        .text(item.label)
        .style("font-size", "9px"); // 保持原有的字体大小
    });
    
    // 添加关系强度说明
    legend.append("text")
      .attr("x", 0)
      .attr("y", 23 + legendItems.length * 15 + 10)
      .text("Similarity based on:")
      .style("font-size", "9px")
      .style("font-weight", "bold");
      
    const relationshipFactors = [
      { factor: "Time Proximity", weight: "35%" },
      { factor: "Location Proximity", weight: "40%" },
      { factor: "Magnitude Similarity", weight: "15%" },
      { factor: "Depth Similarity", weight: "10%" }
    ];
    
    relationshipFactors.forEach((item, i) => {
      legend.append("text")
        .attr("x", 10)
        .attr("y", 23 + legendItems.length * 15 + 25 + i * 12)
        .text(`${item.factor} (${item.weight})`)
        .style("font-size", "8px");
    });
    
    // 添加点击说明
    legend.append("text")
      .attr("x", 0)
      .attr("y", 23 + legendItems.length * 15 + 25 + relationshipFactors.length * 12 + 4)
      .text("Tip: Hover to view details, click to highlight on map")
      .style("font-size", "9px")
      .style("font-style", "italic");
    
    // 返回清理函数
    return cleanup;
  }, [selectedEarthquake, earthquakeData, effectiveRelationships, onNodeHover]);
  
  // 如果没有选择地震，显示提示消息
  if (!selectedEarthquake) {
    return (
      <div className="relationship-network-container" style={{ 
        height: '100%', 
        width: '100%', 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: '4px',
        color: '#666'
      }}>
        <p>Please click an earthquake point on the map to view the relationship network</p>
      </div>
    );
  }
  
  return (
    <div className="relationship-network-container" style={{ 
      height: '100%', 
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '10px'
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
        Related Earthquake Network
      </h3>
      <div style={{ 
        flex: 1, 
        width: '100%', 
        position: 'relative',
        contain: 'content' // 浏览器优化提示
      }}>
        <svg 
          ref={svgRef} 
          width="100%" 
          height="100%" 
          style={{
            willChange: 'transform', // 浏览器优化提示
            contain: 'content' // 浏览器性能提示
          }}
        />
      </div>
    </div>
  );
};

export default RelationshipNetwork;