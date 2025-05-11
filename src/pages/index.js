// src/pages/index.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import WorldMap from '../components/WorldMap.js';
import DepthTimeChart from '../components/DepthTimeChart.js';
import MagnitudeFilter from '../components/MagnitudeFilter.js';
import DateFilter from '../components/DateFilter.js';
import styles from '../styles/Home.module.css';

// 使用动态导入并禁用SSR，避免window未定义错误
const RelationshipNetwork = dynamic(
  () => import('../components/RelationshipNetwork.js'),
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
  const [selectedNetworkNode, setSelectedNetworkNode] = useState(null); // 改名：存储关系网络中选中的节点
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false); // 控制面板显示状态

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
            const originalResponse = await fetch('/data/map.geojson');
            if (!originalResponse.ok) {
              throw new Error(`Unable to load GeoJSON data: ${originalResponse.statusText}`);
            }
            geoJsonData = await originalResponse.json();
            console.log("Loaded raw GeoJSON data");
          }
        } catch (err) {
          console.error("GeoJSON loading failed, trying backup path", err);
          const backupResponse = await fetch('/data/geo.json');
          if (!backupResponse.ok) {
            throw new Error(`Unable to load GeoJSON data: ${backupResponse.statusText}`);
          }
          geoJsonData = await backupResponse.json();
          console.log("Loaded backup GeoJSON data");
        }

        console.log(`GeoJSON contains ${geoJsonData.features.length} features`);
        if (geoJsonData.features.length > 0) {
          const sample = geoJsonData.features[0];
          console.log("Sample data:", {
            id: sample.id,
            properties: sample.properties,
            coordinates: sample.geometry.coordinates,
          });

          const hasMagnitudeLevel = sample.properties.magnitude_level !== undefined;
          console.log("Contains magnitude classification:", hasMagnitudeLevel);
        }

        let analysisData;
        try {
          const analysisResponse = await fetch('/data/earthquake_analysis.json');
          if (analysisResponse.ok) {
            analysisData = await analysisResponse.json();
            console.log("Loaded analysis data");
          } else {
            console.log('Analysis data not found, creating basic analysis data...');
            analysisData = createBasicAnalysisData(geoJsonData);
          }
        } catch (err) {
          console.warn('Failed to load analysis data, generating basic data', err);
          analysisData = createBasicAnalysisData(geoJsonData);
        }

        setEarthquakeData(geoJsonData);
        setAnalysisData(analysisData);
        setLoading(false);
      } catch (err) {
        console.error('Data loading error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 如果分析数据不存在，创建基本分析数据
  const createBasicAnalysisData = (geoJsonData) => {
    console.log("Generating basic analysis data on client");

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

    geoJsonData.features = processedFeatures;

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

    const countryCountsArray = Object.entries(countryCounts).map(([country, count]) => ({
      country,
      count
    }));

    countryCountsArray.sort((a, b) => b.count - a.count);

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
  };

  // 处理地震点击事件
  const handleEarthquakeClick = (earthquake) => {
    setSelectedEarthquake(earthquake);
    setIsPanelOpen(true);
  };

  // 处理关系网络节点点击事件
  const handleNetworkNodeClick = (earthquake) => {
    setSelectedNetworkNode(earthquake);
  };

  // 关闭面板的处理函数
  const handleClosePanel = () => {
    setIsPanelOpen(false);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Global Earthquake Event Analysis</title>
        <meta name="description" content="A visualization tool to analyze global earthquake events" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Global Earthquake Event Analysis
        </h1>

        <p className={styles.description}>
          Explore recent earthquake data to help you plan your travel
        </p>

        {loading ? (
          <div className={styles.loading}>Loading data...</div>
        ) : error ? (
          <div className={styles.error}>
            <p>Error loading data:</p>
            <p>{error}</p>
            <p>Please make sure your data file is located at: public/data/map.geojson</p>
          </div>
        ) : (
          <div className={styles.contentContainer}>
            <div className={styles.filtersContainer}>
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
                selectedNetworkNode={selectedNetworkNode}
              />
            </div>

            {/* 使用新的详情面板实现 */}
            <div className={`${styles.detailPanel} ${isPanelOpen ? styles.open : ''}`}>
              <div className={styles.panelHeader}>
                {selectedEarthquake && (
                  <h2 className={styles.panelTitle}>
                    Earthquake Details: {selectedEarthquake.properties.place} (Magnitude {selectedEarthquake.properties.mag})
                  </h2>
                )}
                <button 
                  className={styles.closeButton}
                  onClick={handleClosePanel}
                  aria-label="Close panel"
                >
                  ×
                </button>
              </div>

              <div className={styles.panelContent}>
                <div className={styles.chartContainer}>
                  <DepthTimeChart 
                    countryData={analysisData?.country_data} 
                    country={selectedCountry} 
                  />
                </div>

                <div className={styles.chartContainer}>
                  {selectedEarthquake ? (
                    <RelationshipNetwork 
                      relationships={analysisData?.relationships}
                      selectedEarthquake={selectedEarthquake}
                      earthquakeData={earthquakeData}
                      onNodeHover={handleNetworkNodeClick}
                    />
                  ) : (
                    <div className={styles.selectPrompt}>
                      <p>Please click an earthquake point on the map to view the relationship network</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>NYU Shanghai - Spring 2025</p>
        <p>Haotong Wu hw2933, Lisa Lin xl4190, Yitan Li yl9314</p>
      </footer>
    </div>
  );
}