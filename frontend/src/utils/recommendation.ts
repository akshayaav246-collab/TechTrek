"use server";

import fs from 'fs';
import path from 'path';

export async function getRecommendation(discipline: string, year: string, agenda: string) {
  const prompt = `
You are a smart session recommendation engine for TechTrek, a multi-day technical event.

## Student Profile
- Discipline: ${discipline}
- Year of study: ${year}

## Agenda
${agenda}

## Instructions
1. Analyze the student's discipline and year of study.
2. For each day in the agenda, score every session from 0 to 10 based on relevance to the student's profile.
3. Compute the average relevance score per day.
4. Identify the day with the highest average score.
5. Return ONLY a JSON object. No explanation outside the JSON.

## Output Format (strict JSON only)
{
  "recommendedDay": "Day X",
  "reason": "2-3 sentence explanation of why this day fits the student's profile.",
  "scores": {
    "Day 1": 7.5,
    "Day 2": 4.0,
    "Day 3": 2.5
  }
}

## Example
For a Computer Science student:
- Day 1 covers algorithms and cloud computing → avg 8.5
- Day 2 covers marketing analytics → avg 3.0
- Day 3 covers financial modeling → avg 2.5
→ Recommend Day 1.
`;

  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    try {
      const envPath = path.join(process.cwd(), '../backend/.env');
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/GEMINI_API_KEY=(.*)/);
      if (match) apiKey = match[1].trim();
    } catch (e) {
      console.error("Could not read API key from backend .env", e);
    }
  }

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const res = await fetch(
  `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  }
);

  const data = await res.json();
  
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    console.error("Gemini API Error:", data);
    throw new Error(data.error?.message || "Invalid response from Gemini API");
  }
  
  const raw = data.candidates[0].content.parts[0].text;

  // Strip markdown fences if Gemini wraps in \`\`\`json
  const clean = raw.replace(/\`\`\`json|\`\`\`/g, "").trim();
  return JSON.parse(clean);
}
