# L'anatomia di un'interruzione: Come gestire il passaggio di turno nella Voice AI in tempo reale

![L'anatomia di un'interruzione: Come gestire il passaggio di turno nella Voice AI in tempo reale](header.png)

Quando gli sviluppatori si accingono a creare il loro primo assistente di Voice AI, tendono a concentrarsi su due parametri: la precisione dello speech-to-text (STT) e la velocità di elaborazione dell'LLM. Ottimizzano i prompt, misurano la latenza e riducono i tassi di errore sulle parole (WER).

Eppure, quando gli utenti effettuano una vera telefonata con il bot, il sistema restituisce ancora una sensazione sgradevolmente artificiale.

La ragione è elementare: **il problema più complesso nella Voice AI non è l'accuratezza della trascrizione o l'intelligenza del modello, bensì il passaggio di turno conversazionale (turn-taking) umano.**

Nelle normali conversazioni telefoniche, le persone non comunicano tramite ordinati payload JSON né attendono il proprio turno come scacchisti con l'orologio. Ci sovrapponiamo. Ci inseriamo nel discorso. Diciamo *"mhm"*, *"certo"* e *"chiaro"* mentre l'altro sta ancora parlando, semplicemente per confermare che siamo all'ascolto. Quando non siamo d'accordo o intendiamo correggere un dettaglio, interveniamo a metà frase e ci aspettiamo che l'interlocutore si interrompa all'istante.

In che modo un receptionist IA può distinguere tra un'interruzione netta e un tenue segnale di ascolto (backchanneling)? E quando si verifica una vera interruzione, come arresta la riproduzione audio prima che la conversazione sfoci in una caotica sovrapposizione?

Ecco l'anatomia di un'interruzione vocale, i motivi per cui le pipeline tradizionali falliscono nella gestione dei turni e come le architetture full-duplex in tempo reale risolvono la fluidità conversazionale.

---

## La trappola del walkie-talkie: Le rigide pipeline half-duplex

Per comprendere per quale motivo la maggior parte dei bot vocali gestisce le interruzioni in modo inadeguato, basta osservare l'architettura della tradizionale pipeline multi-vendor:

$$\text{Audio In} \longrightarrow \text{Motore STT} \longrightarrow \text{LLM} \longrightarrow \text{Sintetizzatore TTS} \longrightarrow \text{Audio Out}$$

Questa sequenza è strutturalmente **half-duplex**: funziona su un ciclo "prima parla, poi ascolta", esattamente come un walkie-talkie automatico.

```
Pipeline Cascata Tradizionale (Alta Latenza e Buffer in Coda)

Chiamante: ───[ "In realtà, annulla pure—" ]─────────────────────────
                          │
                    (1) Scatto VAD (150ms)
                          │
                    (2) Segnale di cancellazione all'orchestratore
                          │
                    (3) Svuotamento buffer TTS a valle (200-400ms)
                          ▼
Bot:       ───[ Audio sintetizzato ancora in riproduzione... ]───> [Si ferma troppo tardi]
```

Quando un assistente che usa una pipeline a cascata sta parlando, vi sono molteplici livelli di buffering audio attivi contemporaneamente:
1. L'LLM ha trasmesso i token in streaming al provider TTS.
2. Il provider TTS ha sintetizzato segmenti audio e li ha inviati tramite WebSocket al tuo application server.
3. Il tuo server ha accodato quei pacchetti RTP nel gateway telefonico (Twilio, Telnyx o WebRTC).

Quando il chiamante interviene dicendo *"Aspetta, no, intendevo domani"*, il suo microfono cattura il suono. Ma il rilevatore di attività vocale (VAD) della pipeline deve prima verificare che tale suono corrisponda effettivamente a voce umana (tipicamente 100–200ms). Dopodiché trasmette un evento di cancellazione a ritroso lungo tutta la catena per interrompere lo stream dell'LLM, scartare i buffer del TTS e intimare al gestore telefonico di svuotare i propri buffer di jitter.

Nel momento in cui il bot fa finalmente silenzio, **sono già stati riprodotti 300ms–600ms di voce ormai superata all'orecchio del cliente**. Il bot parla sopra l'interlocutore, l'utente ripete la frase indispettito e il ritmo naturale della conversazione crolla irrimediabilmente.

---

## Modelli real-time full-duplex: Ascolto e sintesi simultanei

Una conversazione autentica esige un **runtime full-duplex**. In un'architettura full-duplex, i canali audio in entrata e in uscita sono costantemente correlati all'interno di un unico layer di modello in tempo reale.

