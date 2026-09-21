# Presentazione di Orbitali: Perché abbiamo sostituito la pipeline di Voice AI con un singolo modello in tempo reale

![Presentazione di Orbitali: Perché abbiamo sostituito la pipeline di Voice AI con un singolo modello in tempo reale](header.png)

La maggior parte dei receptionist vocali basati su IA ti lascia con un "pronto? ... pronto?"

Conosci la sensazione. Chiami un'azienda, risponde una voce automatizzata ed esponi la tua richiesta. Poi... *il nulla*. Un silenzio imbarazzante di 1,5 secondi cala sulla linea. Ti chiedi se sia caduta la linea. Apri la bocca per dire di nuovo "pronto?", proprio mentre l'IA inizia finalmente a parlare, provocando una sgradevole collisione conversazionale robotica.

Questo ritardo di 1,5 secondi non è solo fastidioso: è letale per le conversioni. Nelle conversazioni tra esseri umani, la finestra naturale di risposta è strettissima: tra 200ms e 400ms. Quando un agente impiega più di 600ms per rispondere, il cervello umano avverte una sfasatura stridente. Superati i 900ms, la conversazione si interrompe del tutto.

Oggi lanciamo **Orbitali in beta pubblica per sviluppatori** per risolvere questo problema una volta per tutte.

Orbitali è un livello di infrastruttura per agenti vocali IA in tempo reale che consente agli sviluppatori di creare, distribuire, operare e monitorare agenti vocali capaci di raggiungere tempi di risposta naturali di **300–500ms**. Abbiamo ottenuto questo risultato non ottimizzando vecchio codice, ma abbandonando del tutto la tradizionale architettura multi-vendor che domina il settore.

Ecco uno sguardo trasparente dietro le quinte sul perché la pipeline tradizionale di Voice AI è strutturalmente inadatta per applicazioni in tempo reale, su come abbiamo costruito un runtime layer superiore e sui compromessi ingegneristici intenzionali che abbiamo scelto per consentire vere conversazioni su larga scala.

---

## L'architettura imperfetta della pipeline tradizionale di Voice AI

Per comprendere perché il tuo attuale bot vocale sembra un lento centralino telefonico, devi osservare l'infrastruttura sottostante. Quasi tutte le principali piattaforme di orchestrazione vocale oggi sul mercato fungono da "gestori di pipeline". Concatenano tre sistemi completamente separati di tre fornitori diversi per compiere un singolo turno conversazionale:

$$\text{Speech-to-Text (STT)} \longrightarrow \text{Large Language Model (LLM)} \longrightarrow \text{Text-to-Speech (TTS)}$$

Ogni volta che un utente parla al telefono o nel browser, l'architettura tradizionale esegue i seguenti passaggi di rete:

1. **La fase di trascrizione (STT):** Il flusso audio in entrata viene catturato, pacchettizzato e inviato a un'API di speech-to-text di terze parti (come Deepgram o AssemblyAI). Il modello deve attendere che venga pronunciata una frase sufficientemente lunga o un'intera proposizione per produrre una stringa testuale pulita.
2. **La fase di ragionamento (LLM):** La trascrizione testuale viene inviata via rete al provider del modello linguistico (come OpenAI o Anthropic). Il modello elabora il testo, calcola la risposta e inizia a restituire i token testuali in streaming.
3. **La fase di sintesi (TTS):** I token testuali generati vengono inoltrati a un motore di sintesi vocale (come ElevenLabs o Cartesia) per essere riconvertiti in forme d'onda audio.
4. **La fase di consegna:** Il flusso audio compilato viene infine impacchettato e reindirizzato al gateway telefonico dell'operatore per raggiungere l'orecchio dell'utente.

### La tassa di latenza: Perché le pipeline falliscono
Anche ottimizzando ogni singolo segmento di questa pipeline, ti scontri con le leggi fondamentali delle reti e del calcolo. Ogni passaggio tra provider API distinti introduce **latenza di rete tra servizi**.

Inoltre, si accumula una penalità di elaborazione progressiva. Se il tuo STT impiega 200ms, il tuo LLM ne richiede 400ms per generare il contesto centrale della risposta e il tuo TTS impiega altri 300ms per sintetizzare la sfumatura emotiva dell'audio, la tua latenza di base è già a 900ms. Aggiungi il routing dei pacchetti di rete tra data center cloud eterogenei e atterri dritto nell'angosciante territorio del "silenzio robotico" di 1,5 secondi.

Nessuna astuzia ingegneristica può aggirare questa realtà strutturale. Quando progetti un'architettura basata su tre intermediari sovrapposti e tre relazioni API distinte, stai ottimizzando per la varietà dei componenti a spese dirette dell'esperienza dell'utente finale.

---

## Ripensare l'infrastruttura: Speech-to-Speech a singolo passaggio

In Orbitali abbiamo costruito il nostro runtime seguendo un unico principio cardine: **la latenza è la funzionalità**. Se un receptionist vocale IA non risponde abbastanza velocemente da sembrare umano, nient'altro di ciò che fa ha valore.

