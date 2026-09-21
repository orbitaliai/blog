# Iniezione dinamica del contesto: Progettare Voice RAG ad ultra-bassa latenza

![Iniezione dinamica del contesto: Progettare Voice RAG ad ultra-bassa latenza](header.png)

Nella ricerca web o nelle chat testuali, un ritardo di 1 secondo per un'interrogazione a un database vettoriale è del tutto normale. L'utente digita una richiesta in ChatGPT o in una barra di ricerca, osserva l'indicatore animato di digitazione o i puntini che rimbalzano per 1.200 millisecondi e legge la risposta senza alcuna frustrazione.

In una telefonata, quello stesso secondo di ritardo è un'eternità.

La ricerca nella linguistica conversazionale evidenzia che il passaggio naturale del turno tra esseri umani avviene in un intervallo microscopico di circa **200 millisecondi**. Quando una pausa imbarazzante supera i 600ms, nella psicologia conversazionale umana scatta un allarme. Raggiunti i 1.000ms di silenzio vuoto, il chiamante presume che la linea sia caduta, si confonde o esclama d'istinto: *"Pronto? Mi sente ancora?"*

Se il tuo receptionist telefonico IA inizia a parlare esattamente in quell'istante, si ottiene un'immediata collisione vocale. Il bot parla sopra l'interlocutore, l'utente ripete la domanda visibilmente irritato e la conversazione deraglia in un vicolo cieco irrecuperabile.

Come si implementa la Retrieval-Augmented Generation (RAG) per i receptionist telefonici quando la ricerca vettoriale, i modelli di embedding e l'elaborazione dell'LLM rischiano di infrangere il budget di latenza di 200ms?

La soluzione è il **Dual-Track Voice RAG**: sostituire le ingenue ricerche vettoriali durante la chiamata con l'iniezione dinamica del contesto prima della chiamata e una cache della conoscenza co-locata e ottimizzata per la voce.

---

## La cascata di latenza del Voice RAG ingenuo

Per capire perché le architetture RAG convenzionali falliscono nelle telefonate, basta osservare la cascata sequenziale di latenza di una tipica pipeline a blocchi separati:

```
Pipeline RAG ingenua durante la chiamata (Latenza totale: 1.150ms - 2.050ms)

Chiamante: "Posso cancellare la mia visita per domani?"
   │
   ├── (1) VAD ed endpointing vocale (200 - 350ms)
   │
   ├── (2) Trascrizione dell'audio in testo (150 - 250ms)
   │
   ├── (3) Chiamata al modello di embedding (50 - 100ms)
   │
   ├── (4) Query a database vettoriale esterno [Pinecone / Milvus] (100 - 250ms)
   │
   ├── (5) Time-to-First-Token (TTFT) dell'LLM con chunk iniettati (450 - 750ms)
   │
   ├── (6) Sintesi TTS del primo segmento audio (150 - 250ms)
   │
   └── (7) Jitter buffer della telefonia (50 - 100ms)
         ▼
Bot:   [ Pronuncia la prima sillaba dopo ~1.500ms di silenzio vuoto ]
```

Quando ogni passaggio della catena di recupero viene eseguito in sequenza tra provider cloud differenti attraverso la rete pubblica, si bruciano da 1.000ms a 2.000ms prima ancora di aver emesso un solo fonema.

Nella Voice AI non ci si può permettere un'interrogazione ad-hoc al database vettoriale a ogni singolo turno conversazionale. È indispensabile separare ciò che può essere noto **prima** dell'inizio della conversazione da ciò che deve essere recuperato **durante** la conversazione.

---

## Canale 1: Iniezione dinamica del contesto pre-chiamata (Latenza 0ms durante la chiamata)

Nella ricezione telefonica, una percentuale considerevole dell'intento del chiamante è ampiamente prevedibile nel momento stesso in cui il telefono squilla.

Quando un paziente telefona a uno studio dentistico, non pone quesiti filosofici astratti: chiama per confermare una visita, chiedere indicazioni stradali o riprogrammare un appuntamento imminente. Poiché la rete telefonica fornisce i metadati del chiamante in anticipo (`fromNumber` / Caller ID), è possibile determinare il contesto del cliente **prima che il flusso audio della chiamata abbia inizio**.

