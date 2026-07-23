# You Own the Logic, Orbitali Runs the Agent: How to Build Secure Webhook Agents

![You Own the Logic, Orbitali Runs the Agent: How to Build Secure Webhook Agents](header.png)

When integrating voice AI into enterprise software, developers face a critical architectural decision: **Where does the customer data live?**

In first-generation voice platforms, the standard approach is to sync everything. If you want your voice agent to greet a customer by name, know their recent orders, or access their booking history, you have to export that data into the voice platform’s proprietary database. You must configure their custom contact fields, set up periodic data syncs, and replicate your business rules inside their dashboard. 

For SaaS teams embedding voice (ICP 2) and Systems Integrators (ICP 3) building for legacy enterprises, this pattern is a non-starter. It creates massive data synchronization overhead, increases security surface area, and introduces compliance headaches (HIPAA, GDPR, SOC 2) by duplicating Personally Identifiable Information (PII) across third-party environments.

At **Orbitali**, we believe in a clean separation of concerns: **You own the logic and customer records; Orbitali runs the stateless agent runtime.** 

By leveraging Webhook-driven voice agents, you can build conversational systems that are highly personalized and secure, keeping all sensitive records and business logic firmly within your own backend database. Let’s look at how to implement this architecture using Orbitali's lifecycle hooks and signed webhook events.

---

## The Dynamic Greeting: `agent:assistant-request`

Instead of hardcoding system instructions or syncing customer profiles to Orbitali, you can programmatically construct prompts in real-time as a call connects. 

When a call is initiated, Orbitali triggers the `agent:assistant-request` lifecycle hook. This webhook asks your backend for the specific instructions, dynamic variables, and custom greeting that should govern the call.

For example, when a user dials your phone number, Orbitali sends the caller's phone number to your API. Your system looks up the record, identifies who is calling, checks for upcoming events (like a clinic appointment tomorrow), and injects that context directly into the agent’s memory space.

Here is how you handle this in a Node.js/Express backend:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

// Mock database lookup
const db = {
  getCustomerByPhone: (phone) => {
    if (phone === '+15550199') {
      return { id: 'cust_982', name: 'Pedro' };
    }
    return null;
  },
  getUpcomingAppointment: (customerId) => {
    if (customerId === 'cust_982') {
      return { date: '2026-07-24T10:00:00Z', type: 'Clinical checkup' };
    }
    return null;
  }
};

app.post('/webhook/agent-assistant-request', (req, res) => {
  const { caller_id } = req.body;
  
  // 1. Fetch user from your database
  const customer = db.getCustomerByPhone(caller_id);
  
  if (customer) {
    // 2. Fetch context (e.g. an appointment tomorrow)
    const appointment = db.getUpcomingAppointment(customer.id);
    
    if (appointment) {
      // 3. Inject dynamic prompt and custom greeting
      return res.json({
        prompt: `You are a professional assistant for Clinic Care. You are speaking with ${customer.name}, who has a ${appointment.type} scheduled for tomorrow. Your objective is to help them confirm, cancel, or reschedule. Keep replies polite and concise.`,
        first_message: `Hi ${customer.name}, are you calling to reschedule your clinic appointment tomorrow?`
      });
    }
  }

  // Fallback default instructions for unrecognized callers
  return res.json({
    prompt: "You are a professional receptionist for Clinic Care. Ask the caller for their name and how you can assist them.",
    first_message: "Thank you for calling Clinic Care. How can I help you today?"
  });
});
```

With this pattern, Orbitali never stores "Pedro" or his "Clinical checkup" records on its servers. The voice runtime receives a temporary prompt context for the duration of the call, executes the audio-to-text-to-audio loop, and forgets it when the hang-up event is sent.

---

## Secure Actions: HMAC Signature Verification

A voice agent isn't just a receptionist; it's a transactional engine. An agent speaking to Pedro needs to be able to *reschedule* that appointment. To do this, the agent uses **Tool Calling** (or function calling).

When the agent decides to invoke a tool, Orbitali sends a POST request to your specified Server URL. However, because this endpoint can modify real database records (e.g., changing appointment dates), you must verify that incoming requests are genuinely coming from Orbitali and not from a malicious actor spoofing requests.

To secure this boundary, Orbitali signs every webhook payload using an HMAC-SHA256 signature, matching a secret key you set in your dashboard. By validating this signature, you guarantee that only authorized voice sessions can mutate your database.

Here is a standard Express middleware implementation to verify HMAC signatures:

```javascript
const crypto = require('crypto');

function verifyOrbitaliWebhook(req, res, next) {
  const signatureHeader = req.headers['x-orbitali-signature'];
  const webhookSecret = process.env.ORBITALI_WEBHOOK_SECRET;

  if (!signatureHeader || !webhookSecret) {
    return res.status(401).json({ error: 'Unauthorized: Missing signature or signing secret' });
  }

  // Compute HMAC SHA256 of the raw body payload
  const hmac = crypto.createHmac('sha256', webhookSecret);
  const rawBody = JSON.stringify(req.body);
  const computedSignature = hmac.update(rawBody).digest('hex');

  // Time-safe comparison to prevent timing attacks
  const signatureBuffer = Buffer.from(signatureHeader, 'hex');
  const computedBuffer = Buffer.from(computedSignature, 'hex');

  if (signatureBuffer.length !== computedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, computedBuffer)) {
    return res.status(403).json({ error: 'Forbidden: Request signature is invalid' });
  }

  next();
}

// Secure tool handler route
app.post('/webhook/tools/reschedule-appointment', verifyOrbitaliWebhook, (req, res) => {
  const { appointment_id, new_date } = req.body;
  
  // Safely update database record
  db.updateAppointment(appointment_id, new_date);
  
  res.json({
    status: 'success',
    message: `Appointment successfully rescheduled to ${new_date}.`
  });
});
```

This ensures absolute data sovereignty:
1. **Dynamic Authentication**: Your webhook endpoints verify Orbitali's cryptographic identity before any write operations.
2. **Zero Permanent Telemetry**: No third-party API has write access to your database; they only request actions through secure webhooks.

---

## Why This Architecture Wins for SaaS Teams and SIs

For teams building robust software, this clean architectural boundary offers three massive advantages:

### Compliance & Security Sovereignty
If you work in healthcare, finance, or legal tech, syncing PII to a voice provider requires signing new Business Associate Agreements (BAAs), auditing their database encryption policies, and handling complex GDPR deletion requests. With Orbitali, because customer profiles never sit in our database, your compliance perimeter remains completely unchanged.

### No Synchronization Overhead
Data synchronization is notoriously brittle. If a customer changes their phone number or schedules an appointment on your web portal, syncing that to a voice dashboard in real-time requires complex event pipelines. By pulling context dynamically via `agent:assistant-request`, your voice agent always gets the single source of truth directly from your SQL/NoSQL store.

### Rapid Local Development
Because the voice agent relies entirely on your local webhooks, you don't need to rebuild or redeploy agent configuration in the cloud when you change business rules. You can use tools like Ngrok or Cloudflare Tunnels to route webhook requests to your local development server, edit your Express endpoints, and immediately test how the agent behaves—dramatically reducing the developer feedback loop.

---

## Summary: Keeping Logic Where It Belongs

Building enterprise voice integrations shouldn't mean compromising on security or data ownership. With Orbitali’s webhook-driven architecture:
* **Orbitali** acts as the high-performance real-time streaming runtime—handling SIP signaling, WebRTC streams, low-latency TTS, and LLM execution.
* **Your Backend** owns the system prompts, PII database, and transactional write permissions.

Ready to build a secure webhook agent? Check out our developer documentation and get started today.
