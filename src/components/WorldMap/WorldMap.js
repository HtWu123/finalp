// src/components/WorldMap/WorldMap.js
import dynamic from 'next/dynamic';

// 动态导入 Leaflet 组件，禁用 SSR 以避免 window 未定义错误
const MapWithNoSSR = dynamic(
  () => import('./MapComponent'),
  { ssr: false }
);

const WorldMap = (props) => {
  return <MapWithNoSSR {...props} />;
};

export default WorldMap;