```
Architettura di iniezione dinamica del contesto di Orbitali

Gateway Telefonico (Twilio/Telnyx)
      │
      ├── (1) SIP INVITE Inbound [fromNumber: +15551234567]
      │
      ▼
Runtime Orbitali ──(2) agent:assistant-request (Webhook)──> Backend Cliente
      │                                                           │
      │                                                   (3) Ricerca DB / CRM
      │                                                       (25ms in Postgres)
      │                                                           │
      │<─(4) Prompt di sessione iniettato + Saluto dinamico───────┘
      │
      ├── (5) Erogazione informativa obbligatoria sull'identità IA
      ▼
Modello Real-Time (Già precaricato con profilo cliente e dati appuntamento)
      │
      └── Gestione dei turni a latenza zero (0ms di overhead durante la chiamata)
```

In Orbitali, questo meccanismo viene implementato attraverso l'evento di ciclo di vita `agent:assistant-request` sugli agenti webhook.

### Come funziona sotto il cofano

1. **Handshake dell'operatore:** Una chiamata in arrivo raggiunge il tuo numero telefonico dedicato. Orbitali riceve il webhook dell'operatore contenente il numero del chiamante (`fromNumber`), il numero composto (`toNumber`) e l'ID della chiamata.
2. **Recupero dinamico del contesto:** Orbitali inoltra immediatamente una richiesta HTTPS `POST` con firma crittografica HMAC-SHA256 al tuo Server URL.
3. **Pre-fetch da database:** Il tuo backend interroga il database interno o il CRM usando il numero telefonico in formato E.164. In 20–50ms, il tuo server identifica il cliente, recupera gli appuntamenti attivi, eventuali pagamenti in sospeso o la cronologia recente dei ticket.
4. **Iniezione di prompt e saluto:** Il tuo server restituisce un prompt di sistema dinamico e un saluto di benvenuto personalizzato su misura.
5. **Avvio della sessione:** Mentre Orbitali pronuncia l'informativa obbligatoria localizzata sull'identità dell'agente IA (prevista dalle normative sulle comunicazioni vocali), il modello real-time si inizializza con questo contesto dinamico già presente nella propria finestra di attenzione attiva.

Quando il chiamante esordisce con *"Buongiorno, vorrei verificare la mia prenotazione"*, l'agente non ha alcun bisogno di interrogare database vettoriali, calcolare embedding o eseguire chiamate esterne. Il modello sa già chi sta chiamando e quale appuntamento ha in programma.

Latenza di recupero durante la chiamata: **0 millisecondi**.

---

## Gestione di `agent:assistant-request` in produzione

Di seguito è riportata un'implementazione Node.js/TypeScript pronta per la produzione, che illustra come gestire l'iniezione dinamica del contesto con verifica crittografica HMAC-SHA256:

```typescript
import express, { Request, Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";

const app = express();
// Cattura il corpo grezzo della richiesta per la verifica precisa della firma
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));

const ORBITALI_SERVER_SECRET = process.env.ORBITALI_SERVER_SECRET!;

// Verifica crittografica dell'origine della richiesta da Orbitali
function verifyOrbitaliSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  
  const supplied = signatureHeader.slice(7);
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false;

  const expected = createHmac("sha256", ORBITALI_SERVER_SECRET)
    .update(rawBody)
    .digest("hex");

  return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"));
}

// Simulazione di database CRM clienti
const crmDatabase = {
  findCustomerByPhone: async (phone: string) => {
    if (phone === "+15550199283") {
      return {
        id: "cust_481",
        name: "Elena Rostova",
        nextAppointment: {
          date: "Domani alle 14:30",
          doctor: "Dr. Aris Thorne",
          service: "Igiene Dentale di Routine"
        }
      };
    }
    return null;
  }
};

app.post("/webhook/orbitali", async (req: Request, res: Response) => {
  const signature = req.headers["x-orbitali-signature"] as string;
  const rawBody = (req as any).rawBody as Buffer;

  if (!verifyOrbitaliSignature(rawBody, signature)) {
    return res.status(401).json({ error: "Firma non valida" });
  }

  const { message } = req.body;

  // Gestione dell'iniezione dinamica del contesto pre-chiamata
  if (message?.type === "agent:assistant-request") {
    const callerPhone = message.call?.fromNumber;
    const customer = callerPhone ? await crmDatabase.findCustomerByPhone(callerPhone) : null;

    if (customer && customer.nextAppointment) {
      // Inietta il contesto del cliente direttamente nel prompt e nel saluto
      return res.json({
        prompt: `Sei il receptionist IA di Apex Dental. Stai parlando con ${customer.name}.
