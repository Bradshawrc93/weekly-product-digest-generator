require('dotenv').config();
const OpenAI = require('openai');

async function testOpenAIUsage() {
  console.log('🔍 Testing OpenAI API Usage...\n');
  
  // Show which key we're using (first 10 chars)
  const apiKey = process.env.OPENAI_API_KEY;
  console.log(`📋 API Key being used: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log(`📋 Full key length: ${apiKey ? apiKey.length : 0} characters\n`);
  
  if (!apiKey) {
    console.log('❌ No OpenAI API key found in environment variables');
    return;
  }
  
  try {
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    console.log('📡 Making a simple API call to test usage...');
    
    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Say 'Hello! This is a test call to verify API usage.'"
        }
      ],
      max_tokens: 20
    });
    const endTime = Date.now();
    
    console.log('✅ API call successful!');
    console.log(`📄 Response: ${completion.choices[0].message.content}`);
    console.log(`⏱️  Response time: ${endTime - startTime}ms`);
    console.log(`📊 Usage:`, completion.usage);
    console.log(`🆔 Request ID: ${completion.id}`);
    
    console.log('\n💡 This call should now appear in your OpenAI usage dashboard.');
    console.log('💡 Check your OpenAI dashboard at: https://platform.openai.com/usage');
    
  } catch (error) {
    console.error('❌ OpenAI API Error:', error.message);
    
    if (error.status === 429) {
      console.log('\n💡 This is a quota/billing issue. You may need to:');
      console.log('   • Check your OpenAI billing status');
      console.log('   • Upgrade your plan if needed');
      console.log('   • Wait for quota reset');
    } else if (error.status === 401) {
      console.log('\n💡 This is an authentication issue. Check your API key.');
    } else if (error.status === 404) {
      console.log('\n💡 Model not found. Check if you have access to gpt-3.5-turbo');
    }
  }
}

testOpenAIUsage();
