require('dotenv').config();
const axios = require('axios');

const API_KEYS = {
  NEWSAPI: process.env.NEWSAPI_KEY,
  GNEWS: process.env.GNEWS_KEY,
  MEDIASTACK: process.env.MEDIASTACK_KEY,
  GUARDIAN: process.env.GUARDIAN_KEY,
  NEWSDATA: process.env.NEWSDATA_KEY,
};

async function testNewsAPI() {
  console.log('🔍 Testing NewsAPI...');
  try {
    const response = await axios.get(`https://newsapi.org/v2/top-headlines?country=us&pageSize=1&apiKey=${API_KEYS.NEWSAPI}`);
    console.log('✅ NewsAPI: Working - Status:', response.status);
    return true;
  } catch (error) {
    console.log('❌ NewsAPI: Failed -', error.response?.status, error.response?.data?.message || error.message);
    return false;
  }
}

async function testGNews() {
  console.log('🔍 Testing GNews...');
  try {
    const response = await axios.get(`https://gnews.io/api/v4/top-headlines?token=${API_KEYS.GNEWS}&lang=en&country=us&max=1`);
    console.log('✅ GNews: Working - Status:', response.status);
    return true;
  } catch (error) {
    console.log('❌ GNews: Failed -', error.response?.status, error.response?.data?.message || error.message);
    return false;
  }
}

async function testMediastack() {
  console.log('🔍 Testing Mediastack...');
  try {
    const response = await axios.get(`http://api.mediastack.com/v1/news?access_key=${API_KEYS.MEDIASTACK}&countries=us&languages=en&limit=1`);
    console.log('✅ Mediastack: Working - Status:', response.status);
    return true;
  } catch (error) {
    console.log('❌ Mediastack: Failed -', error.response?.status, error.response?.data?.error?.message || error.message);
    return false;
  }
}

async function testGuardian() {
  console.log('🔍 Testing Guardian...');
  try {
    const response = await axios.get(`https://content.guardianapis.com/search?api-key=${API_KEYS.GUARDIAN}&show-fields=all&page-size=1`);
    console.log('✅ Guardian: Working - Status:', response.status);
    return true;
  } catch (error) {
    console.log('❌ Guardian: Failed -', error.response?.status, error.response?.data?.response?.message || error.message);
    return false;
  }
}

async function testNewsdata() {
  console.log('🔍 Testing Newsdata...');
  try {
    const response = await axios.get(`https://newsdata.io/api/1/news?apikey=${API_KEYS.NEWSDATA}&country=us&language=en&size=1`);
    console.log('✅ Newsdata: Working - Status:', response.status);
    return true;
  } catch (error) {
    console.log('❌ Newsdata: Failed -', error.response?.status, error.response?.data?.results?.message || error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing all News API keys...\n');
  
  // Check if API keys are present
  console.log('📋 Checking API keys configuration:');
  for (const [name, key] of Object.entries(API_KEYS)) {
    if (key) {
      console.log(`✅ ${name}: Configured (${key.substring(0, 8)}...)`);
    } else {
      console.log(`❌ ${name}: Missing`);
    }
  }
  console.log('');

  const results = [];
  
  results.push(await testNewsAPI());
  results.push(await testGNews());
  results.push(await testMediastack());
  results.push(await testGuardian());
  results.push(await testNewsdata());

  const workingAPIs = results.filter(Boolean).length;
  const totalAPIs = results.length;

  console.log('\n📊 Summary:');
  console.log(`Working APIs: ${workingAPIs}/${totalAPIs}`);
  
  if (workingAPIs === 0) {
    console.log('❌ No APIs are working. Please check your API keys.');
    console.log('\n💡 Possible solutions:');
    console.log('1. Verify API keys are correct and active');
    console.log('2. Check if APIs have usage limits or require payment');
    console.log('3. Ensure your IP is not blocked');
    console.log('4. Try regenerating API keys from respective services');
  } else if (workingAPIs < totalAPIs) {
    console.log('⚠️  Some APIs are not working. The app will work with available APIs.');
  } else {
    console.log('🎉 All APIs are working perfectly!');
  }
}

main().catch(console.error);