Contesto del chiamante:
- Prossimo appuntamento: ${customer.nextAppointment.date} con ${customer.nextAppointment.doctor} (${customer.nextAppointment.service}).
Istruzioni:
- Saluta Elena calorosamente per nome e chiedi conferma se chiama in merito al suo appuntamento imminente.
- Fornisci risposte concise, fattuali e rigorosamente sotto le due frasi per turno.`,
        greeting: `Buongiorno Elena, grazie per aver chiamato Apex Dental. Chiama per il suo appuntamento di domani alle 14:30 con il Dr. Thorne?`
      });
    }

    // Prompt predefinito per nuovi clienti o chiamanti sconosciuti
    return res.json({
      prompt: `Sei il receptionist IA di Apex Dental. 
Istruzioni:
- Saluta il chiamante con cortesia, chiedi il suo nome e come puoi essergli utile.
- Limita ogni risposta a un massimo di due frasi.`,
      greeting: `Grazie per aver chiamato Apex Dental. Come posso aiutarla oggi?`
    });
  }

  return res.status(400).json({ error: "Tipo di evento non gestito" });
});

app.listen(3000, () => console.log("Server Webhook Orbitali in ascolto sulla porta 3000"));
```

---

## Canale 2: Recupero di conoscenza co-locata sotto il cofano

Il pre-fetching risolve lo stato specifico del singolo utente, ma come gestire la conoscenza generale e non strutturata del dominio aziendale?

Il receptionist di uno studio dentistico deve poter rispondere a domande su convenzioni assicurative complesse, listini prezzi per sbiancamento dentale, indicazioni post-operatorie o convenzioni per il parcheggio. Non è possibile iniettare un manuale operativo di 60 pagine nel prompt di ogni singola chiamata: ciò saturerebbe la finestra di contesto e rallenterebbe il calcolo dell'attenzione del modello.

In questo caso il RAG durante la chiamata è indispensabile. Tuttavia, per mantenere la latenza al di sotto della soglia critica, Orbitali elimina del tutto i tempi di trasferimento della rete pubblica esterna.

### Come Orbitali gestisce le knowledge base in cache

Orbitali offre l'ingestione nativa delle basi di conoscenza tramite dashboard, API REST pubblica (`/public/v1/agents/{agent_id}/knowledge`) e il server `@orbitali/mcp`.

```
Motore di Conoscenza Nativo di Orbitali

[ Documenti Markdown / PDF / Testo ] (Fino a 1 MB)
               │
               ▼
    [ Estrazione e Normalizzazione del Testo ]
               │
               ▼
    [ Motore di Chunking Semantico ]
      (~600 token per chunk con sovrapposizione di 100 token)
               │
               ▼
    [ Pipeline di Embedding Vertex AI ]
      (Embedding vettoriali densi a 768 dimensioni)
               │
               ▼
    [ Cluster PostgreSQL + pgvector ]
      (Indicizzazione HNSW e archiviazione vettoriale per agente)
               │
               │ (Chiamata Telefonica dal Vivo)
               ▼
┌─────────────────────────────────────────────────────────────┐
│ Runtime Vocale Orbitali (Go)                                │
│                                                             │
│ Modello Real-Time ──[ Tool nativo search_knowledge ]──>     │
│ pgvector                                                    │
│ (Zero passaggi HTTP esterni; recupero co-locato sub-50ms)   │
└─────────────────────────────────────────────────────────────┘
```

1. **Ingestione e chunking semantico:** Quando carichi documenti Markdown (`.md`), testo semplice (`.txt`) o PDF (`.pdf`), Orbitali normalizza il testo e lo suddivide in chunk semantici sovrapposti di circa **600 token con 100 token di overlap**.
2. **Embedding ad alta dimensionalità:** I chunk vengono vettorializzati in embedding a 768 dimensioni tramite Vertex AI e indicizzati in un database PostgreSQL gestito con estensione `pgvector`.
3. **Strumenti runtime co-locati:** Quando un agente è associato a documenti di conoscenza, Orbitali predispone automaticamente il tool nativo `search_knowledge` all'interno della sessione del modello in tempo reale.
4. **Ricerca per similarità cosenica sub-millisecondo:** Poiché il runtime di orchestrazione vocale e l'indice vettoriale risiedono nella medesima infrastruttura regionale privata, la ricerca per similarità semantica viene eseguita senza transitare sulla rete internet pubblica. Il modello recupera frammenti di testo precisi in poche decine di millisecondi.

---

## Strutturare i documenti per la massima velocità e precisione vocale