```
Architettura Full-Duplex di Orbitali (Feedback Continuo Sub-Millisecondo)

Audio Chiamante:  ═══════════[ Flusso Audio Inbound ]═══════════> ┌───────────────────────────┐
                                                                  │  Motore Speech-to-Speech  │
                                                                  │  Real-Time di Orbitali    │
Audio Bot:        <══════════[ Flusso Audio Outbound ]══════════ └───────────────────────────┘
                                   ▲
                      [Troncamento Immediato Buffer]
```

In Orbitali abbiamo condensato la pipeline multi-stadio in un runtime speech-to-speech unificato. Poiché il modello elabora i frame audio grezzi in ingresso e genera simultaneamente i frame audio in uscita:

- **Zero overhead di passaggio:** Non si verifica alcun salto HTTP tra fornitori distinti di STT, LLM e TTS.
- **Troncamento istantaneo:** Nel momento esatto in cui il modello rileva un'interruzione intenzionale nel flusso audio del chiamante, blocca la generazione. Il runtime dell'agente scritto in Go di Orbitali tronca la coda multimediale dell'operatore in una manciata di millisecondi.
- **Mantenimento del contesto:** Il modello non dimentica ciò che era stato pronunciato prima del taglio; memorizza il punto preciso in cui l'agente è stato interrotto, permettendogli di accogliere l'osservazione con naturalezza (*"Mi scusi, quale giorno preferiva?"*).

---

## L'acustica dell'interruzione: Soglie di silenzio e backchanneling

Raggiungere un ritmo conversazionale naturale impone il bilanciamento di due fenomeni complementari: **il rilevamento del silenzio** e il **backchanneling**.

### 1. Il dilemma del rilevamento del silenzio

Quanto a lungo deve attendere l'IA dopo che l'interlocutore ha smesso di parlare prima di intervenire a sua volta? Questo aspetto è regolato dalla soglia di silenzio di fine discorso (silence timeout del VAD):

* **Troppo breve (< 300ms):** Il bot interrompe il chiamante con troppa aggressività. Se l'utente fa una pausa per riflettere (*"Avrei bisogno di un appuntamento per... [pausa di 250ms] ...giovedì mattina"*), un VAD troppo sensibile interviene prematuramente, chiedendo come può essere utile prima ancora che la frase sia conclusa.
* **Troppo lunga (> 800ms):** La conversazione appare lenta e impacciata. A ogni risposta, il chiamante vive un secondo d'imbarazzante vuoto, domandandosi se sia caduta la linea.

Nei sistemi vocali ad alte prestazioni, la finestra ideale di silenzio conversazionale è compresa tra **400ms e 600ms**. Tuttavia, la pura durata temporale del silenzio è solo una parte dell'equazione. I modelli avanzati in tempo reale non misurano solo l'ampiezza in decibel: analizzano i profili di intonazione linguistica e acustica (pitch contour). Un'intonazione discendente a fine frase denota una conclusione, consentendo all'agente di rispondere con maggiore tempestività, mentre un'intonazione piana o ascendente indica che l'utente sta mantenendo la parola.

### 2. La sfida del backchanneling

Una delle problematiche più ardue nella Voice AI conversazionale risiede nel distinguere tra una **vera interruzione** e un **segnale di ascolto passivo (backchannel)**.

Durante una chiamata, chi ascolta pronuncia frequentemente brevi cenni vocali:
> *"Chiaro."*  
> *"Mhm."*  
> *"Sì."*  
> *"D'accordo."*  

Questi interventi non costituiscono tentativi di prendere la parola: sono conferme sociali che attestano che l'ascoltatore sta seguendo il discorso.

Se il tuo agente vocale si basa su un VAD ingenuo fondato unicamente sull'energia sonora, ogni *"mhm"* indurrà il bot a zittirsi immediatamente, scusarsi e domandare all'utente di ripetere. Ciò rende impossibile qualunque spiegazione articolata.

I modelli full-duplex in tempo reale valutano l'intento conversazionale direttamente dalle caratteristiche spettrali dell'audio. Quando l'interlocutore pronuncia una breve conferma a bassa energia, il modello prosegue l'esposizione senza pause. Solo quando il volume, la portata semantica o la durata dei fonemi segnalano una reale volontà di intervenire (*"Fermi un attimo,"* oppure *"Aspetta, ti spiego"*), l'agente cede tempestivamente la parola.

---

## Prompt Engineering orientato al passaggio di turno

Se il motore audio sottostante gestisce la fisica della voce, il design del prompt determina le dinamiche relazionali della conversazione. Persino il modello con la latenza più contenuta risulterà macchinoso se le istruzioni di sistema favoriscono lunghi monologhi.

