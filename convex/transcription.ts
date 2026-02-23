"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * AssemblyAI transcription integration for ambient note recording.
 *
 * Flow:
 * 1. Client uploads audio to Convex file storage
 * 2. Client calls startTranscription with storageId
 * 3. This action uploads audio to AssemblyAI and starts transcription
 * 4. AssemblyAI webhook (or polling) notifies when complete
 * 5. AI processes transcript into SOAP format
 */

interface AssemblyAITranscript {
  id: string;
  status: "queued" | "processing" | "completed" | "error";
  text?: string;
  error?: string;
  utterances?: Array<{
    speaker: string;
    text: string;
    start: number;
    end: number;
  }>;
}

function getAssemblyAIKey(): string {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) {
    throw new Error("ASSEMBLYAI_API_KEY environment variable is not set");
  }
  return key;
}

// =============================================================================
// INTERNAL ACTIONS (for chaining within other actions)
// =============================================================================

/**
 * Internal: Start transcription of an uploaded audio file
 */
export const startTranscriptionInternal = internalAction({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.object({
    transcriptId: v.string(),
  }),
  handler: async (ctx, args) => {
    const apiKey = getAssemblyAIKey();

    const audioUrl = await ctx.storage.getUrl(args.storageId);
    if (!audioUrl) {
      throw new Error("Audio file not found in storage");
    }

    const response = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        speaker_labels: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AssemblyAI API error: ${response.status} - ${errorText}`);
    }

    const transcript: AssemblyAITranscript = await response.json();
    return { transcriptId: transcript.id };
  },
});

/**
 * Internal: Poll for transcription completion
 */
export const getTranscriptionStatusInternal = internalAction({
  args: {
    transcriptId: v.string(),
  },
  returns: v.object({
    status: v.string(),
    text: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (_, args) => {
    const apiKey = getAssemblyAIKey();

    const response = await fetch(
      `https://api.assemblyai.com/v2/transcript/${args.transcriptId}`,
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AssemblyAI API error: ${response.status} - ${errorText}`);
    }

    const transcript: AssemblyAITranscript = await response.json();
    return {
      status: transcript.status,
      text: transcript.text,
      error: transcript.error,
    };
  },
});

/**
 * Internal: Generate clinical note from transcript using OpenAI
 * Supports multiple formats: SOAP, Summary, RTP Clearance
 */
export const generateSOAPNoteInternal = internalAction({
  args: {
    transcript: v.string(),
    encounterType: v.string(),
    noteFormat: v.optional(v.string()), // "soap", "summary", "rtp_form"
    athleteName: v.optional(v.string()),
    injuryContext: v.optional(v.string()),
  },
  returns: v.object({
    subjective: v.string(),
    objective: v.string(),
    assessment: v.string(),
    plan: v.string(),
    summary: v.string(),
  }),
  handler: async (_, args) => {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    const noteFormat = args.noteFormat || "soap";

    // Different system prompts based on note format
    let systemPrompt: string;
    let jsonFormat: string;

    if (noteFormat === "rtp_form") {
      systemPrompt = `You are a medical documentation assistant helping athletic trainers create Return-to-Play (RTP) clearance documentation.
Convert the provided voice transcript into a structured RTP clearance note.

Important guidelines:
- Extract functional testing results and clearance criteria
- Document any activity restrictions or modifications
- Clearly state the clearance level (full, limited, not cleared)
- Include follow-up recommendations
- Use professional medical terminology
- Focus on athletic training context

Always respond with valid JSON in this exact format:
{
  "subjective": "Current status, athlete's reported symptoms, pain levels",
  "objective": "Functional testing results, ROM, strength, sport-specific tests performed",
  "assessment": "Clearance determination: FULL CLEARANCE / LIMITED CLEARANCE / NOT CLEARED - with reasoning",
  "plan": "Activity level permitted, any restrictions, follow-up schedule, monitoring plan",
  "summary": "Brief clearance summary (e.g., 'Full clearance granted for return to sport' or 'Limited to non-contact activities')"
}`;
      jsonFormat = "RTP clearance format";
    } else if (noteFormat === "summary") {
      systemPrompt = `You are a medical documentation assistant helping athletic trainers create concise clinical summaries.
Convert the provided voice transcript into a brief clinical summary note.

Important guidelines:
- Create a concise, readable summary of the encounter
- Include key treatments provided and athlete response
- Note any important observations or changes
- Keep it brief but comprehensive
- Use professional medical terminology

Always respond with valid JSON in this exact format:
{
  "subjective": "Brief summary of what was discussed and treated",
  "objective": "Not documented",
  "assessment": "Not documented",
  "plan": "Not documented",
  "summary": "Complete summary paragraph combining all information from the encounter"
}`;
      jsonFormat = "summary format";
    } else {
      // Default SOAP format
      systemPrompt = `You are a medical documentation assistant helping athletic trainers create clinical notes.
Convert the provided voice transcript into a structured SOAP note format.

Important guidelines:
- Extract relevant clinical information from natural speech
- Use professional medical terminology
- Be concise but comprehensive
- If information for a section is not mentioned, note "Not documented" rather than making assumptions
- Focus on athletic training context (sports injuries, rehabilitation, return-to-play)

Always respond with valid JSON in this exact format:
{
  "subjective": "Patient-reported symptoms, history, and chief complaint",
  "objective": "Clinical findings, measurements, test results",
  "assessment": "Clinical impression and diagnosis",
  "plan": "Treatment plan and follow-up",
  "summary": "Brief 1-2 sentence summary of the encounter"
}`;
      jsonFormat = "SOAP format";
    }

    const userPrompt = `Convert this voice transcript from an athletic training encounter into a ${jsonFormat} note.

${args.athleteName ? `Athlete: ${args.athleteName}` : ""}
${args.injuryContext ? `Injury Context: ${args.injuryContext}` : ""}
Encounter Type: ${args.encounterType}

Transcript:
"""
${args.transcript}
"""`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    try {
      const parsed = JSON.parse(content);

      return {
        subjective: parsed.subjective || "Not documented",
        objective: parsed.objective || "Not documented",
        assessment: parsed.assessment || "Not documented",
        plan: parsed.plan || "Not documented",
        summary: parsed.summary || "Encounter documented",
      };
    } catch {
      return {
        subjective: content,
        objective: "Not documented",
        assessment: "Not documented",
        plan: "Not documented",
        summary: "AI-generated note (parsing error)",
      };
    }
  },
});

/**
 * Internal: Generate rehab program exercises from transcript using OpenAI
 */
export const generateRehabProgramInternal = internalAction({
  args: {
    transcript: v.string(),
    athleteName: v.optional(v.string()),
    injuryContext: v.optional(v.string()),
  },
  returns: v.object({
    programName: v.string(),
    programDescription: v.string(),
    exercises: v.array(v.object({
      name: v.string(),
      description: v.string(),
      sets: v.optional(v.number()),
      reps: v.optional(v.string()),
      holdSeconds: v.optional(v.number()),
      durationMinutes: v.optional(v.number()),
      frequency: v.optional(v.string()),
      equipment: v.optional(v.string()),
      notes: v.optional(v.string()),
    })),
  }),
  handler: async (_, args) => {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    const systemPrompt = `You are a medical documentation assistant helping athletic trainers create rehabilitation exercise programs.
Convert the provided voice transcript into a structured rehab program with individual exercises.

Important guidelines:
- Extract each exercise mentioned with its specific parameters
- Include sets, reps, hold times, or duration as mentioned
- Note any equipment needed
- Include frequency if mentioned (e.g., "2x daily", "3x per week")
- Add any specific instructions or modifications as notes
- Use professional exercise terminology
- If specific numbers aren't mentioned, leave those fields empty rather than guessing

Always respond with valid JSON in this exact format:
{
  "programName": "Descriptive name for the program (e.g., 'ACL Rehab Phase 1', 'Ankle Strengthening Protocol')",
  "programDescription": "Brief description of program goals and focus",
  "exercises": [
    {
      "name": "Exercise name (e.g., Quad Sets, Heel Slides, SLR)",
      "description": "How to perform the exercise",
      "sets": 3,
      "reps": "10-15",
      "holdSeconds": 5,
      "durationMinutes": null,
      "frequency": "2x daily",
      "equipment": "None or equipment name",
      "notes": "Any specific instructions or modifications"
    }
  ]
}

Note: sets, holdSeconds, and durationMinutes should be numbers or null. reps can be a string like "10-15" or "10".`;

    const userPrompt = `Convert this voice transcript describing a rehabilitation program into a structured exercise program.

${args.athleteName ? `Athlete: ${args.athleteName}` : ""}
${args.injuryContext ? `Injury/Condition: ${args.injuryContext}` : ""}

Transcript:
"""
${args.transcript}
"""`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    try {
      const parsed = JSON.parse(content);

      return {
        programName: parsed.programName || "Rehab Program",
        programDescription: parsed.programDescription || "",
        exercises: (parsed.exercises || []).map((ex: Record<string, unknown>) => ({
          name: ex.name || "Exercise",
          description: ex.description || "",
          sets: typeof ex.sets === "number" ? ex.sets : undefined,
          reps: ex.reps || undefined,
          holdSeconds: typeof ex.holdSeconds === "number" ? ex.holdSeconds : undefined,
          durationMinutes: typeof ex.durationMinutes === "number" ? ex.durationMinutes : undefined,
          frequency: ex.frequency || undefined,
          equipment: ex.equipment || undefined,
          notes: ex.notes || undefined,
        })),
      };
    } catch {
      return {
        programName: "Rehab Program",
        programDescription: "AI-generated program (parsing error)",
        exercises: [],
      };
    }
  },
});

// =============================================================================
// PUBLIC ACTIONS (called from the client)
// =============================================================================

/**
 * Start transcription of an uploaded audio file
 */
export const startTranscription = action({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.object({
    transcriptId: v.string(),
  }),
  handler: async (ctx, args) => {
    const apiKey = getAssemblyAIKey();

    // Get the audio file URL from Convex storage
    const audioUrl = await ctx.storage.getUrl(args.storageId);
    if (!audioUrl) {
      throw new Error("Audio file not found in storage");
    }

    // Submit to AssemblyAI for transcription
    const response = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        speaker_labels: true, // Identify different speakers
        auto_chapters: false,
        entity_detection: false,
        iab_categories: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AssemblyAI API error: ${response.status} - ${errorText}`);
    }

    const transcript: AssemblyAITranscript = await response.json();

    return {
      transcriptId: transcript.id,
    };
  },
});

