/**
 * Utility to dynamically generate AI prompts for Cover Letter generation.
 */

export const buildCoverLetterPrompt = ({ resumeData, analysisData, jobDescription, tone = "Professional", language = "English" }) => {
  const candidateName = resumeData?.personalInfo?.name || "[Your Name]";
  const candidateSkills = analysisData?.skills?.present || resumeData?.skills || [];
  
  // Format skills as a comma-separated list or bullet points
  const skillsList = Array.isArray(candidateSkills) 
    ? candidateSkills.map(s => typeof s === 'string' ? s : s.name).join(", ")
    : "Various technical and soft skills";

  // Extract experience and impact metrics safely
  const experiences = resumeData?.experience || [];
  const experienceHighlights = experiences.map((exp, index) => {
    const role = exp.role || exp.title || "Professional";
    const company = exp.company || "";
    const impact = exp.description || exp.responsibilities || "Delivered strong results.";
    return `- ${role}${company ? ` at ${company}` : ''}: ${impact}`;
  }).join("\n");

  // Extract projects safely
  const projects = resumeData?.projects || [];
  const projectHighlights = projects.map(proj => {
    const name = proj.name || proj.title || "Project";
    const desc = proj.description || "Developed impactful solution.";
    return `- ${name}: ${desc}`;
  }).join("\n");

  // Format ATS insights if available
  const atsInsights = analysisData?.atsAnalysis?.feedback || [];
  const insightsList = Array.isArray(atsInsights) 
    ? atsInsights.map(insight => `- ${insight}`).join("\n") 
    : "";

  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const toneInstructions = {
    "Professional": "Maintain a highly professional, formal, and respectful tone appropriate for corporate environments.",
    "Formal": "Use strictly formal, traditional business language. Avoid colloquialisms or casual phrasing.",
    "Confident": "Write with strong conviction, using active verbs and a highly self-assured, persuasive tone.",
    "Concise": "Be extremely direct and brief. Cut all fluff. Focus only on high-impact facts and numbers.",
    "Startup-Friendly": "Use a modern, dynamic, and energetic tone. Show passion for innovation and a fast-paced environment.",
    "Creative": "Be engaging, slightly unconventional, and memorable while maintaining professionalism. Show personality."
  };
  const selectedToneInstruction = toneInstructions[tone] || toneInstructions["Professional"];

  return `You are an expert career coach and professional copywriter specializing in ATS-optimized job applications.
Your task is to write a highly professional, compelling, and concise cover letter for the candidate based on their resume data and the target job description.

*** CRITICAL INSTRUCTION: The entire cover letter MUST be written in ${language.toUpperCase()}. ***

### INSTRUCTIONS:
1. **Writing Tone**: ${selectedToneInstruction}
2. **Conciseness**: Keep the cover letter under 400 words. Use clear, impactful language.
3. **Relevance**: Connect the candidate's specific experiences and skills to the core requirements mentioned in the Job Description.
4. **Measurable Impact**: Highlight their measurable impact and key projects naturally.
5. **ATS-Friendly**: Use standard paragraph structures. Do not use overly complex formatting or markdown tables.
6. **No Placeholders for Name if provided**: Use the candidate's real name if available.
7. **Address**: Address it to "Hiring Team" or "Hiring Manager" if a specific name is not provided in the JD.
8. **CRITICAL - NO HALLUCINATIONS**: Do not fabricate experiences, company names, metrics, or achievements not present in the resume data. Only use provided resume information. Do not invent a "Previous Company".
9. **Date**: At the very top of the cover letter, include today's date: ${currentDate}
10. **Language**: Generate the ENTIRE cover letter exclusively in ${language.toUpperCase()}. Even the greeting and sign-off must be in ${language.toUpperCase()}. Do not output English sentences.

---

### CANDIDATE PROFILE
**Name**: ${candidateName}

**Core Skills**: 
${skillsList}

**Key Experience**:
${experienceHighlights ? experienceHighlights : "No specific experience provided."}

**Notable Projects**:
${projectHighlights ? projectHighlights : "No specific projects provided."}

${insightsList ? `**ATS Intelligence Context (for your reference to emphasize strengths)**:\n${insightsList}\n` : ""}

---

### TARGET JOB DESCRIPTION
${jobDescription || "No job description provided. Write a strong general cover letter highlighting the candidate's top skills."}

---

### REQUIRED OUTPUT:
Generate ONLY the final cover letter text in ${language.toUpperCase()}. Do not include any introductory remarks like "Here is your cover letter". Ensure proper spacing between paragraphs.
`;
};