La maggior parte dei documenti aziendali è redatta per la lettura visiva umana, non per corde vocali sintetiche. Caricare un PDF aziendale multicolonna non elaborato o una complessa tabella di tariffe direttamente in un database vettoriale crea forti attriti conversazionali.

Ecco quattro regole d'oro per strutturare le knowledge base ottimizzate per il Voice RAG ad ultra-bassa latenza:

### 1. Chunk atomici con risposta in primo piano (Answer-First)

I modelli linguistici restituiscono l'audio parlato in streaming token per token. Se un frammento estratto nasconde la risposta dietro tre paragrafi di premesse storiche, il modello impiegherà secondi preziosi a pronunciare convenevoli prima di rispondere alla domanda del cliente.

Organizza i tuoi documenti markdown secondo il principio **Answer-First**:

```markdown
<!-- INADEGUATO: Documento scritto per brochure o sito web -->
# Politiche di Cancellazione
Apex Dental è stata fondata sul principio della centralità del paziente. Poiché i nostri
specialisti riservano sale chirurgiche e cliniche attrezzate appositamente per la procedura
prenotata, le cancellazioni tardive impattano notevolmente sull'organizzazione del personale.
Qualora un paziente debba annullare la seduta, richiediamo preavviso... [150 parole dopo] ...verrà
applicata una penale di 50 € in caso di preavviso inferiore alle 24 ore.

<!-- OTTIMALE: Chunk di conoscenza ottimizzato per la voce -->
# Politica di Cancellazione e Tariffe
- Cancellazioni con oltre 24 ore di preavviso: Completamente gratuite.
- Cancellazioni con meno di 24 ore di preavviso: Addebito di una penale per cancellazione tardiva di 50 €.
- Eccezioni di emergenza: La penale viene annullata in caso di emergenza medica o gravi eventi meteorologici documentati.
```

Quando il modello recupera il chunk ottimizzato per la voce, il primissimo token generato risponde direttamente alla domanda del cliente senza preamboli inutili.

### 2. Intestazioni conversazionali come ancore semantiche

I modelli di embedding calcolano la similarità semantica confrontando la frase pronunciata dal chiamante con i chunk indicizzati. Gli utenti formulano domande spontanee, non impiegano terminologia giuridica o burocratica.

Usa intestazioni markdown che rispecchino il linguaggio parlato:

- **Evita:** `### Sez. 4.1.2 - Tariffario per Trattamento Profilattico`
- **Usa:** `### Quanto costa una seduta di pulizia dei denti standard?`

Gli algoritmi di embedding associano domande colloquiali come *"Quanto costa una pulizia dei denti?"* con molta maggiore accuratezza ad ancore che rispecchiano il linguaggio naturale parlato, evitando mancate corrispondenze nella ricerca vettoriale.

### 3. Sostituisci le tabelle con elenchi puntati dichiarativi

Le tabelle in Markdown sono problematiche per la sintesi vocale. I modelli vocali real-time faticano a interpretare al volo incroci di righe e colonne, rischiando di verbalizzare sgradevolmente separatori e coordinate di cella.

Converti matrici e tabelle in elenchi dichiarativi chiave-valore:

```markdown
<!-- SCADENTE PER LA VOCE: Tabella Markdown -->
| Prestazione | Prezzo Standard | Ticket Assicurazione | Durata |
| Visita Odontoiatrica | 80 € | 15 € | 30 min |
| Pulizia Profonda | 240 € | 50 € | 60 min |

<!-- OTTIMALE PER LA VOCE: Elenco Chiave-Valore Dichiarativo -->
### Costi e Durata delle Prestazioni Dentistiche
- Visita Odontoiatrica: 80 € prezzo standard, ticket di 15 € con assicurazione convenzionata, durata 30 minuti.
- Pulizia Profonda: 240 € prezzo standard, ticket di 50 € con assicurazione convenzionata, durata 60 minuti.
```

### 4. Separa la conoscenza statica dai tool transazionali

Un frequente anti-pattern consiste nel voler usare il RAG per dati transazionali in tempo reale, come la disponibilità degli slot in agenda o il conteggio delle scorte di magazzino.

I database vettoriali sono concepiti per la **ricerca di riferimenti semantici**, non per la gestione dello stato transazionale.
- **Usa le Knowledge Base (`search_knowledge`):** Per orari di apertura, policy dello studio, listini prezzi, presentazioni del personale medico e istruzioni di preparazione agli esami.
- **Usa i Webhook Tools (`agent:tool-call`):** Per verificare la disponibilità effettiva in agenda (`check_availability`), confermare una prenotazione (`book_slot`) o consultare lo stato di una consegna (`get_tracking`).

