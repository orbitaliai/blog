# The Anatomy of an Interruption: How to Handle Turn-Taking in Real-Time Voice AI

![The Anatomy of an Interruption: How to Handle Turn-Taking in Real-Time Voice AI](header.png)

When developers set out to build their first voice AI assistant, they usually obsess over two metrics: speech-to-text (STT) accuracy and LLM reasoning speed. They tune prompts, benchmark latency, and optimize word-error rates.

Yet when real users place an actual phone call to the bot, the system still feels unnervingly artificial.

The reason is simple: **the hardest problem in voice AI isn't transcription accuracy or model intelligence—it's human turn-taking.** 

In natural phone conversations, humans don't communicate in orderly JSON payloads or take turns like chess players with a timer. We overlap. We interject. We say *"mhm"*, *"right"*, and *"uh-huh"* while the other person is speaking just to signal that we are listening. When we disagree or want to correct a detail, we cut in mid-phrase, and we expect the other person to stop speaking instantly.

How does an AI receptionist know the difference between an outright interruption and a subtle listening confirmation? And when a real interruption occurs, how does it halt audio playback before the conversation devolves into a chaotic collision?

Here is the anatomy of a voice interruption, why traditional pipelines fail at turn-taking, and how real-time, full-duplex architectures solve conversational flow.

---

## The Walkie-Talkie Trap: Rigid Half-Duplex Pipelines

To understand why most voice bots handle interruptions poorly, look at the plumbing of the traditional multi-vendor pipeline:

$$	ext{Audio In} \longrightarrow 	ext{STT Engine} \longrightarrow 	ext{LLM} \longrightarrow 	ext{TTS Synthesizer} \longrightarrow 	ext{Audio Out}$$

This cascade is inherently **half-duplex**: it operates on a "speak-then-listen" loop, much like an automated walkie-talkie.

```
Traditional Cascaded Pipeline (High Latency & Queued Buffers)

Caller:  ───[ "Actually, cancel that—" ]─────────────────────────
                       │
                 (1) VAD Trips (150ms)
                       │
                 (2) Cancel signal to orchestrator
                       │
                 (3) Drain downstream TTS buffer (200-400ms)
                       ▼
Bot:     ───[ Ongoing synthesized speech still playing... ]───> [Stops too late]
```

When an assistant using a cascaded pipeline is speaking, several layers of audio buffering are active:
1. The LLM has streamed tokens to the TTS provider.
2. The TTS provider has synthesized audio chunks and streamed them over WebSockets to your application server.
3. Your server has queued those RTP packets into the telephony gateway (Twilio, Telnyx, or WebRTC).

When the caller says, *"Wait, no, I meant tomorrow,"* the caller's microphone picks up sound. But the pipeline's Voice Activity Detection (VAD) must first verify that this sound is speech (typically 100–200ms). It then sends a cancellation event back up the chain to kill the LLM stream, discard the TTS buffer, and command the telephony provider to clear its jitter buffers.

By the time the bot actually falls silent, **300ms to 600ms of obsolete speech have already played into the caller's ear**. The bot talks over the human, the human repeats themselves in frustration, and the conversational timing collapses completely.

---

## Full-Duplex Real-Time Models: Simultaneous Sensing and Speech

Natural conversation requires a **full-duplex runtime**. In a full-duplex architecture, the incoming and outgoing audio channels are continuously coupled within a single real-time model layer.

```
Orbitali Full-Duplex Architecture (Continuous Sub-Millisecond Feedback)

Caller Audio:  ═══════════[ Inbound Audio Stream ]═══════════> ┌───────────────────────────┐
                                                               │  Orbitali Real-Time       │
                                                               │  Speech-to-Speech Engine  │
Bot Audio:     <══════════[ Outbound Audio Stream ]══════════ └───────────────────────────┘
                                ▲
                    [Instant Buffer Truncation]
```

At Orbitali, we collapsed the multi-stage pipeline into a single, unified speech-to-speech runtime. Because the model processes inbound raw audio frames while simultaneously producing outbound audio frames:

- **Zero Hand-off Overhead:** There are no inter-service HTTP hops between separate STT, LLM, and TTS vendors.
- **Immediate Truncation:** When the model detects an intentional interruption in the caller's audio stream, it immediately halts generation. Orbitali's Go agent runtime truncates the carrier's media queue within milliseconds.
- **Context Retention:** The model does not throw away what was said before the cutoff; it retains the exact point where the agent was interrupted, enabling it to acknowledge the interjection naturally (*"Sorry about that—what day did you prefer?"*).

---

## The Acoustics of Interruption: Silence Thresholds vs. Backchanneling

Achieving human-like conversational cadence requires balancing two fundamental phenomena: **silence detection** and **backchanneling**.

### 1. The Silence Detection Dilemma

How long should an AI wait after a caller stops speaking before taking its turn? This is governed by the end-of-speech silence threshold (often referred to as VAD silence timeout):

* **Too Short (< 300ms):** The bot aggressively interrupts the caller. If a user pauses to think (*"I need an appointment on... [250ms pause] ...Thursday morning"*), a twitchy VAD cuts in prematurely, asking how it can help before the caller has finished their sentence.
* **Too Long (> 800ms):** The conversation feels sluggish and unresponsive. After every answer, the caller sits through an awkward second of dead air, wondering if the call dropped.

