import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'fake_key', 
});

export const generateDailyInsights = async (productivityData: any) => {
  if(!process.env.GROQ_API_KEY) return 'Please set GROQ_API_KEY for insights';

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a harsh but effective personal productivity coach. Based on the user's 20-minute time block tracking data provided below, give a 3-sentence actionable feedback. Point out wasted time if high, and suggest one improvement."
        },
        {
          role: "user",
          content: `Data: ${JSON.stringify(productivityData)}`
        }
      ],
      model: "llama3-8b-8192", // Fast model for simple text
    });

    return completion.choices[0]?.message?.content || "No insights generated.";
  } catch (error) {
    console.error("Groq API Error: ", error);
    return "Failed to fetch insights.";
  }
};
