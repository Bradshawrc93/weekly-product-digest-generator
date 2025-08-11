require('dotenv').config();
const OpenAI = require('openai');

async function testOpenAIKey() {
  console.log('🔑 Testing OpenAI API Key...\n');
  
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('📡 Making test API call...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Say 'Hello! The API key is working!' in a friendly way."
        }
      ],
      max_tokens: 50
    });

    console.log('✅ API Response:');
    console.log(completion.choices[0].message.content);
    
    console.log('\n📊 Usage Info:');
    console.log('Model:', completion.model);
    console.log('Usage:', completion.usage);
    
  } catch (error) {
    console.error('❌ OpenAI API Error:', error.message);
    
    if (error.status === 429) {
      console.log('\n💡 This is a quota/billing issue. You may need to:');
      console.log('   • Check your OpenAI billing status');
      console.log('   • Upgrade your plan if needed');
      console.log('   • Wait for quota reset');
    } else if (error.status === 401) {
      console.log('\n💡 This is an authentication issue. Check your API key.');
    }
  }
}

testOpenAIKey();
