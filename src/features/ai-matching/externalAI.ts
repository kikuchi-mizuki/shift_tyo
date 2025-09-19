/**
 * External AI Services Integration
 * 外部AIサービスとの統合（オプション）
 */

// 例: OpenAI API統合
export const callOpenAI = async (prompt: string): Promise<string> => {
  // OpenAI API Keyが必要
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('OpenAI API Key not configured, using fallback');
    return 'fallback_response';
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in shift scheduling optimization.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response';
  } catch (error) {
    console.error('OpenAI API error:', error);
    return 'error_response';
  }
};

// 例: Google AI Platform統合
export const callGoogleAI = async (features: any[]): Promise<number[]> => {
  // Google Cloud AI Platform API Keyが必要
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    console.warn('Google AI API Key not configured, using fallback');
    return features.map(() => Math.random());
  }

  try {
    const response = await fetch(`https://automl.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/locations/us-central1/models/${process.env.GOOGLE_MODEL_ID}:predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payload: {
          row: {
            values: features.map(f => ({ stringValue: f.toString() }))
          }
        }
      }),
    });

    const data = await response.json();
    return data.payload?.predictions?.map((p: any) => p.regression?.value) || [];
  } catch (error) {
    console.error('Google AI API error:', error);
    return features.map(() => Math.random());
  }
};

// 例: Azure Cognitive Services統合
export const callAzureAI = async (text: string): Promise<any> => {
  const endpoint = process.env.AZURE_AI_ENDPOINT;
  const apiKey = process.env.AZURE_AI_API_KEY;
  
  if (!endpoint || !apiKey) {
    console.warn('Azure AI credentials not configured, using fallback');
    return { sentiment: 'neutral', confidence: 0.5 };
  }

  try {
    const response = await fetch(`${endpoint}/text/analytics/v3.1/sentiment`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documents: [
          {
            id: '1',
            text: text
          }
        ]
      }),
    });

    const data = await response.json();
    return data.documents[0]?.sentiment || { sentiment: 'neutral', confidence: 0.5 };
  } catch (error) {
    console.error('Azure AI API error:', error);
    return { sentiment: 'neutral', confidence: 0.5 };
  }
};

export default {
  callOpenAI,
  callGoogleAI,
  callAzureAI
};