/**
 * Poll for transcription completion
 */
export const getTranscriptionStatus = action({
  args: {
    transcriptId: v.string(),
  },
  returns: v.object({
    status: v.string(),
    text: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (_, args) => {
    const apiKey = getAssemblyAIKey();

    const response = await fetch(
      `https://api.assemblyai.com/v2/transcript/${args.transcriptId}`,
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AssemblyAI API error: ${response.status} - ${errorText}`);
    }

    const transcript: AssemblyAITranscript = await response.json();

    return {
      status: transcript.status,
      text: transcript.text,
      error: transcript.error,
    };
  },
});

/**
 * Generate SOAP note from transcript using OpenAI
 */
export const generateSOAPNote = action({
  args: {
    transcript: v.string(),
    encounterType: v.string(),
    athleteName: v.optional(v.string()),
    injuryContext: v.optional(v.string()),
  },
  returns: v.object({
    subjective: v.string(),
    objective: v.string(),
    assessment: v.string(),
    plan: v.string(),
    summary: v.string(),
  }),
  handler: async (_, args) => {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    const systemPrompt = `You are a medical documentation assistant helping athletic trainers create clinical notes.
Convert the provided voice transcript into a structured SOAP note format.

Important guidelines:
- Extract relevant clinical information from natural speech
- Use professional medical terminology
- Be concise but comprehensive
- If information for a section is not mentioned, note "Not documented" rather than making assumptions
- Focus on athletic training context (sports injuries, rehabilitation, return-to-play)

Always respond with valid JSON in this exact format:
{
  "subjective": "Patient-reported symptoms, history, and chief complaint",
  "objective": "Clinical findings, measurements, test results",
  "assessment": "Clinical impression and diagnosis",
  "plan": "Treatment plan and follow-up",
  "summary": "Brief 1-2 sentence summary of the encounter"
}`;

    const userPrompt = `Convert this voice transcript from an athletic training encounter into a SOAP note.

${args.athleteName ? `Athlete: ${args.athleteName}` : ""}
${args.injuryContext ? `Injury Context: ${args.injuryContext}` : ""}
Encounter Type: ${args.encounterType}

Transcript:
"""
${args.transcript}
"""`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    try {
      const parsed = JSON.parse(content);

      return {
        subjective: parsed.subjective || "Not documented",
        objective: parsed.objective || "Not documented",
        assessment: parsed.assessment || "Not documented",
        plan: parsed.plan || "Not documented",
        summary: parsed.summary || "Encounter documented",
      };
    } catch {
      return {
        subjective: content,
        objective: "Not documented",
        assessment: "Not documented",
        plan: "Not documented",
        summary: "AI-generated note (parsing error)",
      };
    }
  },
});

/**
 * Combined action: Upload audio, transcribe, and generate clinical note
 * This is the main action called from the client for the full workflow
 * Supports multiple note formats: SOAP, Summary, RTP Clearance
 */
export const processAmbientRecording = action({
  args: {
    storageId: v.id("_storage"),
    encounterType: v.string(),
    noteFormat: v.optional(v.string()), // "soap", "summary", "rtp_form"
    athleteName: v.optional(v.string()),
    injuryContext: v.optional(v.string()),
  },
  returns: v.object({
    transcript: v.string(),
    subjective: v.string(),
    objective: v.string(),
    assessment: v.string(),
    plan: v.string(),
    summary: v.string(),
  }),
  handler: async (ctx, args): Promise<{
    transcript: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    summary: string;
  }> => {
    // Step 1: Start transcription
    const startResult = await ctx.runAction(
      internal.transcription.startTranscriptionInternal,
      { storageId: args.storageId }
    );
    const transcriptId = startResult.transcriptId;

    // Step 2: Poll for completion (with timeout)
    const maxAttempts = 60; // 5 minutes max (5 second intervals)
    let attempts = 0;
    let transcriptText = "";

    while (attempts < maxAttempts) {
      const status = await ctx.runAction(
        internal.transcription.getTranscriptionStatusInternal,
        { transcriptId }
      );

      if (status.status === "completed" && status.text) {
        transcriptText = status.text;
        break;
      }

      if (status.status === "error") {
        throw new Error(`Transcription failed: ${status.error || "Unknown error"}`);
      }

      // Wait 5 seconds before polling again
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    }

    if (!transcriptText) {
      throw new Error("Transcription timed out");
    }

    // Step 3: Generate note from transcript (format-aware)
    const note = await ctx.runAction(
      internal.transcription.generateSOAPNoteInternal,
      {
        transcript: transcriptText,
        encounterType: args.encounterType,
        noteFormat: args.noteFormat,
        athleteName: args.athleteName,
        injuryContext: args.injuryContext,
      }
    );

    return {
      transcript: transcriptText,
      subjective: note.subjective,
      objective: note.objective,
      assessment: note.assessment,
      plan: note.plan,
      summary: note.summary,
    };
  },
});

/**
 * Combined action: Upload audio, transcribe, and generate rehab program
 * Used for voice-to-rehab-program workflow
 */
export const processRehabRecording = action({
  args: {
    storageId: v.id("_storage"),
    athleteName: v.optional(v.string()),
    injuryContext: v.optional(v.string()),
  },
  returns: v.object({
    transcript: v.string(),
    programName: v.string(),
    programDescription: v.string(),
    exercises: v.array(v.object({
      name: v.string(),
      description: v.string(),
      sets: v.optional(v.number()),
      reps: v.optional(v.string()),
      holdSeconds: v.optional(v.number()),
      durationMinutes: v.optional(v.number()),
      frequency: v.optional(v.string()),
      equipment: v.optional(v.string()),
      notes: v.optional(v.string()),
    })),
  }),
  handler: async (ctx, args): Promise<{
    transcript: string;
    programName: string;
    programDescription: string;
    exercises: Array<{
      name: string;
      description: string;
      sets?: number;
      reps?: string;
      holdSeconds?: number;
      durationMinutes?: number;
      frequency?: string;
      equipment?: string;
      notes?: string;
    }>;
  }> => {
    // Step 1: Start transcription
    const startResult = await ctx.runAction(
      internal.transcription.startTranscriptionInternal,
      { storageId: args.storageId }
    );
    const transcriptId = startResult.transcriptId;

    // Step 2: Poll for completion (with timeout)
    const maxAttempts = 60; // 5 minutes max (5 second intervals)
    let attempts = 0;
    let transcriptText = "";

    while (attempts < maxAttempts) {
      const status = await ctx.runAction(
        internal.transcription.getTranscriptionStatusInternal,
        { transcriptId }
      );

      if (status.status === "completed" && status.text) {
        transcriptText = status.text;
        break;
      }

      if (status.status === "error") {
        throw new Error(`Transcription failed: ${status.error || "Unknown error"}`);
      }

      // Wait 5 seconds before polling again
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    }

    if (!transcriptText) {
      throw new Error("Transcription timed out");
    }

    // Step 3: Generate rehab program from transcript
    const program = await ctx.runAction(
      internal.transcription.generateRehabProgramInternal,
      {
        transcript: transcriptText,
        athleteName: args.athleteName,
        injuryContext: args.injuryContext,
      }
    );

    return {
      transcript: transcriptText,
      programName: program.programName,
      programDescription: program.programDescription,
      exercises: program.exercises,
    };
  },
});
