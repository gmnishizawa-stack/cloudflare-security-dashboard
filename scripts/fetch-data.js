#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const API_TOKEN = process.env.CF_API_TOKEN;

if (!API_TOKEN) {
  console.error('❌ CF_API_TOKEN が設定されていません');
  process.exit(1);
}

async function fetchRadarAPI(endpoint) {
  const url = `https://api.cloudflare.com/client/v4/radar${endpoint}`;
  console.log(`📡 ${endpoint}`);
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${API_TOKEN}` }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API request failed: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  return data.result;
}

async function main() {
  console.log('🚀 Cloudflare Radarデータ取得開始...\n');
  
  try {
    const dateRange = '7d';
    
    // グローバルデータ
    console.log('🌍 グローバルデータ取得中...');
    
    // Layer 7 (HTTP/アプリケーション層)
    const globalL7Timeseries = await fetchRadarAPI(`/attacks/layer7/timeseries?dateRange=${dateRange}&format=json`);
    const globalL7Summary = await fetchRadarAPI(`/attacks/layer7/summary/mitigation_product?dateRange=${dateRange}&format=json`);
    const globalL7Locations = await fetchRadarAPI(`/attacks/layer7/top/locations/target?dateRange=${dateRange}&format=json&limit=10`);
    
    // Layer 3 (ネットワーク層/DDoS)
    const globalL3Timeseries = await fetchRadarAPI(`/attacks/layer3/timeseries?dateRange=${dateRange}&format=json`);
    const globalL3Protocol = await fetchRadarAPI(`/attacks/layer3/summary/protocol?dateRange=${dateRange}&format=json`);
    
    // ボットトラフィック
    const globalBotClass = await fetchRadarAPI(`/http/summary/bot_class?dateRange=${dateRange}&format=json`);
    
    // 日本データ
    console.log('🇯🇵 日本データ取得中...');
    
    // Layer 7
    const japanL7Timeseries = await fetchRadarAPI(`/attacks/layer7/timeseries?dateRange=${dateRange}&format=json&location=JP`);
    const japanL7Summary = await fetchRadarAPI(`/attacks/layer7/summary/mitigation_product?dateRange=${dateRange}&format=json&location=JP`);
    const japanL7Sources = await fetchRadarAPI(`/attacks/layer7/top/locations/origin?dateRange=${dateRange}&format=json&location=JP&limit=10`);
    
    // Layer 3
    const japanL3Timeseries = await fetchRadarAPI(`/attacks/layer3/timeseries?dateRange=${dateRange}&format=json&location=JP`);
    const japanL3Protocol = await fetchRadarAPI(`/attacks/layer3/summary/protocol?dateRange=${dateRange}&format=json&location=JP`);
    
    // ボット
    const japanBotClass = await fetchRadarAPI(`/http/summary/bot_class?dateRange=${dateRange}&format=json&location=JP`);
    
    // データ整形
    const timestamp = new Date().toISOString();
    
    const output = {
      timestamp,
      updated: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      global: {
        layer7: {
          timeseries: globalL7Timeseries,
          summary: globalL7Summary,
          locations: globalL7Locations
        },
        layer3: {
          timeseries: globalL3Timeseries,
          protocol: globalL3Protocol
        },
        bot: {
          class: globalBotClass
        }
      },
      japan: {
        layer7: {
          timeseries: japanL7Timeseries,
          summary: japanL7Summary,
          sources: japanL7Sources
        },
        layer3: {
          timeseries: japanL3Timeseries,
          protocol: japanL3Protocol
        },
        bot: {
          class: japanBotClass
        }
      }
    };
    
    // JSONファイルに保存
    const dataDir = path.join(__dirname, '..', 'public', 'data');
    const outputPath = path.join(dataDir, 'latest.json');
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    console.log('\n✅ データ取得完了！');
    console.log(`📁 保存先: ${outputPath}`);
    console.log(`⏰ 取得時刻: ${output.updated}`);
    console.log('\n📊 取得データ:');
    console.log(`  ✅ Layer 7攻撃（WAF/DDoS/HTTP）`);
    console.log(`  ✅ Layer 3攻撃（DDoS/ネットワーク）`);
    console.log(`  ✅ ボットトラフィック`);
    console.log(`  ✅ グローバル + 日本`);
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:');
    console.error(error.message);
    process.exit(1);
  }
}

main();