Mantenere la conoscenza statica in file memorizzati nella cache e le transazioni dinamiche nei tool webhook assicura indici vettoriali immutabili, rapidi ed efficientemente memorizzabili in cache.

---

## Mascheramento acustico: Gestire le pause inevitabili

Persino con una ricerca vettoriale co-locata e query inferiori a 50ms, ragionamenti complessi a più passaggi o chiamate ad API esterne possono occasionalmente richiedere tra 300ms e 500ms di elaborazione.

Quando una pausa di recupero durante la chiamata è inevitabile, è fondamentale applicare il **Mascheramento Acustico** (frasi riempitive conversazionali) per assecondare la naturale psicologia della conversazione.

Nel dialogo tra esseri umani, di fronte a una richiesta complessa, non si rimane a fissare l'interlocutore in totale silenzio per due secondi: si dice *"Certamente, verifico subito per lei,"* o *"Un attimo solo, controllo immediatamente."*

Istruendo l'agente a emettere brevi cenni conversazionali prima di richiamare tool di recupero onerosi, si resetta l'orologio interno di attesa del chiamante:

```text
"Quando devi consultare informazioni dettagliate sulle coperture assicurative o sulle policy cliniche tramite search_knowledge,
pronuncia prima una breve conferma vocale come 'Controllo subito questa procedura per lei,'
prima di invocare il tool. In questo modo mantieni viva l'attenzione del cliente."
```

Il marcatore conversazionale viene riprodotto istantaneamente (entro 150ms), confermando la ricezione del messaggio e mascherando l'esecuzione della ricerca vettoriale in background.

---

## Caricare documenti di conoscenza tramite le API di Orbitali

È possibile sincronizzare a livello programmatico i documenti aziendali a un agente durante la fase di deployment impiegando le API REST pubbliche di Orbitali:

```bash
# Carica un documento markdown ottimizzato per la voce su un agente
curl -X POST "https://api.orbitali.ai/public/v1/agents/agent_01j9x7k2/knowledge" \
  -H "Authorization: Bearer $ORBITALI_API_KEY" \
  -F "file=@clinic_policies.md;type=text/markdown"
```

Oppure utilizzando il server `@orbitali/mcp` direttamente dal tuo assistente di codice:

```json
{
  "name": "upload_knowledge_document",
  "arguments": {
    "agentId": "agent_01j9x7k2",
    "filePath": "./docs/voice_knowledge/clinic_policies.md"
  }
}
```

Una volta caricato, Orbitali indicizza automaticamente i chunk del documento in `pgvector` e dota l'agente real-time del tool `search_knowledge`, pronto per interazioni telefoniche ad attrito zero.

---

## Riepilogo: Il modello per Voice RAG sotto i 200ms

Sviluppare una Voice AI che appaia autenticamente umana impone di superare i vecchi schemi di ricerca vettoriale generici mutuati dai chatbot testuali:

1. **Pre-recupera il contesto prevedibile:** Usa il webhook `agent:assistant-request` di Orbitali per identificare i chiamanti dal numero telefonico e iniettare identità, appuntamenti e stato nel prompt iniziale. Latenza durante la chiamata = **0ms**.
2. **Co-loca la conoscenza semantica:** Conserva i documenti di riferimento del dominio all'interno del motore di conoscenza in cache di Orbitali (`.md`/`.pdf`), consentendo al runtime di eseguire ricerche per similarità vettoriale nello stesso cluster privato.
3. **Scrivi per l'ascolto:** Organizza i documenti con risposte in primo piano (answer-first), intestazioni dal tono colloquiale ed elenchi puntati dichiarativi invece di tabelle complesse.
4. **Isola lo stato dinamico:** Riserva i webhook personalizzati per interrogazioni transazionali e operazioni di scrittura, mantenendo gli indici di conoscenza stabili e veloci.
5. **Usa il mascheramento acustico:** Riduci l'effetto delle inevitabili pause dei tool con intercalari conversazionali naturali, affinché il chiamante non si trovi mai immerso in silenzi imbarazzanti.

Combinando l'iniezione dinamica del contesto pre-chiamata con la memorizzazione co-locata della conoscenza, puoi offrire agenti vocali capaci di rispondere a quesiti specialistici all'istante — senza mai lasciare i tuoi interlocutori nell'imbarazzo del silenzio.
