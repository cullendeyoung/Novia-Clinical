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
 * Internal: Generate SOAP note from transcript using AI
 */
export const generateSOAPNoteInternal = internalAction({
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
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }

    const systemPrompt = `You are a medical documentation assistant helping athletic trainers create clinical notes.
Convert the provided voice transcript into a structured SOAP note format.

Important guidelines:
- Extract relevant clinical information from natural speech
- Use professional medical terminology
- Be concise but comprehensive
- If information for a section is not mentioned, note "Not documented" rather than making assumptions
- Focus on athletic training context (sports injuries, rehabilitation, return-to-play)`;

    const userPrompt = `Convert this voice transcript from an athletic training encounter into a SOAP note.

${args.athleteName ? `Athlete: ${args.athleteName}` : ""}
${args.injuryContext ? `Injury Context: ${args.injuryContext}` : ""}
Encounter Type: ${args.encounterType}

Transcript:
"""
${args.transcript}
"""

Please provide the note in this exact JSON format:
{
  "subjective": "Patient-reported symptoms, history, and chief complaint",
  "objective": "Clinical findings, measurements, test results",
  "assessment": "Clinical impression and diagnosis",
  "plan": "Treatment plan and follow-up",
  "summary": "Brief 1-2 sentence summary of the encounter"
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
        system: systemPrompt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const content = result.content[0]?.text;

    if (!content) {
      throw new Error("No response from AI");
    }

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

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
 * Generate SOAP note from transcript using AI
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
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }

    const systemPrompt = `You are a medical documentation assistant helping athletic trainers create clinical notes.
Convert the provided voice transcript into a structured SOAP note format.

Important guidelines:
- Extract relevant clinical information from natural speech
- Use professional medical terminology
- Be concise but comprehensive
- If information for a section is not mentioned, note "Not documented" rather than making assumptions
- Focus on athletic training context (sports injuries, rehabilitation, return-to-play)`;

    const userPrompt = `Convert this voice transcript from an athletic training encounter into a SOAP note.

${args.athleteName ? `Athlete: ${args.athleteName}` : ""}
${args.injuryContext ? `Injury Context: ${args.injuryContext}` : ""}
Encounter Type: ${args.encounterType}

Transcript:
"""
${args.transcript}
"""

Please provide the note in this exact JSON format:
{
  "subjective": "Patient-reported symptoms, history, and chief complaint",
  "objective": "Clinical findings, measurements, test results",
  "assessment": "Clinical impression and diagnosis",
  "plan": "Treatment plan and follow-up",
  "summary": "Brief 1-2 sentence summary of the encounter"
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
        system: systemPrompt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const content = result.content[0]?.text;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        subjective: parsed.subjective || "Not documented",
        objective: parsed.objective || "Not documented",
        assessment: parsed.assessment || "Not documented",
        plan: parsed.plan || "Not documented",
        summary: parsed.summary || "Encounter documented",
      };
    } catch {
      // If parsing fails, return the raw content as summary
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
 * Combined action: Upload audio, transcribe, and generate SOAP note
 * This is the main action called from the client for the full workflow
 */
export const processAmbientRecording = action({
  args: {
    storageId: v.id("_storage"),
    encounterType: v.string(),
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

    // Step 3: Generate SOAP note from transcript
    const soapNote = await ctx.runAction(
      internal.transcription.generateSOAPNoteInternal,
      {
        transcript: transcriptText,
        encounterType: args.encounterType,
        athleteName: args.athleteName,
        injuryContext: args.injuryContext,
      }
    );

    return {
      transcript: transcriptText,
      subjective: soapNote.subjective,
      objective: soapNote.objective,
      assessment: soapNote.assessment,
      plan: soapNote.plan,
      summary: soapNote.summary,
    };
  },
});