Per rendere il tuo agente vocale agevolmente interrompibile e piacevole nel dialogo, adotta questi tre criteri di prompt engineering:

### 1. Imponi la regola delle 1-2 frasi

I lunghi blocchi di testo sono deleteri per la Voice AI. Nelle chat scritte, gli utenti scorrono visivamente i paragrafi. Al telefono, ogni frase pronunciata costringe chi ascolta a un'attenzione vincolata.

Limita il tuo agente a risposte concise ed efficaci che restituiscano naturalmente il controllo all'interlocutore:

```json
{
  "instructions": "Sei il receptionist dello Studio Dentistico Apex. Parla in modo naturale e conciso. CRUCIALE: Limita ogni risposta a un massimo di 1-2 frasi brevi. Non fornire mai elenchi puntati o istruzioni complesse in un unico turno. Esponi un singolo concetto chiaro, poi poni una semplice domanda per restituire la parola all'interlocutore."
}
```

### 2. Fornisci "appigli acustici" fin dall'inizio

Colloca le informazioni fondamentali subito all'inizio della proposizione. Se il chiamante interviene a metà della tua risposta, avrà già ricevuto il fulcro del messaggio.

* **❌ Informazione posticipata (Difficile da interrompere con chiarezza):** *"Nel caso in cui desiderasse spostare il suo appuntamento di igiene dentale da martedì mattina a giovedì pomeriggio, non ci sarebbe alcun problema."* (Se interrotto all'inizio, l'utente ignora se la modifica sia fattibile).
* **Informazione anticipata (Appiglio acustico immediato):** *"Certamente, possiamo farlo! Giovedì pomeriggio abbiamo disponibilità alle 15:00. Le andrebbe bene questo orario?"*

### 3. Poni domande chiare per cedere il turno

Al termine della risposta dell'agente, concludi con una domanda puntuale che comunichi esplicitamente al chiamante che tocca a lui intervenire. Evita finali sospesi o formulazioni generiche:

```markdown
- **Chiusura ambigua:** "Abbiamo disponibilità giovedì alle 14:00, 15:30 e 17:00, a seconda di come è organizzata la sua settimana."
- **Chiusura pulita con passaggio di turno:** "Abbiamo disponibilità giovedì alle 14:00. È un orario compatibile con i suoi impegni?"
```

---

## Gestione dinamica dei turni con gli agenti webhook di Orbitali

Quando sviluppi applicazioni vocali transazionali su Orbitali, mantieni la logica applicativa e i dati dei clienti sul tuo backend, mentre Orbitali governa il runtime audio in tempo reale.

Tramite il webhook `agent:assistant-request` di Orbitali, il tuo backend può iniettare dinamicamente indicazioni contestuali di gestione dei turni calibrate sul profilo di chi sta chiamando:

```json
{
  "event": "agent:assistant-request",
  "callId": "call_984f8a32-1209-4e78-bc44-59e872d61901",
  "caller": "+15558923011",
  "agentId": "agent_receptionist_01"
}
```

Il tuo server può rispondere fornendo istruzioni personalizzate per il chiamante:

```json
{
  "instructions": "Stai parlando con la Dott.ssa Martinez, una paziente VIP abituale. Predilige interazioni veloci e dirette. Conferma subito gli appuntamenti senza leggere le informative iniziali. Mantieni ogni intervento sotto le 15 parole e cedi subito la parola."
}
```

Dato che il runtime Go di Orbitali dialoga con il modello real-time sottostante attraverso connessioni WebSocket bidirezionali persistenti, tali direttive vengono interpretate congiuntamente al flusso audio dal vivo, garantendo una latenza conversazionale di **300–500ms** senza perdita di sillabe.

---

## Il vantaggio del tempo reale

Gestire le interruzioni con puntualità ed eleganza è ciò che fa la differenza tra uno snervante albero telefonico automatico e un assistente vocale con cui i clienti dialogano con autentico piacere.

Le pipeline rigide e concatenate incontreranno sempre serie difficoltà nella gestione dei turni, poiché la loro architettura a cascata non può conciliare il buffering audio con la cancellazione immediata. Passando a un modello unificato full-duplex in tempo reale, abbatti le penalità di latenza, accogli con naturalezza i segnali di ascolto passivo e crei conversazioni che fluiscono con l'armonia della voce umana.

*Vuoi provare l'esperienza di una vera voce full-duplex? [Consulta la nostra Guida all'Architettura della Piattaforma](https://docs.orbitali.ai/architecture) o [crea un account sviluppatore su Orbitali](https://orbitali.ai/signup) per testare l'interruzione real-time direttamente nel tuo browser.*
