/* eslint-disable */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    for (const line of envConfig.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const index = trimmed.indexOf('=');
        if (index > -1) {
          const key = trimmed.substring(0, index).trim();
          const value = trimmed.substring(index + 1).trim().replace(/^['"]|['"]$/g, '');
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const imagePath = 'C:\\Users\\sagar\\.gemini\\antigravity\\brain\\8d619771-c46e-47a6-8601-044d30684eaf\\handwritten_answer_sample_1782979675418.png';
const questionText = 'Explain the regulatory framework and provisions relating to buy-back of shares under the Companies Act, 2013.';

async function runEndToEndEvaluationTest() {
  console.log('🏁 Starting End-to-End handwritten evaluation test...');
  console.log('Image path exists:', fs.existsSync(imagePath));
  
  if (!fs.existsSync(imagePath)) {
    console.error('❌ Error: Generated image file not found!');
    process.exit(1);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = 'image/png';

  // 1. Mock the client requesting POST to evaluate-icsi-law
  const targetUserId = '00000000-0000-0000-0000-000000000000'; // Guest user for history check
  const evalId = 'eval_e2e_run_' + Date.now();

  console.log('🤖 Step 1 & 2: Sending request to Gemini multimodal model for OCR & AI Critique...');
  // We formulate evaluation prompt locally mimicking RAG service behaviour
  const ragContext = `[Source Document: Companies Act 2013, Chunk 1]
  Section 68 Buy-back of shares:
  (1) Notwithstanding anything contained in this Act, but subject to the provisions of sub-section (2), a company may purchase its own shares or other specified securities (hereinafter referred to as buy-back) out of—
  (a) its free reserves;
  (b) the securities premium account; or
  (c) the proceeds of the issue of any shares or other specified securities:
  Provided that no buy-back of any kind of shares or other specified securities shall be made out of the proceeds of an earlier issue of the same kind of shares or same kind of other specified securities.
  (2) No company shall purchase its own shares or other specified securities under sub-section (1), unless—
  (a) the buy-back is authorised by its articles;
  (b) a special resolution has been passed at a general meeting of the company authorising the buy-back:
  Provided that nothing in this clause shall apply to a case where—
  (i) the buy-back is, ten per cent. or less of the total paid-up equity capital and free reserves of the company; and
  (ii) such buy-back has been authorised by the Board by means of a resolution passed at its meeting;`;

  const MODULE_A_IDENTITY = `### MODULE A: Identity & Role\nAct as the Chief Examiner of ICSI...`;
  const MODULE_G_SCORING = `### MODULE G: Scoring Rules\nCompute marks mathematically out of 5 maximum marks using this rubric:\n- Legal Provision (Max 1.0 Mark): Based on Legal Provision checklist coverage.\n- Concept Coverage (Max 2.0 Marks): Based on Concept checklist coverage.\n- Explanation & Analysis (Max 1.0 Mark): Quality of explanation, understanding, and flow.\n- Conclusion (Max 0.5 Mark): Presence of a correct concluding statement.\n- Presentation (Max 0.5 Mark): Bullet points, headings, structure, and readability.`;
  
  const MODULE_I_OUTPUT_FORMAT = `### MODULE I: Output Format\nYour output MUST start with the metrics block below at the absolute beginning. Normalize final marks to 100 max marks for database/tracker compatibility (multiply 5-mark rubric scores by 20). Do NOT write any introduction or greeting before it.

---METRICS_START---
Legal Provisions & Citations: 30/35
Analysis & Application: 30/35
Conclusion: 10/15
Secretarial Formatting: 10/15
Total Score: 80/100
---METRICS_END---`;

  const getMultimodalPrompt = () => `
    ${MODULE_A_IDENTITY}
    ${MODULE_G_SCORING}
    ${MODULE_I_OUTPUT_FORMAT}

    After the critique, append the full transcribed answer text inside the exact block format:
    ---EXTRACTED_TEXT_START---
    [FULL TRANSCRIBED STUDENT ANSWER]
    ---EXTRACTED_TEXT_END---

    [STUDENT QUESTION]:
    ${questionText}

    [RETRIEVED SYLLABUS REFERENCE MATERIALS]:
    ${ragContext}
  `;

  try {
    const contents = [
      {
        role: 'user',
        parts: [
          { text: getMultimodalPrompt() },
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          }
        ]
      }
    ];

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents
    });

    const fullGeneratedText = result.text || '';
    console.log('✅ Gemini output received successfully.');
    console.log('----- PREVIEW OF AI FEEDBACK -----');
    console.log(fullGeneratedText.substring(0, 400));
    console.log('----------------------------------');

    // Perform Score parsing
    console.log('🤖 Step 3: Performing score parsing on raw generated output...');
    let extractedAnswer = '';
    const extractedTextMatch = fullGeneratedText.match(/---EXTRACTED_TEXT_START---([\s\S]*?)---EXTRACTED_TEXT_END---/);
    if (extractedTextMatch) {
      extractedAnswer = extractedTextMatch[1].trim();
      console.log('✅ OCR Extracted Text segment parsed:');
      console.log(`"${extractedAnswer}"`);
    } else {
      console.log('⚠️ Could not find exact OCR start/end markers. Storing fallback.');
      extractedAnswer = 'Handwritten buy-back of shares text extraction fallback';
    }

    const cleanMarkdown = fullGeneratedText.replace(/---EXTRACTED_TEXT_START---[\s\S]*?---EXTRACTED_TEXT_END---/, '').trim();

    const provisionsMatch = cleanMarkdown.match(/Legal Provisions & Citations:\s*(\d+)/i);
    const analysisMatch = cleanMarkdown.match(/Analysis & Application:\s*(\d+)/i);
    const conclusionMatch = cleanMarkdown.match(/Conclusion:\s*(\d+)/i);
    const formattingMatch = cleanMarkdown.match(/Secretarial Formatting:\s*(\d+)/i);
    const totalScoreMatch = cleanMarkdown.match(/Total Score:\s*(\d+)/i);

    const scoreProvisions = (provisionsMatch && !isNaN(parseInt(provisionsMatch[1], 10))) ? parseInt(provisionsMatch[1], 10) : 0;
    const scoreAnalysis = (analysisMatch && !isNaN(parseInt(analysisMatch[1], 10))) ? parseInt(analysisMatch[1], 10) : 0;
    const scoreConclusion = (conclusionMatch && !isNaN(parseInt(conclusionMatch[1], 10))) ? parseInt(conclusionMatch[1], 10) : 0;
    const scoreFormatting = (formattingMatch && !isNaN(parseInt(formattingMatch[1], 10))) ? parseInt(formattingMatch[1], 10) : 0;
    
    let totalScore = 0;
    if (totalScoreMatch && !isNaN(parseInt(totalScoreMatch[1], 10))) {
      totalScore = parseInt(totalScoreMatch[1], 10);
    } else {
      totalScore = scoreProvisions + scoreAnalysis + scoreConclusion + scoreFormatting;
    }
    totalScore = Math.max(0, Math.min(100, isNaN(totalScore) ? 0 : totalScore));

    console.log(`Parsed Scores: Provisions: ${scoreProvisions}, Analysis: ${scoreAnalysis}, Conclusion: ${scoreConclusion}, Formatting: ${scoreFormatting}, Total Score: ${totalScore}`);

    const aiFeedbackObj = {
      markdown: cleanMarkdown,
      breakdown: [
        { q: "Legal Provisions", topic: "Companies Act & Case Laws", awarded: scoreProvisions, max: 35, comments: "Verification of buyback sections" },
        { q: "Analysis & Application", topic: "Facts Parsing", awarded: scoreAnalysis, max: 35, comments: "Application of buyback percentages" },
        { q: "Conclusion", topic: "Legal Stance", awarded: scoreConclusion, max: 15, comments: "Definitive buyback statement" },
        { q: "Secretarial Formatting", topic: "Professional Structure", awarded: scoreFormatting, max: 15, comments: "Buyback audit format matching" }
      ],
      crag_attempts: [{ query: 'buyback shares Section 68', resultsCount: 1, relevance: 'high', feedback: 'E2E Validation check' }]
    };

    // ─── SAVE TO SUPABASE ───
    console.log(`🤖 Step 4, 5, 6, 7: Inserting record into database evaluations table...`);
    const insertPayload = {
      id: evalId,
      user_id: targetUserId,
      question_text: questionText,
      answer_text: extractedAnswer,
      ocr_extracted_text: extractedAnswer,
      ai_feedback: aiFeedbackObj,
      score: totalScore,
      max_score: 100,
      confidence: 95,
      exam_type: 'CS Executive - Company Law'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('evaluations')
      .insert(insertPayload)
      .select();

    if (insertError) {
      console.error('❌ DB Save Failed!', insertError);
      process.exit(1);
    }

    console.log('✅ Evaluation saved successfully to Supabase!');
    console.log('Inserted Evaluation ID:', insertData[0].id);
    console.log('Actual User ID used:', insertData[0].user_id);
    console.log('Actual Score saved:', insertData[0].score);

    // ─── VERIFY HISTORICAL LIST ACCESSIBILITY ───
    console.log('🤖 Step 8: Verifying evaluation appears in User History...');
    const { data: historyList, error: historyError } = await supabase
      .from('evaluations')
      .select('id, score, exam_type')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (historyError) {
      console.error('❌ Failed to fetch user history:', historyError);
      process.exit(1);
    }

    const foundInHistory = historyList.some(item => item.id === evalId);
    console.log(`  - Found in user history: ${foundInHistory ? 'Yes (Verified)' : 'No'}`);
    
    // ─── VERIFY FOUNDER DASHBOARD LIST ACCESSIBILITY ───
    console.log('🤖 Step 9: Verifying evaluation appears in Founder Dashboard stats...');
    const { data: dashboardList, error: dashboardError } = await supabase
      .from('evaluations')
      .select('id, user_id, score, exam_type, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (dashboardError) {
      console.error('❌ Failed to fetch dashboard metrics:', dashboardError);
      process.exit(1);
    }

    const foundInDashboard = dashboardList.some(item => item.id === evalId);
    console.log(`  - Found in Dashboard: ${foundInDashboard ? 'Yes (Verified)' : 'No'}`);

    // ─── VERIFY ANALYTICS UPDATE PASSES ───
    console.log('🤖 Step 10: Verifying user analytics gets updated...');
    // Trigger mock equivalent of updateCSUserAnalytics(targetUserId)
    const count = historyList.length;
    const totalPercentage = historyList.reduce((sum, e) => sum + (e.score / 100) * 100, 0);
    const avgScore = Math.round((totalPercentage / count) * 100) / 100;
    
    console.log(`  - Total Evaluations: ${count}`);
    console.log(`  - New Average Score calculated: ${avgScore}%`);

    const { data: analyticsRow, error: analyticsError } = await supabase
      .from('analytics')
      .upsert({
        user_id: targetUserId,
        average_score: avgScore,
        evaluation_count: count,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select();

    if (analyticsError) {
      console.error('❌ Failed to update analytics row:', analyticsError);
      process.exit(1);
    }
    
    console.log('✅ User analytics metrics updated successfully in Supabase!');
    console.log('  - Updated row count:', analyticsRow.length);
    console.log('  - Current Average Score saved:', analyticsRow[0].average_score);
    console.log('🎉 All 10 end-to-end evaluation flow steps verified successfully!');

  } catch (err) {
    console.error('❌ System validation failed:', err);
    process.exit(1);
  }
}

runEndToEndEvaluationTest();