Per centrare il nostro obiettivo di risposta di 300–500ms, abbiamo abbattuto l'intera pipeline multi-vendor. Orbitali opera su un'architettura unificata basata su un singolo modello **speech-to-speech** in tempo reale.

```
[Flusso Audio Utente] ──(Connessione di Rete Diretta)──> [Servizio di Orchestrazione Orbitali]
                                                                │
                                                   (Singolo Passaggio Modello Nativo)
                                                                │
                                                                ▼
[Flusso Operatore] <───(Risposta 300-500ms)───────────── [Modello Speech-to-Speech Real-Time]
```

Sotto il cofano, utilizziamo un modello speech-to-speech unificato all'avanguardia in tempo reale.

Invece di trattare la trascrizione audio, il ragionamento testuale e la sintesi vocale come task sequenziali, il nostro modello vocale gestisce tutte e tre le funzioni nativamente all'interno di un unico layer in un solo passaggio. Non c'è alcun passaggio intermedio di traduzione da audio a testo che disperde tono e cadenza, né fasi di sintesi text-to-speech che accumulano latenza. I byte audio grezzi fluiscono direttamente nel modello e i byte audio in streaming ne escono all'istante, iniziando prima ancora che il calcolo dell'intera risposta sia completato.

Eseguendo la nostra infrastruttura di orchestrazione stateless in regioni geograficamente ottimizzate e prossime alle principali reti telefoniche, riduciamo i salti di rete al millisecondo. Eliminiamo completamente il caos di rete tra servizi. Orbitali funge unicamente da orchestratore in tempo reale ad altissime prestazioni, fornendo contesto al modello vocale ed eseguendo la logica di business degli sviluppatori in modo trasparente.

---

## Il compromesso intenzionale: Prestazioni prima della personalizzazione

Sappiamo cosa chiederanno alcuni sviluppatori enterprise: *"Posso sostituire il modello sottostante con il mio LLM open source con fine-tuning? Posso integrare un provider vocale personalizzato a mia scelta?"*

La nostra risposta è schietta: **No.** E si tratta di un vincolo esplicito e intenzionale, non di una svista.

Abbiamo deliberatamente sacrificato la sostituibilità modulare dei fornitori a favore di un agente che restituisca la sensazione tangibile di un essere umano dall'altro capo della linea. Le piattaforme che offrono personalizzazione totale costringono a gestire una complessità di integrazione enorme e ad accettare il degrado prestazionale della pipeline multi-provider.

Standardizzando su un'architettura di modello singola e ad altissime prestazioni, offriamo notevoli vantaggi ai team di sviluppo:

* **Semplicità operativa:** Non devi gestire tre chiavi API distinte, monitorare l'uptime di molteplici provider o temere che l'aggiornamento di un'API di sintesi vocale rompa la formattazione dei prompt. Una sola piattaforma gestisce tutto.
* **Streaming bidirezionale reale e Barge-In:** Poiché il modello vocale è nativamente consapevole dei parametri audio in ingresso, gestisce le interruzioni naturali dell'utente all'istante. Se l'agente IA sta parlando e l'interlocutore interviene con *"Aspetta, vorrei cambiare orario,"* Orbitali rileva immediatamente il flusso audio in arrivo, interrompe la generazione vocale in uscita e si ricalibra sulle parole del cliente, replicando alla perfezione il comportamento di una telefonata reale.
* **Prezzi trasparenti a zero ricarichi:** Non dovendo applicare ricarichi su tre servizi terzi, offriamo una tariffa runtime fissa e trasparente di **€0,10/minuto** (conteggiata in scatti precisi di 10 secondi) su tutti i nostri piani, dedotta dalla soglia mensile inclusa.

---

## Netta separazione delle responsabilità: Tu possiedi la logica, noi eseguiamo l'agente

Sebbene limitiamo la configurazione del modello per garantire una latenza minima, garantiamo assoluta flessibilità sui dati applicativi. Orbitali mantiene una rigorosa separazione delle responsabilità: i dati dei clienti, le regole personalizzate e le informazioni di backend rimangono interamente all'interno della tua infrastruttura.

```
┌─────────────────────────────────┐                 ┌───────────────────────────┐
│        RUNTIME ORBITALI         │                 │     BACKEND SVILUPPATORE  │
│  - Streaming vocale a bassa     │  agent:tool-call│  - CRM / API Clienti      │
│    latenza                      │ ───────────────>│  - Prenotazioni /         │
│  - Modello Speech-to-Speech     │                 │    Disponibilità          │
│  - Motore RAG vettoriale nativo │ <───────────────│  - Logica proprietaria    │
│                                 │  Risposta JSON  │                           │
└─────────────────────────────────┘                 └───────────────────────────┘
```

Quando crei un agente su Orbitali, puoi sfruttare primitive avanzate per sviluppatori tramite webhook:

