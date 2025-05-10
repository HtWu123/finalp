// src/components/RelationshipNetwork/RelationshipNetwork.js
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const RelationshipNetwork = ({ relationships, selectedEarthquake, earthquakeData }) => {
  const svgRef = useRef(null);
  
  useEffect(() => {
    // 确保所有必要的数据都存在，并且在客户端环境中
    if (!relationships || !selectedEarthquake || !earthquakeData || !svgRef.current || typeof window === 'undefined') return;
    
    // 清除先前的可视化
    d3.select(svgRef.current).selectAll("*").remove();
    
    // 获取选定地震的关系
    const quakeId = selectedEarthquake.properties.id;
    const quakeRelationships = relationships[quakeId] || [];
    
    // 如果没有关系，显示消息
    if (quakeRelationships.length === 0) {
      const svg = d3.select(svgRef.current);
      svg.append("text")
        .attr("x", 20)
        .attr("y", 50)
        .text("没有找到与此事件相关的地震")
        .style("font-size", "12px")
        .style("fill", "#666");
      return;
    }
    
    // 准备网络数据
    const nodes = [
      // 中心节点（选定的地震）
      {
        id: quakeId,
        magnitude: selectedEarthquake.properties.mag,
        place: selectedEarthquake.properties.place,
        isCenter: true,
        time: new Date(selectedEarthquake.properties.time).toLocaleString()
      }
    ];
    
    const links = [];
    
    // 添加相关地震
    quakeRelationships.forEach(rel => {
      nodes.push({
        id: rel.target_id,
        magnitude: rel.target_mag,
        place: rel.target_place,
        isCenter: false,
        time: new Date(rel.target_time).toLocaleString()
      });
      
      links.push({
        source: quakeId,
        target: rel.target_id,
        similarity: rel.similarity
      });
    });
    
    // 获取容器尺寸
    const containerWidth = svgRef.current.clientWidth || 300;
    const containerHeight = svgRef.current.clientHeight || 200;
    
    // 创建SVG
    const svg = d3.select(svgRef.current)
      .attr("width", containerWidth)
      .attr("height", containerHeight);
    
    // 创建网络的力模型
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(d => 150 - d.similarity * 80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(containerWidth / 2, containerHeight / 2));
    
    // 创建连接线
    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke-width", d => d.similarity * 2)
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6);
    
    // 创建节点
    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", d => Math.max(d.magnitude * 2, 4))
      .attr("fill", d => {
        if (d.isCenter) return "#ff4500"; // 中心节点为橙红色
        
        // 其他节点按震级着色
        if (d.magnitude >= 7.0) return '#d73027';
        if (d.magnitude >= 6.0) return '#fc8d59';
        if (d.magnitude >= 5.0) return '#fee08b';
        return '#91bfdb';
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", d => d.isCenter ? 2 : 1)
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
    
    // 添加工具提示
    node.append("title")
      .text(d => `${d.place}\n震级: ${d.magnitude}\n时间: ${d.time}`);
    
    // 仅对中心节点和高震级节点添加标签
    const label = svg.append("g")
      .selectAll("text")
      .data(nodes.filter(d => d.isCenter || d.magnitude >= 6.0))
      .enter()
      .append("text")
      .text(d => d.isCenter ? "当前事件" : `M${d.magnitude.toFixed(1)}`)
      .style("font-size", "9px")
      .style("font-weight", d => d.isCenter ? "bold" : "normal")
      .attr("dy", -10)
      .attr("text-anchor", "middle");
    
    // 在模拟过程中更新位置
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      
      node
        .attr("cx", d => d.x = Math.max(d.magnitude * 2, Math.min(containerWidth - d.magnitude * 2, d.x)))
        .attr("cy", d => d.y = Math.max(d.magnitude * 2, Math.min(containerHeight - d.magnitude * 2, d.y)));
      
      label
        .attr("x", d => d.x)
        .attr("y", d => d.y);
    });
    
    // 拖拽函数
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
    
    // 添加图例 - 在面板模式下简化图例
    const legend = svg.append("g")
      .attr("transform", "translate(10,10)");
    
    // 添加标题
    legend.append("text")
      .attr("x", 0)
      .attr("y", 0)
      .text("地震关系网络")
      .style("font-size", "11px")
      .style("font-weight", "bold");
    
    // 节点颜色图例项目（简化版）
    const legendItems = [
      { color: "#ff4500", label: "当前事件" },
      { color: "#d73027", label: "7.0+" },
      { color: "#fc8d59", label: "6.0-6.9" },
      { color: "#fee08b", label: "5.0-5.9" },
      { color: "#91bfdb", label: "4.5-4.9" }
    ];
    
    legendItems.forEach((item, i) => {
      legend.append("circle")
        .attr("cx", 5)
        .attr("cy", 20 + i * 15)
        .attr("r", 4)
        .attr("fill", item.color);
      
      legend.append("text")
        .attr("x", 15)
        .attr("y", 23 + i * 15)
        .text(item.label)
        .style("font-size", "9px");
    });
    
  }, [relationships, selectedEarthquake, earthquakeData]);
  
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
        <p>请点击地图上的地震点查看关系网络</p>
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
        相关地震网络
      </h3>
      <div style={{ flex: 1, width: '100%', position: 'relative' }}>
        <svg ref={svgRef} width="100%" height="100%" />
      </div>
    </div>
  );
};

export default RelationshipNetwork;