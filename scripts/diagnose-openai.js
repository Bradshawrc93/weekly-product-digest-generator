require('dotenv').config();
const OpenAI = require('openai');

async function diagnoseOpenAI() {
  console.log('🔍 Comprehensive OpenAI API Diagnosis...\n');
  
  // Check environment
  const apiKey = process.env.OPENAI_API_KEY;
  console.log(`📋 Environment Check:`);
  console.log(`   • API Key present: ${apiKey ? 'YES' : 'NO'}`);
  console.log(`   • Key starts with: ${apiKey ? apiKey.substring(0, 10) + '...' : 'N/A'}`);
  console.log(`   • Key length: ${apiKey ? apiKey.length : 0} characters`);
  console.log(`   • Key format: ${apiKey ? (apiKey.startsWith('sk-') ? 'Valid format' : 'Invalid format') : 'N/A'}\n`);
  
  if (!apiKey) {
    console.log('❌ No API key found. Please check your .env file.');
    return;
  }
  
  try {
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    console.log('📡 Testing with minimal request...');
    
    // Try a very minimal request
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Hi"
        }
      ],
      max_tokens: 5
    });
    
    console.log('✅ SUCCESS! API call worked.');
    console.log(`📄 Response: ${completion.choices[0].message.content}`);
    console.log(`📊 Usage:`, completion.usage);
    console.log(`🆔 Request ID: ${completion.id}`);
    
    console.log('\n🎉 Your API key is working! The 429 errors might be from:');
    console.log('   • Rate limiting (too many requests too quickly)');
    console.log('   • Temporary API issues');
    console.log('   • Network connectivity issues');
    
  } catch (error) {
    console.error('❌ API Error Details:');
    console.error(`   • Status: ${error.status}`);
    console.error(`   • Message: ${error.message}`);
    console.error(`   • Type: ${error.type || 'Unknown'}`);
    console.error(`   • Code: ${error.code || 'Unknown'}`);
    
    if (error.response) {
      console.error(`   • Response Status: ${error.response.status}`);
      console.error(`   • Response Data:`, error.response.data);
    }
    
    console.log('\n🔍 Troubleshooting Steps:');
    console.log('1. Check your OpenAI dashboard for any account restrictions');
    console.log('2. Verify your API key is correct');
    console.log('3. Check if there are any rate limits on your account');
    console.log('4. Try again in a few minutes (temporary API issues)');
    console.log('5. Contact OpenAI support if the issue persists');
  }
}

diagnoseOpenAI();