### 1. Prompt dinamici (Prima della chiamata)
Le istruzioni statiche possono limitare l'utilità di un'IA. Con Orbitali puoi configurare il tuo agente con un webhook `Server URL`. Nel millisecondo esatto in cui una chiamata in arrivo raggiunge la linea telefonica, Orbitali invia una richiesta `agent:assistant-request` al tuo server con i metadati del chiamante. Il tuo backend può verificare immediatamente il numero nel CRM e restituire un saluto o un set di istruzioni interamente personalizzato:

> *"Ciao Alex, bentornato nel livello Platinum del tuo account. Vedo che il tuo volo ha subito un ritardo..."*

### 2. Live API Tools (A metà conversazione)
Gli agenti vocali devono eseguire azioni concrete, non limitarsi a conversare. Orbitali supporta Custom Developer Tools definiti tramite semplici parametri JSON Schema. Quando la conversazione richiede un'azione — come la prenotazione di una visita o il controllo dello stato di un ordine — Orbitali mette in pausa la sintesi audio e invia un evento webhook `agent:tool-call` al tuo server. Il tuo backend esegue la logica di business, risponde con un payload JSON standard e l'agente riprende a parlare in modo fluido.

### 3. RAG nativo a zero configurazione
Se disponi di cataloghi prodotto estesi, policy interne complesse o FAQ articolate, non è necessario inserirle forzatamente nel prompt di sistema o sviluppare una lenta API di ricerca esterna. Puoi caricare documenti Markdown o PDF direttamente nella dashboard di Orbitali. La nostra piattaforma si occupa automaticamente di chunking e embedding all'interno di un database vettoriale ad alte prestazioni. Quando l'agente necessita di informazioni, richiama internamente un tool di ricerca per similarità semantica (`search_knowledge`), recuperando risposte estremamente pertinenti a latenza zero.

---

## Progettato per chi costruisce: Bring Your Own Carrier (BYOC)

Orbitali è l'infrastruttura pensata per sviluppatori, product team e agenzie di automazione che desiderano rilasciare bot vocali production-grade per flussi inbound come centralini, instradamento chiamate, triage del supporto clienti o linee di prenotazione.

Poiché ci concentriamo unicamente nel creare il miglior runtime layer in tempo reale, **non siamo un operatore telefonico**. Non vendiamo numeri di telefono e non applichiamo sovrapprezzi del 300% sulle tue spese telefoniche.

Operiamo secondo un rigoroso modello **Bring Your Own Carrier (BYOC)**. Colleghi i tuoi account Twilio o Telnyx a Orbitali tramite OAuth standard o webhook. Mantieni le tue tariffe all'ingrosso, proteggi i requisiti di compliance dei dati e conservi la piena proprietà dei tuoi numeri telefonici. Paghi direttamente il tuo operatore per l'instradamento della linea e paghi Orbitali esclusivamente per i minuti di runtime IA.

*Nota: Orbitali è ottimizzato specificamente per flussi di gestione delle chiamate in entrata (inbound). Non supportiamo robocall outbound di massa, combinatori automatici di telemarketing o campagne di spam. Questa scelta progettuale mantiene la nostra infrastruttura pulita dal traffico spazzatura e ci consente di offrire un servizio di altissimo livello ai team di sviluppo legittimi.*

---

## Unisciti alla beta pubblica per sviluppatori oggi stesso

L'era degli imbarazzanti silenzi dell'IA vocale è finita. Abbandonando la frammentata pipeline multi-vendor e sviluppando una piattaforma imperniata su un unico modello speech-to-speech in tempo reale, abbiamo abilitato tempi di risposta paragonabili a quelli umani nelle applicazioni vocali.

La nostra beta pubblica per sviluppatori è ufficialmente attiva. Ogni nuovo account riceve **5 minuti di prova gratuiti** (validi per 7 giorni, nessuna carta di credito richiesta) per sperimentare in prima persona i miglioramenti di latenza. Da lì, puoi scalare agevolmente verso la produzione tramite i nostri piani di abbonamento flessibili:

| Piano | Prezzo Base / mese | Minuti Inclusi | Tariffa Overage | Ideale Per |
| :--- | :--- | :--- | :--- | :--- |
| **Launch** | €49 | 300 | €0,10 / min | Validazione di MVP iniziali dei clienti |
| **Studio** | €199 | 1.500 | €0,10 / min | Scalabilità in produzione e reportistica avanzata |
| **Agency** | €499 | 5.000 | €0,10 / min | Agenti attivi illimitati e linee concorrenti |

Pronto a costruire un agente vocale che suoni davvero come un essere umano?

* **Inizia subito:** Registrati e accedi alla dashboard su [app.orbitali.ai](https://app.orbitali.ai).
* **Esamina l'architettura:** Approfondisci webhook, prompt dinamici e schemi dei tool nella nostra documentazione per sviluppatori.
* **Parla con i fondatori:** Hai requisiti di scalabilità su misura o progetti per la tua agenzia? Prenota una sessione tecnica direttamente tramite il calendario nella dashboard.
