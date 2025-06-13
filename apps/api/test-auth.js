// test-auth.js
import axios from 'axios';

const BASE_URL = 'http://localhost:4000/api';

async function testEndpoints() {
  console.log('🧪 Testing auth endpoints...\n');
  
  try {
    // Test health endpoint
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health:', healthResponse.data);
    
    // Test Google auth endpoint
    console.log('\n2️⃣ Testing Google auth endpoint...');
    const authResponse = await axios.get(`${BASE_URL}/auth/google`);
    console.log('✅ Google auth URL generated:', !!authResponse.data.data.authUrl);
    console.log('🔗 Auth URL:', authResponse.data.data.authUrl);
    
    // Test callback endpoint (without code - should fail)
    console.log('\n3️⃣ Testing callback endpoint (no code)...');
    try {
      await axios.get(`${BASE_URL}/auth/google/callback`);
    } catch (error) {
      console.log('✅ Callback correctly rejects requests without code:', error.response.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testEndpoints();