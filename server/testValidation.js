const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/v1';

console.log('🧪 Testing Enhanced Validation & Error Handling...\n');

async function testValidation() {
  const tests = [
    {
      name: '1. Invalid Email Format',
      method: 'POST',
      url: `${API_BASE}/users/signup`,
      data: {
        fullName: 'Test User',
        username: 'testuser123',
        email: 'invalid-email',
        password: 'Password123'
      },
      expectStatus: 400
    },
    {
      name: '2. Weak Password',
      method: 'POST',
      url: `${API_BASE}/users/signup`,
      data: {
        fullName: 'Test User',
        username: 'testuser123',
        email: 'test@example.com',
        password: '123' // Too short, no uppercase/lowercase
      },
      expectStatus: 400
    },
    {
      name: '3. Invalid Username Characters',
      method: 'POST',
      url: `${API_BASE}/users/signup`,
      data: {
        fullName: 'Test User',
        username: 'test@user!', // Invalid characters
        email: 'test@example.com',
        password: 'Password123'
      },
      expectStatus: 400
    },
    {
      name: '4. Missing Required Fields',
      method: 'POST',
      url: `${API_BASE}/users/login`,
      data: {
        identifier: '' // Empty identifier
      },
      expectStatus: 400
    },
    {
      name: '5. XSS Attempt in Full Name',
      method: 'POST',
      url: `${API_BASE}/users/signup`,
      data: {
        fullName: '<script>alert("xss")</script>',
        username: 'testuser456',
        email: 'test2@example.com',
        password: 'Password123'
      },
      expectStatus: 400 // Should be sanitized and fail validation
    }
  ];

  for (const test of tests) {
    try {
      console.log(`🔍 ${test.name}`);
      
      const response = await axios({
        method: test.method,
        url: test.url,
        data: test.data,
        validateStatus: () => true // Don't throw on error status codes
      });

      if (response.status === test.expectStatus) {
        console.log(`   ✅ Expected status ${test.expectStatus}: ${response.status}`);
        if (response.data.errors) {
          console.log(`   📝 Validation errors:`, response.data.errors.map(e => e.message).join(', '));
        } else if (response.data.message) {
          console.log(`   📝 Message: ${response.data.message}`);
        }
      } else {
        console.log(`   ❌ Expected ${test.expectStatus}, got ${response.status}`);
        console.log(`   📝 Response:`, response.data);
      }
      
      console.log('');
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}\n`);
    }
  }

  // Test successful signup
  console.log('🔍 6. Valid Signup Request');
  try {
    const response = await axios.post(`${API_BASE}/users/signup`, {
      fullName: 'John Doe',
      username: 'johndoe123',
      email: 'john.doe@example.com',
      password: 'SecurePassword123'
    });

    if (response.status === 201) {
      console.log('   ✅ Valid signup successful');
      console.log('   📝 Response:', response.data);
    }
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('   ✅ User already exists (expected)');
      console.log('   📝 Error:', error.response.data);
    } else {
      console.log('   ❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

// Only run if server is available
console.log('⚡ Starting validation tests (make sure server is running on port 5000)...\n');
testValidation().catch(err => {
  console.error('❌ Test suite failed:', err.message);
  console.log('💡 Make sure your server is running: npm run dev');
});