In high-performance voice systems, the sweet spot for conversational silence is **400ms to 600ms**. However, pure silence duration is only half the equation. Advanced real-time models don't just measure decibels—they evaluate linguistic and acoustic pitch contours (intonation). A falling pitch at the end of a clause signals completion, allowing the agent to answer faster, while a flat or rising pitch indicates that the caller is holding the floor.

### 2. The Backchanneling Problem

One of the greatest challenges in conversational voice AI is distinguishing between an **interruption** and a **backchannel**.

During a call, listeners frequently utter backchannel vocalizations:
> *"Right."*  
> *"Mhm."*  
> *"Yeah."*  
> *"Okay."*  

These vocalizations are not attempts to take the floor; they are social confirmations that the caller is following along. 

If your voice agent relies on naive energy-based VAD, every *"mhm"* causes the bot to immediately stop talking, apologize, and ask what the caller said. This makes fluid explanations impossible.

Full-duplex real-time models evaluate conversational intent directly from audio features. When a caller utters a low-energy, brief acknowledgment, the model continues its explanation uninterrupted. Only when the caller's volume, lexical intent, or sustained phonemes indicate an active barge-in (*"Wait, stop,"* or *"Actually, hold on"*) does the agent yield the floor.

---

## Prompt Engineering for Turn-Taking

While the underlying audio engine handles the physics of voice, your prompt design dictates the conversational mechanics. Even the lowest-latency model will feel clumsy if your system instructions encourage long-winded monologues.

To make your voice agent easy to interrupt and natural to converse with, apply these three prompt engineering principles:

### 1. Enforce the 1-to-2 Sentence Rule

Monolithic paragraphs are the enemy of voice AI. In text chat, users scan paragraphs visually. On the phone, every spoken sentence locks the caller into active listening.

Constrain your agent to brief, punchy statements that naturally return control to the caller:

```json
{
  "instructions": "You are the receptionist for Apex Dental. Speak conversationally and concisely. CRITICAL: Limit every response to 1-2 short sentences. Never provide bulleted lists or multi-step instructions in a single turn. State one clear piece of information, then ask a simple follow-up question to pass the turn back to the caller."
}
```

### 2. Provide "Acoustic Handles" Upfront

Place the most critical information at the beginning of the sentence. If the caller interrupts halfway through your answer, they should already have received the core answer.

* **❌ Late-Loaded (Difficult to interrupt cleanly):** *"If you want to reschedule your cleaning appointment from Tuesday morning to Thursday afternoon, that won't be a problem."* (If interrupted early, the caller has no idea if the change is possible).
* **Front-Loaded (Acoustic handle first):** *"Yes, we can do that! Thursday afternoon has an opening at 3:00 PM. Does that time work for you?"*

### 3. Ask Clear Handoff Questions

When the agent finishes its response, end with a crisp question that explicitly signals to the caller that it is their turn to speak. Avoid trailing thoughts or open-ended ambiguity:

```markdown
- **Unclear Handoff:** "We have openings on Thursday at 2:00 PM, 3:30 PM, and 5:00 PM, depending on what your schedule looks like this week."
- **Clean Turn Handoff:** "We have an opening on Thursday at 2:00 PM. Would that suit your schedule?"
```

---

## Dynamic Turn-Taking with Orbitali Webhook Agents

When you build transactional voice applications on Orbitali, you keep your business logic and customer records on your own backend while Orbitali manages the real-time audio runtime.

Using Orbitali's `agent:assistant-request` webhook, your backend can dynamically inject context-aware turn-taking guidelines based on who is calling:

```json
{
  "event": "agent:assistant-request",
  "callId": "call_984f8a32-1209-4e78-bc44-59e872d61901",
  "caller": "+15558923011",
  "agentId": "agent_receptionist_01"
}
```

Your server can reply with customized instructions tailored to the caller's profile:

```json
{
  "instructions": "You are speaking with Dr. Martinez, a returning VIP patient. She prefers fast, direct interactions. Confirm appointments immediately without reading introductory policies. Keep all turns under 15 words and yield the floor immediately."
}
```

Because Orbitali's Go runtime communicates with the underlying real-time model using persistent bidirectional WebSockets, these instructions are evaluated alongside live audio, delivering conversational latency of **300–500ms** with zero dropped syllables.

---

## The Real-Time Advantage

Handling interruptions gracefully is what separates a frustrating automated phone tree from a voice assistant that customers genuinely enjoy speaking with. 

Rigid, chained pipelines will always struggle with turn-taking because their cascaded architecture cannot reconcile audio buffering with immediate cancellation. By moving to a unified, full-duplex real-time model, you eliminate the latency penalty, handle natural backchanneling, and create conversations that flow with the effortless rhythm of human speech.

*Want to experience true full-duplex voice? [Read our Platform Architecture Guide](https://docs.orbitali.ai/architecture) or [sign up for an Orbitali developer account](https://orbitali.ai/signup) to test real-time barge-in directly in your browser.*
