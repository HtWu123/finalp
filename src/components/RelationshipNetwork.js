// src/components/RelationshipNetwork/RelationshipNetwork.js
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const RelationshipNetwork = ({ relationships, selectedEarthquake, earthquakeData, onNodeHover }) => {
  const svgRef = useRef(null);
  const [generatedRelationships, setGeneratedRelationships] = useState(null);
  
  // This function generates relationships on the client side if none are provided
  useEffect(() => {
    if (!relationships || Object.keys(relationships).length === 0) {
      // Only generate relationships if they don't exist and we have data
      if (selectedEarthquake && earthquakeData && earthquakeData.features) {
        console.log("Generating client-side relationships for earthquake:", selectedEarthquake.id);
        
        const quakeId = selectedEarthquake.id || selectedEarthquake.properties.id;
        const newRelationships = {};
        newRelationships[quakeId] = [];
        
        // Get all earthquakes with magnitude >= 5.0
        const significantQuakes = earthquakeData.features.filter(
          eq => eq.properties.mag >= 5.0
        );
        
        // Calculate relationships
        for (const quake2 of significantQuakes) {
          // Skip comparing with itself
          if ((quake2.id || quake2.properties.id) === quakeId) continue;
          
          // Calculate time difference in days
          const time1 = selectedEarthquake.properties.time;
          const time2 = quake2.properties.time;
          const timeDiff = Math.abs(time1 - time2) / (24 * 60 * 60 * 1000);
          
          // Calculate location difference using Haversine formula for better accuracy
          const loc1 = selectedEarthquake.geometry.coordinates;
          const loc2 = quake2.geometry.coordinates;
          
          // Convert to radians
          const lat1 = loc1[1] * Math.PI / 180;
          const lon1 = loc1[0] * Math.PI / 180;
          const lat2 = loc2[1] * Math.PI / 180;
          const lon2 = loc2[0] * Math.PI / 180;
          
          // Haversine formula
          const dlon = lon2 - lon1;
          const dlat = lat2 - lat1;
          const a = Math.sin(dlat/2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon/2)**2;
          const c = 2 * Math.asin(Math.sqrt(a));
          const R = 6371; // Radius of Earth in kilometers
          const distance = c * R;
          
          // Convert distance to an approximate degree equivalent (1 degree ≈ 111 km)
          const locationDiff = distance / 111;
          
          // Calculate magnitude difference
          const magDiff = Math.abs(selectedEarthquake.properties.mag - quake2.properties.mag);
          
          // Calculate depth difference (might be useful as another factor)
          const depthDiff = Math.abs(loc1[2] - loc2[2]) / 100; // Normalize by 100km
          
          // Calculate similarity - consider related if within 7 days and 5 degrees distance
          if (timeDiff <= 7 && locationDiff <= 5) {
            // Adjusted similarity formula with depth factor
            const similarity = 1 / (1 + 0.25*timeDiff + 0.4*locationDiff + 0.15*magDiff + 0.2*depthDiff);
            
            // Only include significant relationships
            if (similarity > 0.25) {
              const isLargerQuake = quake2.properties.mag > selectedEarthquake.properties.mag;
              
              newRelationships[quakeId].push({
                target_id: quake2.id || quake2.properties.id,
                similarity: similarity, // Fixed the variable name from adjustedSimilarity to similarity
                target_mag: quake2.properties.mag,
                target_place: quake2.properties.place,
                target_time: quake2.properties.time,
                target_magnitude_level: quake2.properties.magnitude_level || 
                  (quake2.properties.mag >= 7.0 ? "Great (7.0+)" :
                   quake2.properties.mag >= 6.0 ? "Major (6.0-6.9)" :
                   quake2.properties.mag >= 5.0 ? "Strong (5.0-5.9)" :
                   "Moderate (4.5-4.9)"),
                isLarger: isLargerQuake  // 标记是否是更大震级的地震
              });
            }
          }
        }
        
        // Sort by similarity (highest first)
        newRelationships[quakeId].sort((a, b) => b.similarity - a.similarity);
        
        // Limit to top 10 most similar earthquakes for better visualization
        if (newRelationships[quakeId].length > 10) {
          newRelationships[quakeId] = newRelationships[quakeId].slice(0, 10);
        }
        
        console.log(`Generated ${newRelationships[quakeId].length} relationships`);
        setGeneratedRelationships(newRelationships);
      }
    }
  }, [selectedEarthquake, earthquakeData, relationships]);
  
  // Use either provided relationships or generated ones
  const effectiveRelationships = relationships && Object.keys(relationships).length > 0 
    ? relationships 
    : generatedRelationships;
  
  useEffect(() => {
    // Ensure all necessary data exists, and we're in client environment
    if (!selectedEarthquake || !earthquakeData || !svgRef.current || typeof window === 'undefined') return;
    
    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Remove any existing tooltips from previous renders
    d3.select("body").selectAll(".earthquake-tooltip").remove();
    
    // Get the earthquake ID
    const quakeId = selectedEarthquake.id || selectedEarthquake.properties.id;
    
    // Get relationships for this earthquake
    const quakeRelationships = effectiveRelationships && effectiveRelationships[quakeId] 
      ? effectiveRelationships[quakeId] 
      : [];
    
    // If no relationships, show message
    if (quakeRelationships.length === 0) {
      const svg = d3.select(svgRef.current);
      svg.append("text")
        .attr("x", 20)
        .attr("y", 50)
        .text("No related earthquakes found for this event")
        .style("font-size", "12px")
        .style("fill", "#666");//灰色
      return;
    }
    
    // Prepare network data
    const nodes = [
      // Center node (selected earthquake)
      {
        id: quakeId,
        magnitude: selectedEarthquake.properties.mag,
        place: selectedEarthquake.properties.place,
        isCenter: true,
        time: new Date(selectedEarthquake.properties.time).toLocaleString(),
        // 存储原始地震数据的引用，用于地图高亮
        originalData: selectedEarthquake
      }
    ];
    
    const links = [];
    
    // Add related earthquakes
    quakeRelationships.forEach(rel => {
      // 找到原始地震数据，用于在地图上高亮
      const originalQuake = earthquakeData.features.find(
        eq => (eq.id || eq.properties.id) === rel.target_id
      );
      
      nodes.push({
        id: rel.target_id,
        magnitude: rel.target_mag,
        place: rel.target_place,
        isCenter: false,
        isLarger: rel.isLarger, // 添加是否是更大地震的标记
        time: new Date(rel.target_time).toLocaleString(),
        // 存储原始地震数据的引用，用于地图高亮
        originalData: originalQuake
      });
      
      links.push({
        source: quakeId,
        target: rel.target_id,
        similarity: rel.similarity
      });
    });
    
    // Get container dimensions
    const containerWidth = svgRef.current.clientWidth || 300;
    const containerHeight = svgRef.current.clientHeight || 200;
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", containerWidth)
      .attr("height", containerHeight);
    
    // Create network's force model
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(d => 150 - d.similarity * 80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(containerWidth / 2, containerHeight / 2));
    
    // Create links
    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke-width", d => d.similarity * 3) // Thicker lines for stronger relationships
      .attr("stroke", "#999")//淡灰色
      .attr("stroke-opacity", 0.6);
    
    // Create nodes
    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", d => Math.max(d.magnitude * 2, 4))
      .attr("fill", d => {
        // if (d.isCenter) return "#000000"; // Center node is black
        // if (d.isLarger) return '#8b0000'; // Larger magnitude earthquakes get a darker red
        
        // Other nodes colored by magnitude
        if (d.magnitude >= 7.0) return '#d73027';
        if (d.magnitude >= 6.0) return '#fc8d59';
        if (d.magnitude >= 5.0) return '#fee08b';
        return '#c7e9c0';
      })
      .attr("stroke", d => {
        // Check if this node is the selected (clicked) earthquake
        if (d.id === quakeId) { 
          return "#38f"; // Blue ring for selected earthquake
        }
        return "#fff"; // Default white border
      })
      .attr("stroke-width", d => d.isCenter ? 5 : 0.1)
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
    
    // Create a more interactive tooltip div instead of using the default title attribute
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
      .style("opacity", 0);
    
    // 添加悬停显示tooltip的效果
    node.on("mouseover", function(event, d) {
        // 仅显示tooltip，不高亮节点和地图上的点
        tooltip.transition()
          .duration(200)
          .style("opacity", 0.9);
        
        // Format the time
        const formattedTime = d.time;
        
        // Create tooltip content with HTML for better formatting
        let tooltipContent = `
          <strong>${d.place}</strong><br/>
          <strong>Magnitude:</strong> ${d.magnitude.toFixed(1)}<br/>
          <strong>Time:</strong> ${formattedTime}<br/>
        `;
        
        // Add relationship info if this is not the center node
        if (!d.isCenter && selectedEarthquake) {
          // Find this node's relationship with the center
          const relationship = links.find(link => 
            (link.source.id === d.id && link.target.id === selectedEarthquake.id) || 
            (link.target.id === d.id && link.source.id === selectedEarthquake.id)
          );
          
          if (relationship) {
            const similarityPercent = Math.round(relationship.similarity * 100);
            tooltipContent += `<strong>Similarity to selected quake:</strong> ${similarityPercent}%<br/>`;
          }
        }
        
        // Set tooltip content and position
        tooltip.html(tooltipContent)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        // Hide tooltip
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      })
      // 添加点击事件
      .on("click", function(event, d) {
        // 清除所有节点的高亮
        // node.transition()
        //   .duration(200)
        //   .attr("stroke", "#fff")//白色
        //   .attr("stroke-width", d => d.isCenter ? 2 : 1);
        // 如果点击的是中心节点，取消选择
        if (d.isCenter) {
          // 调用传入的onNodeHover回调，传递null表示取消选择
          if (onNodeHover) {
            onNodeHover(null);
          }
          return;
        }
        
        // 高亮当前点击的节点
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke", "#ff0000")//红色
          .attr("stroke-width", 5);
        
        // 调用传入的onNodeHover回调，传递原始地震数据
        if (onNodeHover && d.originalData) {
          onNodeHover(d.originalData);
        }
      });
    
    // Add labels for center node and high-magnitude nodes
    const label = svg.append("g")
      .selectAll("text")
      .data(nodes.filter(d => d.isCenter || d.magnitude >= 6.0 || d.isLarger))
      .enter()
      .append("text")
      .text(d => {
        if (d.isCenter) return "Selected Event";
        if (d.isLarger) return `M${d.magnitude.toFixed(1)}↑`; // 添加上箭头表示更大震级
        return `M${d.magnitude.toFixed(1)}`;
      })
      .style("font-size", "10px")
      .style("font-weight", d => (d.isCenter || d.isLarger) ? "bold" : "normal")
      .attr("dy", -12)
      .attr("text-anchor", "middle");
    
    // Update positions during simulation
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
    
    // Drag functions
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
    
    // Add legend
    const legend = svg.append("g")
      .attr("transform", "translate(10,10)");
    
    // Add title
    legend.append("text")
      .attr("x", 0)
      .attr("y", 0)
      .text("Earthquake Relationship Network")
      .style("font-size", "11px")
      .style("font-weight", "bold");
    
    // Node color legend items
    const legendItems = [
      // { color: "#000000", label: "Selected Event" },
      // { color: "#8b0000", label: "Larger Magnitude Quake" },
      { color: "#ff0000", label: "7.0+" },
      { color: "#fc8d59", label: "6.0-6.9" },
      { color: "#fee08b", label: "5.0-5.9" },
      { color: "#c7e9c0", label: "4.5-4.9" }
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
    
    // Add relationship strength explanation
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
    
    // Add click instruction
    legend.append("text")
      .attr("x", 0)
      .attr("y", 23 + legendItems.length * 15 + 25 + relationshipFactors.length * 12 + 4)
      .text("Tip: Hover to view details, click to highlight on map")
      .style("font-size", "9px")
      .style("font-style", "italic");
    
  }, [selectedEarthquake, earthquakeData, effectiveRelationships, onNodeHover]);
  
  // If no earthquake selected, show prompt message
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
      <div style={{ flex: 1, width: '100%', position: 'relative' }}>
        <svg ref={svgRef} width="100%" height="100%" />
      </div>
    </div>
  );
};

export default RelationshipNetwork;