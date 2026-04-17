
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { topic, exercises, num_questions = 5, quiz_type = 'multiple_choice', language = 'english' } = await req.json();

    if (!topic) {
      return new Response(JSON.stringify({ success: false, error: 'topic is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_KEY) {
      // Fallback: return template questions without AI
      return new Response(JSON.stringify({
        success: true,
        questions: generateFallback(topic, num_questions, quiz_type),
        note: 'No AI key configured — returning template questions'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const typeInstructions: Record<string, string> = {
      multiple_choice: `Generate ${num_questions} multiple choice questions (1 correct answer, 3-4 options).
        Return JSON array with: [{id, type:"multiple_choice", question, options:[{id,text,isCorrect}], explanation}]`,
      multiple_select: `Generate ${num_questions} multiple select questions (2+ correct answers, 4-5 options).
        Return JSON array with: [{id, type:"multiple_select", question, options:[{id,text,isCorrect}], explanation}]`,
      true_false: `Generate ${num_questions} true/false questions about the topic.
        Return JSON array with: [{id, type:"true_false", question, options:[{id:"opt-t",text:"Verdadero",isCorrect:bool},{id:"opt-f",text:"Falso",isCorrect:bool}], explanation}]`,
      match: `Generate ${num_questions} matching exercises (connect column A with column B).
        Return JSON array with: [{id, type:"match", question, options:[{id,text,correctAnswer}], explanation}]
        where text is column A item and correctAnswer is the matching column B item.`,
      organize: `Generate ${num_questions} exercises where students must arrange words in correct order.
        Return JSON array with: [{id, type:"organize", question:"Arrange: [scrambled words]", options:[{id:"opt-1",text:"correct full sentence",isCorrect:true}], explanation}]`,
      rewrite: `Generate ${num_questions} error-correction exercises where students rewrite sentences correctly.
        Return JSON array with: [{id, type:"rewrite", question:"The incorrect sentence here", options:[{id:"opt-1",text:"correct version",isCorrect:true}], explanation}]`,
    };

    const exercisesContext = exercises ? `\n\nBased on these exercises/examples provided by the teacher:\n${exercises}` : '';
    
    const prompt = `You are an English language teacher creating quiz questions for ${language} learners.
Topic: ${topic}${exercisesContext}

${typeInstructions[quiz_type] || typeInstructions['multiple_choice']}

Requirements:
- Questions should be clear and appropriate for language learning
- Include helpful explanations for each answer
- Mix easy and medium difficulty
- Make questions practical and relevant to real usage
- Questions and instructions in Spanish, but English content as appropriate
- Return ONLY valid JSON array, no markdown, no extra text`;

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 4096 }
        })
      }
    );

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      console.error('Gemini API error:', errText);
      return new Response(JSON.stringify({
        success: true,
        questions: generateFallback(topic, num_questions, quiz_type),
        note: 'AI unavailable — returning template questions'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const geminiData = await geminiResp.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON from response
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({
        success: true,
        questions: generateFallback(topic, num_questions, quiz_type),
        note: 'Could not parse AI response'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let questions = JSON.parse(jsonMatch[0]);
    
    // Normalize IDs
    questions = questions.map((q: Record<string, unknown>, i: number) => ({
      ...q,
      id: `q-ai-${Date.now()}-${i}`,
      options: Array.isArray(q.options)
        ? (q.options as Array<Record<string, unknown>>).map((o, j) => ({ ...o, id: o.id || `opt-${i}-${j}` }))
        : [],
    }));

    return new Response(JSON.stringify({ success: true, questions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('generate-quiz-ai error:', err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function generateFallback(topic: string, count: number, type: string) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const id = `q-tmpl-${Date.now()}-${i}`;
    if (type === 'true_false') {
      questions.push({
        id, type: 'true_false',
        question: `[Pregunta ${i + 1} sobre: ${topic}]`,
        options: [
          { id: 'opt-t', text: 'Verdadero', isCorrect: true },
          { id: 'opt-f', text: 'Falso', isCorrect: false },
        ],
        explanation: 'Agrega una explicación aquí'
      });
    } else if (type === 'rewrite' || type === 'organize') {
      questions.push({
        id, type,
        question: `[Ejercicio ${i + 1} sobre: ${topic}]`,
        options: [{ id: `opt-${i}-0`, text: 'Respuesta correcta aquí', isCorrect: true }],
        explanation: 'Agrega una explicación aquí'
      });
    } else {
      questions.push({
        id, type: type === 'match' ? 'match' : 'multiple_choice',
        question: `[Pregunta ${i + 1} sobre: ${topic}]`,
        options: [
          { id: `opt-${i}-0`, text: 'Opción A (correcta)', isCorrect: true, correctAnswer: type === 'match' ? 'Respuesta A' : undefined },
          { id: `opt-${i}-1`, text: 'Opción B', isCorrect: false, correctAnswer: type === 'match' ? 'Respuesta B' : undefined },
          { id: `opt-${i}-2`, text: 'Opción C', isCorrect: false, correctAnswer: type === 'match' ? 'Respuesta C' : undefined },
        ],
        explanation: 'Agrega una explicación aquí'
      });
    }
  }
  return questions;
}
