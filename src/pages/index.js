// src/pages/index.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import WorldMap from '../components/WorldMap/WorldMap';
import DepthTimeChart from '../components/DepthTimeChart/DepthTimeChart';
import MagnitudeFilter from '../components/Filters/MagnitudeFilter';
import DateFilter from '../components/Filters/DateFilter';
import styles from '../styles/Home.module.css';

// 使用动态导入并禁用SSR，避免window未定义错误
const RelationshipNetwork = dynamic(
  () => import('../components/RelationshipNetwork/RelationshipNetwork'),
  { ssr: false }
);

export default function Home() {
  // 状态
  const [earthquakeData, setEarthquakeData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [selectedMagnitude, setSelectedMagnitude] = useState('All');
  const [selectedDateRange, setSelectedDateRange] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedEarthquake, setSelectedEarthquake] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 加载数据 - 使用useEffect确保只在客户端执行
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 首先尝试加载处理后的GeoJSON数据（如果存在）
        let geoJsonData;
        try {
          const processedResponse = await fetch('/data/processed_map.geojson');
          if (processedResponse.ok) {
            geoJsonData = await processedResponse.json();
            console.log("已加载处理后的GeoJSON数据");
          } else {
            // 如果不存在，则加载原始数据
            const originalResponse = await fetch('/data/map.geojson');
            if (!originalResponse.ok) {
              throw new Error(`无法加载GeoJSON数据: ${originalResponse.statusText}`);
            }
            geoJsonData = await originalResponse.json();
            console.log("已加载原始GeoJSON数据");
          }
        } catch (err) {
          console.error("加载GeoJSON失败，尝试备用文件路径", err);
          // 尝试其他可能的文件名
          const backupResponse = await fetch('/data/geo.json');
          if (!backupResponse.ok) {
            throw new Error(`无法加载GeoJSON数据: ${backupResponse.statusText}`);
          }
          geoJsonData = await backupResponse.json();
          console.log("已加载备用GeoJSON数据");
        }
        
        // 检查并记录数据内容
        console.log(`GeoJSON数据包含 ${geoJsonData.features.length} 条记录`);
        if (geoJsonData.features.length > 0) {
          const sample = geoJsonData.features[0];
          console.log("数据样例:", {
            id: sample.id,
            properties: sample.properties,
            coordinates: sample.geometry.coordinates,
          });
          
          // 检查是否已有震级分类
          const hasMagnitudeLevel = sample.properties.magnitude_level !== undefined;
          console.log("数据中包含震级分类:", hasMagnitudeLevel);
        }
        
        let analysisData;
        try {
          // 加载分析数据
          const analysisResponse = await fetch('/data/earthquake_analysis.json');
          if (analysisResponse.ok) {
            analysisData = await analysisResponse.json();
            console.log("已加载分析数据");
          } else {
            // 如果分析数据不存在，在前端创建基本分析数据
            console.log('分析数据不存在，正在创建基本分析数据...');
            analysisData = createBasicAnalysisData(geoJsonData);
          }
        } catch (err) {
          console.warn('无法加载分析数据，创建基本分析数据', err);
          analysisData = createBasicAnalysisData(geoJsonData);
        }
        
        setEarthquakeData(geoJsonData);
        setAnalysisData(analysisData);
        setLoading(false);
      } catch (err) {
        console.error('数据加载错误:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // 如果分析数据不存在，创建基本分析数据
  const createBasicAnalysisData = (geoJsonData) => {
    console.log("在前端创建基本分析数据");
    
    // 为所有地震动态添加震级分类
    const processedFeatures = geoJsonData.features.map(feature => {
      if (!feature.properties.magnitude_level) {
        const mag = feature.properties.mag;
        let level;
        if (mag < 5.0) level = "Moderate (4.5-4.9)";
        else if (mag < 6.0) level = "Strong (5.0-5.9)";
        else if (mag < 7.0) level = "Major (6.0-6.9)";
        else level = "Great (7.0+)";
        
        feature.properties.magnitude_level = level;
      }
      return feature;
    });
    
    // 修改原始数据以包含震级分类
    geoJsonData.features = processedFeatures;
    
    // 提取国家/地区信息并按国家分组
    const countryData = {};
    const countryCounts = {};
    
    for (const feature of geoJsonData.features) {
      const place = feature.properties.place;
      const country = place.includes(', ') ? place.split(', ').pop() : "Unknown";
      
      if (!countryData[country]) {
        countryData[country] = [];
        countryCounts[country] = 0;
      }
      
      countryCounts[country]++;
      
      countryData[country].push({
        time: feature.properties.time,
        depth: feature.geometry.coordinates[2] || 0,
        magnitude: feature.properties.mag,
        place: feature.properties.place,
        id: feature.id,
        magnitude_level: feature.properties.magnitude_level
      });
    }
    
    // 转换国家计数对象为数组
    const countryCountsArray = Object.entries(countryCounts).map(([country, count]) => ({
      country,
      count
    }));
    
    // 按计数排序
    countryCountsArray.sort((a, b) => b.count - a.count);
    
    // 创建空的关系数据（这部分需要在后端处理，比较复杂）
    const relationships = {};
    
    return {
      countries: countryCountsArray,
      country_data: countryData,
      relationships: relationships
    };
  };

  // 处理地震悬停事件
  const handleEarthquakeHover = (country, earthquake) => {
    setSelectedCountry(country);
    // 不设置selectedEarthquake，因为这只是悬停
  };

  // 处理地震点击事件
  const handleEarthquakeClick = (earthquake) => {
    setSelectedEarthquake(earthquake);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>全球地震事件分析</title>
        <meta name="description" content="分析全球地震事件的可视化工具" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          全球地震事件分析
        </h1>
        
        <p className={styles.description}>
          探索近期地震数据以帮助您计划旅行
        </p>

        {loading ? (
          <div className={styles.loading}>数据加载中...</div>
        ) : error ? (
          <div className={styles.error}>
            <p>加载数据时出错：</p>
            <p>{error}</p>
            <p>请确保您的数据文件位于正确的位置: public/data/map.geojson</p>
          </div>
        ) : (
          <>
            <div className={styles.filters}>
              <MagnitudeFilter 
                selectedMagnitude={selectedMagnitude} 
                onMagnitudeChange={setSelectedMagnitude} 
              />
              <DateFilter 
                selectedDateRange={selectedDateRange} 
                onDateRangeChange={setSelectedDateRange} 
              />
            </div>

            <div className={styles.mapContainer}>
              <WorldMap 
                earthquakeData={earthquakeData}
                selectedMagnitude={selectedMagnitude}
                selectedDateRange={selectedDateRange}
                onEarthquakeHover={handleEarthquakeHover}
                onEarthquakeClick={handleEarthquakeClick}
              />
            </div>

            <div className={styles.chartsContainer}>
              <div className={styles.chartBox}>
                <DepthTimeChart 
                  countryData={analysisData?.country_data} 
                  country={selectedCountry} 
                />
              </div>
              
              <div className={styles.chartBox}>
                {selectedEarthquake ? (
                  <RelationshipNetwork 
                    relationships={analysisData?.relationships}
                    selectedEarthquake={selectedEarthquake}
                    earthquakeData={earthquakeData}
                  />
                ) : (
                  <div className={styles.selectPrompt}>
                    <p>请点击地图上的地震点查看关系网络</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <footer className={styles.footer}>
        <p>NYU Shanghai - Spring 2025</p>
        <p>Haotong Wu hw2933, Lisa Lin xl4190, Yitan Li yl9314</p>
      </footer>
    </div>
  );
}