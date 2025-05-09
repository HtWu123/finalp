import json
import os
from datetime import datetime

def process_geojson_data(input_geojson_path, output_analysis_path):
    """
    处理已有的GeoJSON数据，生成分析数据
    """
    print(f"开始处理GeoJSON数据...")
    
    # 确保输出目录存在
    output_dir = os.path.dirname(output_analysis_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
    
    # 读取GeoJSON文件
    with open(input_geojson_path, 'r', encoding='utf-8') as f:
        geojson_data = json.load(f)
    
    print(f"GeoJSON数据读取完成，包含 {len(geojson_data['features'])} 个地震记录")
    
    # 添加震级分类
    def classify_magnitude(mag):
        if mag < 5.0:
            return "Moderate (4.5-4.9)"
        elif mag < 6.0:
            return "Strong (5.0-5.9)"
        elif mag < 7.0:
            return "Major (6.0-6.9)"
        else:
            return "Great (7.0+)"
    
    # 为每个地震特征添加震级分类
    print("添加震级分类...")
    for feature in geojson_data['features']:
        feature['properties']['magnitude_level'] = classify_magnitude(feature['properties']['mag'])
    
    # 提取国家/地区信息并按国家分组
    country_data = {}
    for feature in geojson_data['features']:
        place = feature['properties']['place']
        country = place.split(', ')[-1] if ', ' in place else "Unknown"
        
        if country not in country_data:
            country_data[country] = []
        
        country_data[country].append({
            'time': feature['properties']['time'],
            'depth': feature['geometry']['coordinates'][2] if len(feature['geometry']['coordinates']) > 2 else 0,
            'magnitude': feature['properties']['mag'],
            'place': feature['properties']['place'],
            'id': feature['id'],
            'magnitude_level': feature['properties']['magnitude_level'] # 添加震级分类
        })
    
    # 获取国家地震数量
    country_counts = []
    for country, quakes in country_data.items():
        country_counts.append({
            'country': country,
            'count': len(quakes)
        })
    
    # 按数量排序
    country_counts = sorted(country_counts, key=lambda x: x['count'], reverse=True)
    
    # 创建地震关系网络数据
    # 只为重大地震(震级>=5.5)创建关系网络
    print("正在创建地震关系网络...")
    quake_relationships = {}
    
    # 获取重大地震
    significant_quakes = [f for f in geojson_data['features'] if f['properties']['mag'] >= 5.5]
    print(f"将为 {len(significant_quakes)} 个重大地震创建关系网络")
    
    for i, quake1 in enumerate(significant_quakes):
        quake_id = quake1['id']
        quake_relationships[quake_id] = []
        
        if i % 10 == 0:  # 每处理10个显示一次进度
            print(f"进度: {i}/{len(significant_quakes)} ({i/len(significant_quakes)*100:.1f}%)")
        
        # 为每个重大地震，寻找距离相近且时间相近的其他地震
        for quake2 in geojson_data['features']:
            if quake1['id'] != quake2['id'] and quake2['properties']['mag'] >= 5.0:
                # 计算时间差（毫秒转天）
                time_diff = abs(quake1['properties']['time'] - quake2['properties']['time']) / (24 * 60 * 60 * 1000)
                
                # 计算位置差
                loc1 = quake1['geometry']['coordinates']
                loc2 = quake2['geometry']['coordinates']
                location_diff = ((loc1[0] - loc2[0])**2 + (loc1[1] - loc2[1])**2)**0.5
                
                # 震级差
                mag_diff = abs(quake1['properties']['mag'] - quake2['properties']['mag'])
                
                # 如果地震间隔时间不超过7天且距离不超过5度，则认为有关联
                if time_diff <= 7 and location_diff <= 5:
                    # 计算相似度（加权差异的倒数）
                    similarity = 1 / (1 + 0.3*time_diff + 0.5*location_diff + 0.2*mag_diff)
                    
                    if similarity > 0.25:  # 只包含显著关系
                        quake_relationships[quake_id].append({
                            'target_id': quake2['id'],
                            'similarity': similarity,
                            'target_mag': quake2['properties']['mag'],
                            'target_place': quake2['properties']['place'],
                            'target_time': quake2['properties']['time'],
                            'target_magnitude_level': quake2['properties']['magnitude_level'] # 添加震级分类
                        })
    
    # 创建最终数据结构
    output_data = {
        'countries': country_counts,
        'country_data': country_data,
        'relationships': quake_relationships
    }
    
    # 保存处理后的数据
    print(f"正在保存分析数据到: {output_analysis_path}")
    with open(output_analysis_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f)
    
    # 保存修改后的GeoJSON数据（包含震级分类）
    output_geojson_path = os.path.join(os.path.dirname(output_analysis_path), 'processed_map.geojson')
    print(f"正在保存更新后的GeoJSON数据到: {output_geojson_path}")
    with open(output_geojson_path, 'w', encoding='utf-8') as f:
        json.dump(geojson_data, f)
    
    print("处理完成")
    
    return output_data, geojson_data

# 使用示例
if __name__ == "__main__":
    # 输入是已有的GeoJSON文件
    input_path = 'map.json'
    output_path = './earthquake_analysis.json'
    
    process_geojson_data(input_path, output_path)