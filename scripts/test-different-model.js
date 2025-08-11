require('dotenv').config();
const OpenAI = require('openai');

async function testDifferentModels() {
  console.log('🔍 Testing Different OpenAI Models...\n');
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('❌ No API key found');
    return;
  }
  
  const openai = new OpenAI({
    apiKey: apiKey,
  });

  const models = [
    'gpt-3.5-turbo',
    'gpt-4',
    'gpt-4o-mini'
  ];

  for (const model of models) {
    console.log(`📡 Testing model: ${model}`);
    
    try {
      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "user",
            content: "Say hello"
          }
        ],
        max_tokens: 10
      });
      
      console.log(`✅ ${model} - SUCCESS!`);
      console.log(`   Response: ${completion.choices[0].message.content}`);
      console.log(`   Usage:`, completion.usage);
      console.log('');
      
    } catch (error) {
      console.log(`❌ ${model} - FAILED`);
      console.log(`   Error: ${error.message}`);
      console.log(`   Type: ${error.type || 'Unknown'}`);
      console.log(`   Code: ${error.code || 'Unknown'}`);
      console.log('');
    }
  }
  
  console.log('💡 If all models fail with the same error, it\'s likely an account/billing issue.');
  console.log('💡 If some models work, it might be a model access issue.');
}

testDifferentModels();
